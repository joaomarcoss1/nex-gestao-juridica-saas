-- Nex Gestão Jurídica v3.7 Enterprise ERP Jurídico
-- Migração incremental: não remove tabelas/colunas existentes.
-- Execute depois de 20260702_v36_admin_master_chat_workflow.sql.

create extension if not exists "uuid-ossp";

-- Multiempresa, filiais, departamentos e times
create table if not exists public.units (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  state text,
  address jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  name text not null,
  legal_area text,
  manager_id uuid references public.users_profiles(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  coordinator_id uuid references public.users_profiles(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  profile_id uuid references public.users_profiles(id) on delete cascade,
  member_role text default 'membro',
  created_at timestamptz default now(),
  unique(team_id, profile_id)
);

alter table public.users_profiles add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.users_profiles add column if not exists unit_id uuid references public.units(id) on delete set null;
alter table public.users_profiles add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.users_profiles add column if not exists manager_id uuid references public.users_profiles(id) on delete set null;
alter table public.users_profiles add column if not exists promoted_by uuid references public.users_profiles(id) on delete set null;
alter table public.users_profiles add column if not exists promoted_at timestamptz;
alter table public.users_profiles add column if not exists last_access_review_at timestamptz;
alter table public.users_profiles add column if not exists invitation_status text default 'ativo';

alter table public.employees add column if not exists unit_id uuid references public.units(id) on delete set null;
alter table public.employees add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.employees add column if not exists manager_id uuid references public.users_profiles(id) on delete set null;
alter table public.employees add column if not exists tolerance_minutes integer default 30;
alter table public.employees add column if not exists work_days jsonb default '["Seg","Ter","Qua","Qui","Sex"]';

-- CRM jurídico enterprise
alter table public.leads add column if not exists type text default 'PF';
alter table public.leads add column if not exists priority text default 'Média';
alter table public.leads add column if not exists last_contact_at timestamptz;
alter table public.leads add column if not exists converted_client_id uuid references public.clients(id) on delete set null;
alter table public.leads add column if not exists converted_process_id uuid references public.processes(id) on delete set null;

-- Processos/casos, workflow e checklists
alter table public.processes add column if not exists unit_id uuid references public.units(id) on delete set null;
alter table public.processes add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.processes add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.processes add column if not exists workflow_stage text;
alter table public.processes add column if not exists client_visible_summary text;
alter table public.processes add column if not exists internal_strategy text;
alter table public.processes add column if not exists checklist jsonb default '[]';
alter table public.processes add column if not exists protocol_status text;
alter table public.processes add column if not exists last_move_days integer default 0;
alter table public.processes add column if not exists progress integer default 0;

create table if not exists public.workflow_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  legal_area text,
  case_type text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workflow_template_id uuid references public.workflow_templates(id) on delete cascade,
  step_order integer not null,
  name text not null,
  default_responsible_role text,
  auto_actions jsonb default '[]',
  checklist jsonb default '[]',
  sla_hours integer default 24,
  created_at timestamptz default now()
);

alter table public.tasks add column if not exists delegated_by uuid references public.users_profiles(id) on delete set null;
alter table public.tasks add column if not exists reviewer_id uuid references public.users_profiles(id) on delete set null;
alter table public.tasks add column if not exists workflow_stage text;
alter table public.tasks add column if not exists checklist jsonb default '[]';
alter table public.tasks add column if not exists comments jsonb default '[]';
alter table public.tasks add column if not exists blockers jsonb default '[]';
alter table public.tasks add column if not exists sla_hours integer default 24;
alter table public.tasks add column if not exists quality_score integer;
alter table public.tasks add column if not exists spent_hours numeric(10,2) default 0;
alter table public.tasks add column if not exists estimated_hours numeric(10,2) default 0;

-- Módulos jurídicos especializados
create table if not exists public.legal_modules (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  area text not null,
  objective text,
  services jsonb default '[]',
  required_fields jsonb default '[]',
  checklist jsonb default '[]',
  workflow jsonb default '[]',
  reports jsonb default '[]',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, area)
);

create table if not exists public.process_modules (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  process_id uuid references public.processes(id) on delete cascade,
  legal_module_id uuid references public.legal_modules(id) on delete set null,
  data jsonb default '{}',
  checklist_status jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(process_id, legal_module_id)
);

create table if not exists public.rural_properties (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  process_id uuid references public.processes(id) on delete set null,
  property_name text,
  property_type text,
  owner_name text,
  possessor_name text,
  city text,
  state text,
  locality text,
  declared_area numeric(18,4),
  measured_area numeric(18,4),
  registered_area numeric(18,4),
  registry_number text,
  registry_office text,
  ccir text,
  car text,
  itr text,
  cib text,
  nirf text,
  sigef text,
  incra text,
  coordinates jsonb default '{}',
  memorial_storage_path text,
  map_storage_path text,
  neighbors jsonb default '[]',
  legal_reserve text,
  app_area text,
  productive_area text,
  preservation_area text,
  environmental_status text,
  tax_status text,
  registry_status text,
  land_status text,
  pending_items jsonb default '[]',
  protocols jsonb default '[]',
  media jsonb default '[]',
  technical_reports jsonb default '[]',
  art_rrt text,
  technical_responsible text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.module_specialized_data (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  process_id uuid references public.processes(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  legal_area text not null,
  data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ponto corporativo com PIN e ajustes auditáveis
alter table public.time_records add column if not exists unit_id uuid references public.units(id) on delete set null;
alter table public.time_records add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.time_records add column if not exists expected_time time;
alter table public.time_records add column if not exists requested_time time;
alter table public.time_records add column if not exists origin text default 'web';
alter table public.time_records add column if not exists ip inet;
alter table public.time_records add column if not exists adjustment_reason text;
alter table public.time_records add column if not exists approved_at timestamptz;

create table if not exists public.point_schedules (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  entrada time not null default '08:00',
  saida_intervalo time not null default '12:00',
  retorno_intervalo time not null default '14:00',
  saida_final time not null default '18:00',
  tolerance_minutes integer default 30,
  daily_workload_minutes integer default 480,
  work_days jsonb default '["Seg","Ter","Qua","Qui","Sex"]',
  contract_type text,
  manager_id uuid references public.users_profiles(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.point_adjustment_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  time_record_id uuid references public.time_records(id) on delete set null,
  record_date date not null,
  kind text not null,
  requested_time time,
  reason text not null,
  justification text,
  attachment_storage_path text,
  status text default 'pendente',
  approver_id uuid references public.users_profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.point_justifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  time_record_id uuid references public.time_records(id) on delete cascade,
  justification text not null,
  status text default 'pendente',
  reviewer_id uuid references public.users_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Portal/comunicação
alter table public.messages add column if not exists sender_id uuid references public.users_profiles(id) on delete set null;
alter table public.messages add column if not exists sender_name text;
alter table public.messages add column if not exists sender_role text;
alter table public.messages add column if not exists responsible_id uuid references public.users_profiles(id) on delete set null;
alter table public.messages add column if not exists direction text;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists answered_at timestamptz;
alter table public.messages add column if not exists resolved_at timestamptz;
alter table public.messages add column if not exists priority text default 'Média';
alter table public.messages add column if not exists attachments jsonb default '[]';

-- Auditoria reforçada
alter table public.audit_logs add column if not exists previous_data jsonb;
alter table public.audit_logs add column if not exists after_data jsonb;
alter table public.audit_logs add column if not exists ip inet;
alter table public.audit_logs add column if not exists device text;
alter table public.audit_logs add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Índices operacionais
create index if not exists idx_users_profiles_org_role on public.users_profiles(organization_id, role);
create index if not exists idx_processes_org_area_stage on public.processes(organization_id, area, workflow_stage);
create index if not exists idx_tasks_org_responsible_status on public.tasks(organization_id, responsible_id, status);
create index if not exists idx_messages_client_process on public.messages(client_id, process_id, responsible_id);
create index if not exists idx_time_records_employee_date on public.time_records(employee_id, record_date);
create index if not exists idx_point_adjustments_status on public.point_adjustment_requests(organization_id, status);

-- RLS base para novas tabelas
alter table public.units enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.legal_modules enable row level security;
alter table public.process_modules enable row level security;
alter table public.rural_properties enable row level security;
alter table public.module_specialized_data enable row level security;
alter table public.point_schedules enable row level security;
alter table public.point_adjustment_requests enable row level security;
alter table public.point_justifications enable row level security;

-- Políticas simples, isoladas por organization_id. Reexecute com segurança usando DO blocks.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='units' and policyname='units_org_select') then
    create policy units_org_select on public.units for select using (organization_id = public.current_profile_org());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='units' and policyname='units_admin_write') then
    create policy units_admin_write on public.units for all using (public.is_admin_or_partner()) with check (public.is_admin_or_partner() and organization_id = public.current_profile_org());
  end if;
end $$;

do $$ declare tbl text; begin
  foreach tbl in array array['departments','teams','team_members','workflow_templates','workflow_steps','legal_modules','process_modules','rural_properties','module_specialized_data','point_schedules','point_adjustment_requests','point_justifications'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=tbl || '_org_select') then
      execute format('create policy %I on public.%I for select using (organization_id = public.current_profile_org())', tbl || '_org_select', tbl);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=tbl || '_admin_write') then
      execute format('create policy %I on public.%I for all using (public.is_admin_or_partner()) with check (public.is_admin_or_partner() and organization_id = public.current_profile_org())', tbl || '_admin_write', tbl);
    end if;
  end loop;
end $$;
