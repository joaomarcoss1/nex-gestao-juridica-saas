-- Nex Gestão Jurídica v4.8
-- CRM, processos com integração judicial preparada, workflow da equipe, financeiro em dois ramos e ponto público.
-- Idempotente: pode ser executada em bases que receberam v45/v46/v47.

begin;
create extension if not exists pgcrypto;

-- =========================================================
-- 1. PROCESSOS: controle local + integração judicial
-- =========================================================
create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid,
  client_name text,
  cnj text,
  area text,
  court text,
  phase text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.processes
  add column if not exists organization_id uuid,
  add column if not exists client_id uuid,
  add column if not exists client_name text,
  add column if not exists cnj text,
  add column if not exists area text,
  add column if not exists court text,
  add column if not exists phase text,
  add column if not exists status text,
  add column if not exists judiciary_provider text default 'local',
  add column if not exists judiciary_sync_enabled boolean not null default false,
  add column if not exists judiciary_last_sync_at timestamptz,
  add column if not exists judiciary_last_movement_at timestamptz,
  add column if not exists judiciary_external_id text,
  add column if not exists judiciary_last_payload jsonb not null default '{}'::jsonb,
  add column if not exists local_tracking_notes text,
  add column if not exists client_visible_summary text,
  add column if not exists internal_strategy text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists processes_org_idx on public.processes (organization_id);
create index if not exists processes_cnj_idx on public.processes (cnj) where cnj is not null;
create index if not exists processes_judiciary_sync_idx on public.processes (judiciary_sync_enabled, judiciary_provider);

create table if not exists public.process_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  process_id uuid,
  provider text not null default 'manual',
  external_movement_id text,
  movement_at timestamptz not null default now(),
  title text not null,
  description text,
  requires_action boolean not null default false,
  action_due_date date,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.process_movements
  add column if not exists organization_id uuid,
  add column if not exists process_id uuid,
  add column if not exists provider text default 'manual',
  add column if not exists external_movement_id text,
  add column if not exists movement_at timestamptz default now(),
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists requires_action boolean default false,
  add column if not exists action_due_date date,
  add column if not exists raw_payload jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create index if not exists process_movements_org_process_idx on public.process_movements (organization_id, process_id, movement_at desc);

create table if not exists public.judiciary_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  provider text not null,
  status text not null default 'prepared',
  base_url text,
  last_sync_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

-- =========================================================
-- 2. CRM e WORKFLOW
-- =========================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text,
  phone text,
  email text,
  origin text,
  area text,
  stage text,
  value numeric default 0,
  next_contact date,
  responsible_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists organization_id uuid,
  add column if not exists crm_score integer default 0,
  add column if not exists qualification_status text default 'new',
  add column if not exists conversion_process_id uuid,
  add column if not exists conversion_client_id uuid,
  add column if not exists lost_reason text,
  add column if not exists next_contact date,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists leads_org_stage_idx on public.leads (organization_id, stage);
create index if not exists leads_next_contact_idx on public.leads (next_contact);

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  module_area text not null default 'Geral',
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid,
  step_order integer not null default 1,
  name text not null,
  creates_task boolean default true,
  task_title text,
  responsible_role text,
  requires_document boolean default false,
  notify_client boolean default false,
  auto_priority text default 'Média',
  sla_hours integer default 24,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  process_id uuid,
  client_id uuid,
  title text,
  description text,
  responsible_id uuid,
  delegated_by uuid,
  reviewer_id uuid,
  sector text,
  priority text,
  status text,
  due_date date,
  estimated_hours numeric default 0,
  spent_hours numeric default 0,
  workflow_stage text,
  sla_hours integer default 24,
  quality_score integer,
  checklist jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists organization_id uuid,
  add column if not exists delegated_by uuid,
  add column if not exists reviewer_id uuid,
  add column if not exists workflow_stage text,
  add column if not exists sla_hours integer default 24,
  add column if not exists quality_score integer,
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists comments jsonb not null default '[]'::jsonb,
  add column if not exists blockers jsonb not null default '[]'::jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists tasks_org_status_idx on public.tasks (organization_id, status, due_date);
create index if not exists tasks_responsible_idx on public.tasks (responsible_id, due_date);

create table if not exists public.workflow_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  task_id uuid,
  process_id uuid,
  sender_id uuid,
  sender_name text,
  body text not null,
  priority text default 'Média',
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists workflow_messages_task_idx on public.workflow_messages (task_id, created_at desc);

-- =========================================================
-- 3. FINANCEIRO: cobranças/processos + folha/despesas
-- =========================================================
create table if not exists public.fee_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid,
  process_id uuid,
  title text not null,
  fee_type text not null default 'Contratual',
  total_amount numeric not null default 0,
  entry_amount numeric not null default 0,
  installments integer not null default 1,
  success_percent numeric,
  status text not null default 'Rascunho',
  signed_at date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fee_contracts
  add column if not exists organization_id uuid,
  add column if not exists process_id uuid,
  add column if not exists success_percent numeric,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create table if not exists public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid,
  process_id uuid,
  category text not null default 'Despesa interna',
  description text not null,
  amount numeric not null default 0,
  due_date date,
  status text not null default 'Pendente',
  responsible_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_entries
  add column if not exists organization_id uuid,
  add column if not exists process_id uuid,
  add column if not exists cost_center text,
  add column if not exists bank_account text,
  add column if not exists installment integer,
  add column if not exists installments integer,
  add column if not exists receipt_number text,
  add column if not exists partial_payments jsonb not null default '[]'::jsonb,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create table if not exists public.payrolls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  employee_id uuid,
  employee_name text,
  month integer,
  year integer,
  base_salary numeric default 0,
  worked_hours numeric default 0,
  overtime numeric default 0,
  absences numeric default 0,
  delays numeric default 0,
  benefits numeric default 0,
  discounts numeric default 0,
  commissions numeric default 0,
  gross numeric default 0,
  net numeric default 0,
  status text default 'Rascunho',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_entries_org_due_idx on public.financial_entries (organization_id, due_date, status);
create index if not exists fee_contracts_org_idx on public.fee_contracts (organization_id, status);
create index if not exists cost_entries_org_idx on public.cost_entries (organization_id, status);
create index if not exists payrolls_org_period_idx on public.payrolls (organization_id, year, month);

-- =========================================================
-- 4. PONTO PÚBLICO SEM LOGIN
-- =========================================================
create table if not exists public.time_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  employee_id uuid,
  employee_name text,
  sector text,
  kind text,
  record_date date not null default current_date,
  record_time time not null default current_time,
  status text not null default 'normal',
  mode text not null default 'Presencial',
  location text,
  origin text default 'web',
  expected_time text,
  device text,
  justification text,
  consent_lgpd boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.employees
  add column if not exists organization_id uuid,
  add column if not exists pin_hash text,
  add column if not exists role text,
  add column if not exists sector text,
  add column if not exists entrada text default '08:00',
  add column if not exists saida_intervalo text default '12:00',
  add column if not exists retorno_intervalo text default '14:00',
  add column if not exists saida_final text default '18:00',
  add column if not exists status text default 'Ativo';

create or replace function public.public_point_employees(p_registration_code text)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  role text,
  sector text,
  entrada text,
  saida_intervalo text,
  retorno_intervalo text,
  saida_final text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.organization_id,
    coalesce(e.name, e.full_name, 'Colaborador') as name,
    coalesce(e.role, 'Funcionário') as role,
    coalesce(e.sector, e.department, 'Operacional') as sector,
    coalesce(e.entrada, e.payload->'schedule'->>'entrada', '08:00') as entrada,
    coalesce(e.saida_intervalo, e.payload->'schedule'->>'saida_intervalo', '12:00') as saida_intervalo,
    coalesce(e.retorno_intervalo, e.payload->'schedule'->>'retorno_intervalo', '14:00') as retorno_intervalo,
    coalesce(e.saida_final, e.payload->'schedule'->>'saida_final', '18:00') as saida_final
  from public.employees e
  join public.organizations o on o.id = e.organization_id
  where o.registration_code = p_registration_code
    and coalesce(e.status, 'Ativo') not in ('Inativo', 'Desligado')
  order by name;
$$;

create or replace function public.public_point_punch(
  p_registration_code text,
  p_employee_id uuid,
  p_pin text,
  p_kind text,
  p_mode text,
  p_justification text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee record;
  v_pin_ok boolean;
  v_expected text;
  v_count integer;
begin
  select e.*, o.id as org_id, o.registration_code
  into v_employee
  from public.employees e
  join public.organizations o on o.id = e.organization_id
  where o.registration_code = p_registration_code
    and e.id = p_employee_id
    and coalesce(e.status, 'Ativo') not in ('Inativo', 'Desligado')
  limit 1;

  if v_employee.id is null then
    raise exception 'Funcionário não encontrado para esta empresa.';
  end if;

  v_pin_ok := coalesce(v_employee.pin_hash, '') = encode(digest('nex-gestao-juridica:' || coalesce(p_pin, ''), 'sha256'), 'hex')
    or coalesce(v_employee.pin_hash, '') like ('%_' || coalesce(p_pin, '') || '_%')
    or coalesce(v_employee.pin_hash, '') like ('%' || coalesce(p_pin, '') || '%local_demo');

  if not v_pin_ok then
    raise exception 'PIN inválido.';
  end if;

  select count(*) into v_count
  from public.time_records tr
  where tr.employee_id = p_employee_id
    and tr.record_date = current_date
    and tr.kind = p_kind;

  if v_count > 0 then
    raise exception 'Esta marcação já foi registrada hoje.';
  end if;

  v_expected := case p_kind
    when 'entrada' then coalesce(v_employee.entrada, '08:00')
    when 'saida_intervalo' then coalesce(v_employee.saida_intervalo, '12:00')
    when 'retorno_intervalo' then coalesce(v_employee.retorno_intervalo, '14:00')
    when 'saida_final' then coalesce(v_employee.saida_final, '18:00')
    else null
  end;

  insert into public.time_records (
    organization_id, employee_id, employee_name, sector, kind, record_date, record_time,
    status, mode, location, origin, expected_time, device, justification, consent_lgpd
  ) values (
    v_employee.organization_id,
    v_employee.id,
    coalesce(v_employee.name, v_employee.full_name, 'Colaborador'),
    coalesce(v_employee.sector, v_employee.department, 'Operacional'),
    p_kind,
    current_date,
    current_time,
    case when p_justification is null or length(trim(p_justification)) = 0 then 'normal' else 'pendente_aprovacao' end,
    coalesce(p_mode, 'Presencial'),
    'Terminal público de ponto',
    'public_web',
    v_expected,
    'web-public-terminal',
    nullif(trim(coalesce(p_justification, '')), ''),
    true
  );

  return jsonb_build_object('success', true, 'kind', p_kind, 'recorded_at', now());
end;
$$;

grant execute on function public.public_point_employees(text) to anon, authenticated, service_role;
grant execute on function public.public_point_punch(text, uuid, text, text, text, text) to anon, authenticated, service_role;

-- =========================================================
-- 5. RLS básico para novas tabelas
-- =========================================================
alter table public.process_movements enable row level security;
alter table public.judiciary_integrations enable row level security;
alter table public.workflow_messages enable row level security;

-- Policies compatíveis com helpers criados em v45/v46/v47.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'nex_is_global_master') then
    drop policy if exists process_movements_policy on public.process_movements;
    create policy process_movements_policy on public.process_movements for all
      using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())
      with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());

    drop policy if exists judiciary_integrations_policy on public.judiciary_integrations;
    create policy judiciary_integrations_policy on public.judiciary_integrations for all
      using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())
      with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());

    drop policy if exists workflow_messages_policy on public.workflow_messages;
    create policy workflow_messages_policy on public.workflow_messages for all
      using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())
      with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
  end if;
end $$;

commit;
