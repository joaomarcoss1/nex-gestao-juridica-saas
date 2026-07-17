-- Nex Gestão Jurídica v5.2 · suporte de persistência, reconciliação e timezone
begin;

alter table if exists public.organizations
  add column if not exists timezone text not null default 'America/Fortaleza';

alter table if exists public.financial_entries
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_id text,
  add column if not exists source_installment_id uuid,
  add column if not exists contract_id uuid,
  add column if not exists cost_id uuid,
  add column if not exists payroll_id uuid,
  add column if not exists proposal_id uuid,
  add column if not exists competency_date date,
  add column if not exists paid_amount numeric(14,2) not null default 0,
  add column if not exists payment_date date,
  add column if not exists version integer not null default 0,
  add column if not exists cancelled_at timestamptz,
  add column if not exists renegotiation_id uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.financial_entries set paid_amount = 0 where paid_amount is null;

alter table if exists public.fee_contracts add column if not exists archived_at timestamptz;
alter table if exists public.cost_entries add column if not exists archived_at timestamptz;
alter table if exists public.hearings add column if not exists archived_at timestamptz;

alter table if exists public.hearings
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists timezone text not null default 'America/Fortaleza',
  add column if not exists recurrence_rule text,
  add column if not exists recurrence_series_id uuid;

alter table if exists public.scheduled_events
  add column if not exists recurrence_series_id uuid,
  add column if not exists recurrence_exception_date date,
  add column if not exists sync_status text not null default 'local',
  add column if not exists last_sync_at timestamptz,
  add column if not exists sync_error text,
  add column if not exists external_updated_at timestamptz,
  add column if not exists timezone text not null default 'America/Fortaleza';


alter table if exists public.payment_receipts
  add column if not exists status text not null default 'issued',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists reversed_by uuid references public.users_profiles(id);

alter table if exists public.workflow_runs
  add column if not exists version integer not null default 0;

alter table if exists public.workflow_steps
  add column if not exists execution_group text not null default 'default',
  add column if not exists condition_type text,
  add column if not exists condition_payload jsonb not null default '{}'::jsonb,
  add column if not exists required_approver_role text,
  add column if not exists required_document_type text;

alter table if exists public.workflow_run_steps
  add column if not exists execution_group text not null default 'default',
  add column if not exists condition_type text,
  add column if not exists condition_payload jsonb not null default '{}'::jsonb,
  add column if not exists required_approver_role text,
  add column if not exists required_document_type text,
  add column if not exists sla_started_at timestamptz,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_paused_at timestamptz,
  add column if not exists sla_paused_seconds bigint not null default 0,
  add column if not exists sla_breached_at timestamptz,
  add column if not exists version integer not null default 0;

create table if not exists public.organization_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counter_key text not null,
  counter_year integer not null default extract(year from current_date)::integer,
  current_value bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, counter_key, counter_year)
);

create table if not exists public.financial_reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  financial_entry_id uuid not null references public.financial_entries(id) on delete cascade,
  entry_paid_amount numeric(14,2) not null,
  payments_paid_amount numeric(14,2) not null,
  difference numeric(14,2) not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create or replace function public.nex_v52_next_counter(p_counter_key text, p_year integer default extract(year from current_date)::integer)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.nex_current_org_id();
  v_next bigint;
begin
  if auth.uid() is null or v_org is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.organization_counters(organization_id, counter_key, counter_year, current_value)
  values(v_org, p_counter_key, p_year, 1)
  on conflict(organization_id, counter_key, counter_year)
  do update set current_value = public.organization_counters.current_value + 1, updated_at = now()
  returning current_value into v_next;
  return v_next;
end $$;

revoke all on function public.nex_v52_next_counter(text, integer) from public, anon;
grant execute on function public.nex_v52_next_counter(text, integer) to authenticated;

create or replace function public.nex_v52_reconcile_financial_entry(p_financial_entry_id uuid, p_apply boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid := public.nex_current_org_id();
  v_entry public.financial_entries%rowtype;
  v_sum numeric(14,2);
  v_difference numeric(14,2);
begin
  if auth.uid() is null or v_org is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_entry from public.financial_entries
   where id=p_financial_entry_id and organization_id=v_org for update;
  if not found then raise exception 'FINANCIAL_ENTRY_NOT_FOUND'; end if;
  select coalesce(sum(amount_cents),0)::numeric/100 into v_sum
    from public.financial_payments
   where organization_id=v_org and financial_entry_id=p_financial_entry_id
     and cancelled_at is null and archived_at is null;
  v_difference := round(coalesce(v_entry.paid_amount,0)-v_sum,2);
  if v_difference <> 0 then
    insert into public.financial_reconciliation_log(organization_id,financial_entry_id,entry_paid_amount,payments_paid_amount,difference)
    values(v_org,p_financial_entry_id,coalesce(v_entry.paid_amount,0),v_sum,v_difference);
    if p_apply then
      update public.financial_entries
         set paid_amount=v_sum,
             status=case when v_sum<=0 then 'pending' when v_sum>=amount then 'paid' else 'partially_paid' end,
             version=version+1,updated_at=now()
       where id=p_financial_entry_id and organization_id=v_org;
    end if;
  end if;
  return jsonb_build_object('id',p_financial_entry_id,'entryPaid',coalesce(v_entry.paid_amount,0),'paymentsPaid',v_sum,'difference',v_difference,'applied',p_apply and v_difference<>0);
end $$;

revoke all on function public.nex_v52_reconcile_financial_entry(uuid, boolean) from public, anon;
grant execute on function public.nex_v52_reconcile_financial_entry(uuid, boolean) to authenticated;

commit;
