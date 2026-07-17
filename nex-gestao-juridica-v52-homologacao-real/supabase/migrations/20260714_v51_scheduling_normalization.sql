-- v5.1 · agenda normalizada, sem duplicidade, conflitos e vínculo reunião/tarefa
begin;
alter table if exists public.scheduled_events add column if not exists visibility text not null default 'internal', add column if not exists external_event_id text,
 add column if not exists recurrence_rule text, add column if not exists timezone text not null default 'America/Fortaleza', add column if not exists version integer not null default 0,
 add column if not exists event_type text default 'manual', add column if not exists starts_at timestamptz, add column if not exists ends_at timestamptz,
 add column if not exists location text, add column if not exists meeting_link text, add column if not exists notes text, add column if not exists updated_at timestamptz default now();
update public.scheduled_events set source_type='financial_entry' where source_type in ('finance','payment');
update public.scheduled_events set status=case lower(status) when 'agendada' then 'scheduled' when 'pendente' then 'scheduled' when 'realizada' then 'completed' when 'concluído' then 'completed' when 'concluida' then 'completed' when 'cancelado' then 'cancelled' when 'cancelada' then 'cancelled' else lower(status) end;
with duplicated as (select id,row_number() over(partition by organization_id,source_type,source_id,event_type order by created_at,id) rn from public.scheduled_events where source_type is not null and source_id is not null)
update public.scheduled_events e set source_id=null,notes=concat_ws(E'\n',notes,'Origem duplicada preservada pela v5.1 sem participar da sincronização.') from duplicated d where e.id=d.id and d.rn>1;
drop index if exists public.scheduled_events_source_uidx;
create unique index if not exists scheduled_events_source_event_uidx on public.scheduled_events(organization_id,source_type,source_id,event_type) where source_type is not null and source_id is not null and archived_at is null;
create unique index if not exists scheduled_events_google_uidx on public.scheduled_events(organization_id,external_event_id) where external_event_id is not null and archived_at is null;
create index if not exists scheduled_events_responsible_interval_idx on public.scheduled_events(organization_id,responsible_id,starts_at,ends_at) where status not in ('cancelled','completed') and archived_at is null;
alter table if exists public.tasks add column if not exists meeting_id uuid;

create or replace function public.nex_v51_save_meeting(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_data jsonb:=p_operation->'meeting'; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_id uuid:=coalesce((v_data->>'id')::uuid,gen_random_uuid()); v_event uuid; v_task uuid; v_start timestamptz:=(v_data->>'hearingAt')::timestamptz; v_end timestamptz:=((v_data->>'hearingAt')::timestamptz+interval '1 hour'); v_resp uuid:=nullif(v_data->>'responsible','')::uuid;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']); select * into v_claim from public.nex_v51_claim_idempotency('save_meeting',v_key); if v_claim.status='completed' then return v_claim.result; end if;
 if exists(select 1 from public.scheduled_events where organization_id=v_org and responsible_id=v_resp and id<>coalesce((select id from public.scheduled_events where source_type='meeting' and source_id=v_id),gen_random_uuid()) and status not in ('cancelled','completed') and archived_at is null and starts_at<v_end and coalesce(ends_at,starts_at+interval '1 hour')>v_start) then raise exception 'SCHEDULE_CONFLICT'; end if;
 insert into public.hearings(id,organization_id,process_id,client_id,title,hearing_at,type,location,link,responsible_id,checklist,status,updated_at)
 values(v_id,v_org,nullif(v_data->>'processId','')::uuid,nullif(v_data->>'clientId','')::uuid,v_data->>'title',v_start,coalesce(v_data->>'type','Reunião'),v_data->>'location',v_data->>'link',v_resp,coalesce(v_data->'checklist','[]'::jsonb),coalesce(v_data->>'status','Agendada'),now())
 on conflict(id) do update set process_id=excluded.process_id,client_id=excluded.client_id,title=excluded.title,hearing_at=excluded.hearing_at,type=excluded.type,location=excluded.location,link=excluded.link,responsible_id=excluded.responsible_id,checklist=excluded.checklist,status=excluded.status,updated_at=now();
 insert into public.scheduled_events(organization_id,event_type,source_type,source_id,title,client_id,process_id,responsible_id,starts_at,ends_at,location,meeting_link,status,visibility,client_visible,timezone,version,created_at,updated_at)
 values(v_org,case when lower(coalesce(v_data->>'type','')) like '%audi%' then 'hearing' else 'meeting' end,'meeting',v_id,v_data->>'title',nullif(v_data->>'clientId','')::uuid,nullif(v_data->>'processId','')::uuid,v_resp,v_start,v_end,v_data->>'location',v_data->>'link',case when v_data->>'status'='Cancelada' then 'cancelled' when v_data->>'status'='Realizada' then 'completed' else 'scheduled' end,case when nullif(v_data->>'clientId','') is null then 'team' else 'client' end,nullif(v_data->>'clientId','') is not null,'America/Fortaleza',1,now(),now())
 on conflict(organization_id,source_type,source_id,event_type) where source_type is not null and source_id is not null and archived_at is null do update set title=excluded.title,client_id=excluded.client_id,process_id=excluded.process_id,responsible_id=excluded.responsible_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,meeting_link=excluded.meeting_link,status=excluded.status,visibility=excluded.visibility,client_visible=excluded.client_visible,version=public.scheduled_events.version+1,updated_at=now() returning id into v_event;
 select id into v_task from public.tasks where organization_id=v_org and meeting_id=v_id and archived_at is null limit 1;
 if v_task is null and v_resp is not null then insert into public.tasks(organization_id,process_id,client_id,title,description,responsible_id,sector,priority,status,due_at,estimated_hours,spent_hours,workflow_stage,sla_hours,checklist,checklist_completed,meeting_id,estimated_minutes,worked_minutes,billable_minutes,created_at,updated_at) values(v_org,nullif(v_data->>'processId','')::uuid,nullif(v_data->>'clientId','')::uuid,'Preparar '||(v_data->>'title'),'Preparar pauta, documentos e participantes.',v_resp,'Agenda / Controladoria','Média','Pendente',v_start,0.75,0,'Execução',24,'["Separar documentos","Confirmar participantes","Registrar ata"]'::jsonb,'[]'::jsonb,v_id,45,0,0,now(),now()) returning id into v_task; else update public.tasks set process_id=nullif(v_data->>'processId','')::uuid,client_id=nullif(v_data->>'clientId','')::uuid,responsible_id=v_resp,title='Preparar '||(v_data->>'title'),due_at=v_start,status=case when v_data->>'status'='Cancelada' and status<>'Concluída' then 'Cancelada' else status end,updated_at=now() where id=v_task; end if;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_id,jsonb_build_object('id',v_id,'eventId',v_event,'taskId',v_task)); return jsonb_build_object('id',v_id,'eventId',v_event,'taskId',v_task);
end $$;
grant execute on function public.nex_v51_save_meeting(jsonb) to authenticated;

create or replace function public.nex_v51_cancel_meeting(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_id uuid:=(p_operation->>'meetingId')::uuid; v_reason text:=trim(coalesce(p_operation->>'reason',''));
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']); if v_reason='' then raise exception 'REASON_REQUIRED'; end if;
 if exists(select 1 from public.hearings where id=v_id and organization_id=v_org and lower(status)='cancelada') then return jsonb_build_object('id',v_id,'existing',true); end if;
 update public.hearings set status='Cancelada',updated_at=now() where id=v_id and organization_id=v_org; if not found then raise exception 'MEETING_NOT_FOUND'; end if;
 update public.scheduled_events set status='cancelled',notes=concat_ws(E'\n',notes,'Cancelamento: '||v_reason),version=version+1,updated_at=now() where organization_id=v_org and source_type='meeting' and source_id=v_id;
 update public.tasks set status='Cancelada',comments=coalesce(comments,'[]'::jsonb)||jsonb_build_array('Reunião cancelada: '||v_reason),updated_at=now() where organization_id=v_org and meeting_id=v_id and status<>'Concluída'; return jsonb_build_object('id',v_id);
end $$;
grant execute on function public.nex_v51_cancel_meeting(jsonb) to authenticated;
commit;
