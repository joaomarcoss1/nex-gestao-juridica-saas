-- Nex Gestão Jurídica v5.2 · validação central de autorização e referências
begin;

create or replace function public.nex_v52_assert_role(p_roles text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_role text := lower(coalesce(public.nex_current_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (v_role = any(p_roles)) then raise exception 'FORBIDDEN'; end if;
end $$;

create or replace function public.nex_v52_assert_reference(p_kind text, p_id uuid, p_required boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_org uuid:=public.nex_current_org_id(); v_found uuid;
begin
  if p_id is null then
    if p_required then raise exception 'REFERENCE_REQUIRED:%',p_kind; end if;
    return null;
  end if;
  case p_kind
    when 'client' then select id into v_found from public.clients where id=p_id and organization_id=v_org and archived_at is null;
    when 'lead' then select id into v_found from public.leads where id=p_id and organization_id=v_org and archived_at is null;
    when 'process' then select id into v_found from public.processes where id=p_id and organization_id=v_org and archived_at is null;
    when 'profile' then select id into v_found from public.users_profiles where id=p_id and organization_id=v_org and active is true;
    when 'employee' then select id into v_found from public.employees where id=p_id and organization_id=v_org;
    when 'workflow_template' then select id into v_found from public.workflow_templates where id=p_id and organization_id=v_org and archived_at is null;
    when 'workflow_run' then select id into v_found from public.workflow_runs where id=p_id and organization_id=v_org and archived_at is null;
    when 'workflow_run_step' then select id into v_found from public.workflow_run_steps where id=p_id and organization_id=v_org and archived_at is null;
    when 'contract' then select id into v_found from public.fee_contracts where id=p_id and organization_id=v_org and archived_at is null;
    when 'cost' then select id into v_found from public.cost_entries where id=p_id and organization_id=v_org and archived_at is null;
    when 'payroll' then select id into v_found from public.payrolls where id=p_id and organization_id=v_org;
    when 'financial_entry' then select id into v_found from public.financial_entries where id=p_id and organization_id=v_org and archived_at is null;
    when 'meeting' then select id into v_found from public.hearings where id=p_id and organization_id=v_org and archived_at is null;
    when 'task' then select id into v_found from public.tasks where id=p_id and organization_id=v_org and archived_at is null;
    else raise exception 'UNKNOWN_REFERENCE_KIND:%',p_kind;
  end case;
  if v_found is null then raise exception 'CROSS_ORG_OR_INVALID_REFERENCE:%',p_kind; end if;
  return v_found;
end $$;

create or replace function public.nex_v52_record_audit(p_module text,p_action text,p_entity_id text,p_before jsonb default null,p_after jsonb default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs(organization_id,user_id,module,action,entity_id,before_data,after_data,device)
  values(public.nex_current_org_id(),public.nex_current_profile_id(),p_module,p_action,p_entity_id,p_before,p_after,'rpc:v5.2');
end $$;

revoke all on function public.nex_v52_assert_role(text[]) from public,anon;
revoke all on function public.nex_v52_assert_reference(text,uuid,boolean) from public,anon;
revoke all on function public.nex_v52_record_audit(text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.nex_v52_assert_role(text[]) to authenticated;
grant execute on function public.nex_v52_assert_reference(text,uuid,boolean) to authenticated;
grant execute on function public.nex_v52_record_audit(text,text,text,jsonb,jsonb) to authenticated;
commit;
