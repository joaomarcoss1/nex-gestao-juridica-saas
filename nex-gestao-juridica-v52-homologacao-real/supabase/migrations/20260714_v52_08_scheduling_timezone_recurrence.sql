-- Nex Gestão Jurídica v5.2 · timezone, duração, recorrência e sincronização de agenda
begin;

create or replace function public.nex_v52_save_meeting(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid:=public.nex_current_org_id(); v_data jsonb:=p_operation->'meeting'; v_id uuid:=coalesce(nullif(v_data->>'id','')::uuid,gen_random_uuid());
  v_client uuid:=nullif(v_data->>'clientId','')::uuid; v_process uuid:=nullif(v_data->>'processId','')::uuid; v_resp uuid:=nullif(v_data->>'responsible','')::uuid;
  v_start timestamptz:=(v_data->>'hearingAt')::timestamptz; v_duration integer:=greatest(15,least(1440,coalesce((v_data->>'durationMinutes')::integer,60)));
  v_end timestamptz:=v_start+make_interval(mins=>v_duration); v_timezone text:=coalesce(nullif(v_data->>'timezone',''),(select timezone from public.organizations where id=v_org),'UTC'); v_result jsonb;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
  perform public.nex_v52_assert_reference('client',v_client,false);
  perform public.nex_v52_assert_reference('process',v_process,false);
  perform public.nex_v52_assert_reference('profile',v_resp,false);
  if v_resp is not null and exists(select 1 from public.scheduled_events where organization_id=v_org and responsible_id=v_resp and archived_at is null and status not in ('cancelled','completed') and not(source_type='meeting' and source_id=v_id) and starts_at<v_end and coalesce(ends_at,starts_at+interval '1 hour')>v_start) then raise exception 'SCHEDULE_CONFLICT'; end if;
  v_result:=public.nex_v51_save_meeting(p_operation);
  update public.hearings set duration_minutes=v_duration,timezone=v_timezone,recurrence_rule=nullif(v_data->>'recurrenceRule',''),recurrence_series_id=nullif(v_data->>'recurrenceSeriesId','')::uuid,updated_at=now() where id=v_id and organization_id=v_org;
  update public.scheduled_events set ends_at=v_end,timezone=v_timezone,recurrence_rule=nullif(v_data->>'recurrenceRule',''),recurrence_series_id=nullif(v_data->>'recurrenceSeriesId','')::uuid,sync_status=coalesce(nullif(v_data->>'syncStatus',''),'local'),version=version+1,updated_at=now() where organization_id=v_org and source_type='meeting' and source_id=v_id;
  perform public.nex_v52_record_audit('agenda','save_meeting',v_id::text,null,jsonb_build_object('durationMinutes',v_duration,'timezone',v_timezone));
  return v_result;
end $$;

create or replace function public.nex_v52_cancel_meeting(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=(p_operation->>'meetingId')::uuid; v_result jsonb;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
  perform public.nex_v52_assert_reference('meeting',v_id,true);
  v_result:=public.nex_v51_cancel_meeting(p_operation);
  update public.scheduled_events set sync_status=case when external_event_id is null then 'local' else 'pending_delete' end,version=version+1,updated_at=now() where organization_id=public.nex_current_org_id() and source_type='meeting' and source_id=v_id;
  perform public.nex_v52_record_audit('agenda','cancel_meeting',v_id::text,null,p_operation);
  return v_result;
end $$;

create or replace function public.nex_v52_validate_scheduled_event_conflict(p_event_id uuid,p_responsible_id uuid,p_starts_at timestamptz,p_ends_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid:=public.nex_current_org_id(); v_conflicts jsonb;
begin
  perform public.nex_v52_assert_reference('profile',p_responsible_id,false);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'startsAt',starts_at,'endsAt',ends_at)),'[]'::jsonb) into v_conflicts
  from public.scheduled_events where organization_id=v_org and responsible_id=p_responsible_id and id<>coalesce(p_event_id,gen_random_uuid()) and archived_at is null and status not in ('cancelled','completed') and starts_at<p_ends_at and coalesce(ends_at,starts_at+interval '1 hour')>p_starts_at;
  return jsonb_build_object('hasConflict',jsonb_array_length(v_conflicts)>0,'conflicts',v_conflicts);
end $$;

revoke all on function public.nex_v52_save_meeting(jsonb),public.nex_v52_cancel_meeting(jsonb),public.nex_v52_validate_scheduled_event_conflict(uuid,uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.nex_v52_save_meeting(jsonb),public.nex_v52_cancel_meeting(jsonb),public.nex_v52_validate_scheduled_event_conflict(uuid,uuid,timestamptz,timestamptz) to authenticated;
commit;
