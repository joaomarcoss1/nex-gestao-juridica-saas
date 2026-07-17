-- Nex Gestão Jurídica v5.2 · CRM transacional, consentimento e origem padrão única
begin;

alter table if exists public.leads
  add column if not exists lost_value numeric(14,2) not null default 0,
  add column if not exists duplicate_override_reason text;

create unique index if not exists crm_lead_sources_one_default_uidx
  on public.crm_lead_sources(organization_id)
  where is_default is true and active is true and archived_at is null;

create or replace function public.nex_v52_convert_lead(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid:=public.nex_current_org_id(); v_lead uuid:=(p_operation->>'leadId')::uuid;
  v_reuse uuid:=nullif(p_operation->>'reuseClientId','')::uuid; v_override text:=trim(coalesce(p_operation->>'duplicateOverrideReason',''));
  v_require_consent boolean:=coalesce((p_operation->>'requireConsent')::boolean,true); v_l public.leads%rowtype; v_matches integer; v_result jsonb;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
  perform public.nex_v52_assert_reference('lead',v_lead,true);
  select * into v_l from public.leads where id=v_lead and organization_id=v_org for update;
  if v_require_consent and not coalesce(v_l.consent_accepted,false) then raise exception 'CONSENT_REQUIRED'; end if;
  if v_reuse is not null then perform public.nex_v52_assert_reference('client',v_reuse,true); end if;
  select count(*) into v_matches from public.clients c where c.organization_id=v_org and c.archived_at is null and (
    (nullif(v_l.document,'') is not null and c.document=v_l.document) or
    (nullif(v_l.email,'') is not null and lower(c.email)=lower(v_l.email)) or
    (nullif(v_l.phone,'') is not null and (c.phone=v_l.phone or c.whatsapp=v_l.phone))
  );
  if v_matches>0 and v_reuse is null and v_override='' then raise exception 'DUPLICATE_CLIENT_DECISION_REQUIRED'; end if;
  if v_matches>1 and v_reuse is null then raise exception 'AMBIGUOUS_CLIENT_MATCH'; end if;
  v_result:=public.nex_v51_convert_lead(p_operation || jsonb_build_object('reuseClientId',coalesce(v_reuse::text,'')));
  update public.leads set duplicate_override_reason=nullif(v_override,''),version=version+1,updated_at=now() where id=v_lead and organization_id=v_org;
  perform public.nex_v52_record_audit('crm','convert_lead',v_lead::text,jsonb_build_object('matches',v_matches),v_result);
  return v_result;
end $$;

create or replace function public.nex_v52_create_lead_follow_up(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid:=public.nex_current_org_id(); v_lead uuid:=(p_operation->>'leadId')::uuid; v_due date:=(p_operation->>'dueDate')::date; v_title text:=trim(coalesce(p_operation->>'title','Follow-up comercial')); v_l public.leads%rowtype; v_task uuid;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
  perform public.nex_v52_assert_reference('lead',v_lead,true);
  select * into v_l from public.leads where id=v_lead and organization_id=v_org for update;
  insert into public.tasks(organization_id,client_id,title,description,responsible_id,sector,priority,status,due_at,estimated_hours,spent_hours,workflow_stage,sla_hours,checklist,checklist_completed,estimated_minutes,worked_minutes,billable_minutes,created_at,updated_at)
  values(v_org,null,v_title,'Follow-up do lead '||v_l.name,v_l.responsible_id,'Comercial','Média','Pendente',v_due::timestamptz,0.5,0,'Triagem',24,'[]'::jsonb,'[]'::jsonb,30,0,0,now(),now()) returning id into v_task;
  update public.leads set next_contact=v_due,updated_at=now(),version=version+1 where id=v_lead;
  perform public.nex_v52_record_audit('crm','create_follow_up',v_lead::text,null,jsonb_build_object('taskId',v_task,'dueDate',v_due));
  return jsonb_build_object('id',v_task,'leadId',v_lead);
end $$;

create or replace function public.nex_v52_set_default_lead_source_operation(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid:=public.nex_current_org_id(); v_source uuid:=(p_operation->>'sourceId')::uuid;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','controladoria','atendimento']);
  if not exists(select 1 from public.crm_lead_sources where id=v_source and organization_id=v_org and archived_at is null and active is true for update) then raise exception 'LEAD_SOURCE_NOT_FOUND'; end if;
  update public.crm_lead_sources set is_default=false,updated_at=now() where organization_id=v_org and is_default=true and id<>v_source;
  update public.crm_lead_sources set is_default=true,updated_at=now() where id=v_source and organization_id=v_org;
  perform public.nex_v52_record_audit('crm','set_default_source',v_source::text,null,null);
  return jsonb_build_object('id',v_source);
end $$;

create or replace function public.nex_v52_validate_lost_lead()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if lower(coalesce(new.stage,'')) in ('perdido','lost') and lower(coalesce(old.stage,'')) not in ('perdido','lost') then
    if trim(coalesce(new.loss_reason,''))='' or trim(coalesce(new.loss_notes,''))='' then raise exception 'LOSS_REASON_AND_NOTES_REQUIRED'; end if;
    new.lost_at:=coalesce(new.lost_at,now()); new.lost_by:=coalesce(new.lost_by,public.nex_current_profile_id());
  end if;
  return new;
end $$;
drop trigger if exists trg_v52_validate_lost_lead on public.leads;
create trigger trg_v52_validate_lost_lead before update of stage on public.leads for each row execute function public.nex_v52_validate_lost_lead();

revoke all on function public.nex_v52_convert_lead(jsonb),public.nex_v52_create_lead_follow_up(jsonb),public.nex_v52_set_default_lead_source_operation(jsonb) from public,anon;
grant execute on function public.nex_v52_convert_lead(jsonb),public.nex_v52_create_lead_follow_up(jsonb),public.nex_v52_set_default_lead_source_operation(jsonb) to authenticated;
commit;
