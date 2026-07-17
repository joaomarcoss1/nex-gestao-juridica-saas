-- Nex Gestão Jurídica v5.2 · índices para paginação e filtros server-side
begin;
create index if not exists leads_org_updated_idx on public.leads(organization_id,updated_at desc,id) where archived_at is null;
create index if not exists leads_org_stage_contact_idx on public.leads(organization_id,stage,next_contact,id) where archived_at is null;
create index if not exists processes_org_updated_idx on public.processes(organization_id,updated_at desc,id) where archived_at is null;
create index if not exists processes_org_phase_status_idx on public.processes(organization_id,phase,status,id) where archived_at is null;
create index if not exists tasks_org_due_status_idx on public.tasks(organization_id,due_at,status,id) where archived_at is null;
create index if not exists financial_entries_org_due_status_idx on public.financial_entries(organization_id,due_date,status,id) where archived_at is null;
create index if not exists scheduled_events_org_interval_idx on public.scheduled_events(organization_id,starts_at,ends_at,id) where archived_at is null;
create index if not exists documents_org_created_idx on public.documents(organization_id,created_at desc,id) where archived_at is null;
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id,created_at desc,id);
create index if not exists financial_payments_org_entry_idx on public.financial_payments(organization_id,financial_entry_id,payment_date desc,id) where archived_at is null;

create or replace function public.nex_v52_schema_health()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_missing text[]; v_role text:=lower(coalesce(public.nex_current_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_role not in ('admin_master','admin_master_global','admin_empresa','admin','socio','controladoria') then raise exception 'FORBIDDEN'; end if;
  select coalesce(array_agg(required.column_name) filter(where cols.column_name is null),array[]::text[]) into v_missing
  from (values ('movement_type'),('occurred_at'),('source'),('external_id'),('visibility'),('provider'),('external_movement_id'),('movement_at')) required(column_name)
  left join information_schema.columns cols on cols.table_schema='public' and cols.table_name='process_movements' and cols.column_name=required.column_name;
  return jsonb_build_object(
    'ok',cardinality(v_missing)=0,
    'missingProcessMovementColumns',to_jsonb(v_missing),
    'hasFinancialPayments',to_regclass('public.financial_payments') is not null,
    'hasWorkflowRuns',to_regclass('public.workflow_runs') is not null,
    'hasCounter',to_regclass('public.organization_counters') is not null,
    'hasRegisterPayment',to_regprocedure('public.nex_v52_register_payment(jsonb)') is not null,
    'hasClientPolicy',exists(select 1 from pg_policies where schemaname='public' and policyname='v52_client_process_movements')
  );
end $$;
revoke all on function public.nex_v52_schema_health() from public,anon;
grant execute on function public.nex_v52_schema_health() to authenticated;

commit;
