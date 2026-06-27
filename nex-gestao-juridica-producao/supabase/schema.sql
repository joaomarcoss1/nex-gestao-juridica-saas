-- Nex Gestão Jurídica - Supabase/PostgreSQL schema
-- Execute este arquivo em Supabase > SQL Editor para criar as tabelas iniciais.
-- Inclui CRM, processos, controladoria, tarefas, financeiro, ponto, folha, documentos,
-- protocolos, assinaturas, portal, comunicação, automações internas, integrações e auditoria.

create extension if not exists "uuid-ossp";

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  trade_name text,
  document text,
  city text,
  state text,
  created_at timestamptz default now()
);

create table if not exists users_profiles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  auth_user_id uuid,
  name text not null,
  email text,
  phone text,
  cpf text,
  role text not null default 'funcionario',
  sector text,
  oab text,
  active boolean default true,
  permissions jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  profile_id uuid references users_profiles(id),
  name text not null,
  cpf text,
  rg text,
  cargo text,
  setor text,
  tipo_vinculo text,
  salario_base numeric(14,2) default 0,
  valor_hora numeric(14,2) default 0,
  jornada jsonb default '{}',
  pin_hash text,
  status text default 'ativo',
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  type text check (type in ('PF','PJ')) default 'PF',
  name text not null,
  document text,
  email text,
  phone text,
  whatsapp text,
  address jsonb default '{}',
  origin text,
  status text default 'ativo',
  responsible_id uuid references users_profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  origin text,
  area text,
  demand_type text,
  city text,
  stage text default 'Novo lead',
  estimated_value numeric(14,2) default 0,
  responsible_id uuid references users_profiles(id),
  next_contact date,
  loss_reason text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists processes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  client_id uuid references clients(id),
  cnj text,
  court text,
  court_unit text,
  class_processual text,
  area text,
  type text,
  opposite_party text,
  phase text,
  status text,
  risk text,
  success_chance integer default 0,
  claim_value numeric(14,2) default 0,
  fees_value numeric(14,2) default 0,
  responsible_id uuid references users_profiles(id),
  started_at date,
  expected_end_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists process_movements (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid references processes(id) on delete cascade,
  source text,
  movement_date timestamptz,
  description text,
  classified_as text,
  created_at timestamptz default now()
);

create table if not exists summons_intimations (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid references processes(id) on delete cascade,
  source text,
  content text,
  classification text,
  risk text,
  deadline date,
  responsible_id uuid references users_profiles(id),
  status text default 'pendente',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  process_id uuid references processes(id),
  client_id uuid references clients(id),
  title text not null,
  description text,
  responsible_id uuid references users_profiles(id),
  sector text,
  priority text default 'Média',
  status text default 'Pendente',
  due_at timestamptz,
  estimated_hours numeric(10,2) default 0,
  spent_hours numeric(10,2) default 0,
  checklist jsonb default '[]',
  attachments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workflows (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  trigger_event text,
  rules jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);



create table if not exists automation_rules (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  module text not null,
  trigger_event text not null,
  conditions jsonb default '{}',
  actions jsonb default '[]',
  status text default 'ativa',
  last_run_at timestamptz,
  executions integer default 0,
  success_rate numeric(5,2) default 100,
  created_by uuid references users_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists automation_runs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  automation_rule_id uuid references automation_rules(id) on delete cascade,
  status text default 'sucesso',
  result text,
  input_payload jsonb default '{}',
  output_payload jsonb default '{}',
  executed_by uuid references users_profiles(id),
  executed_at timestamptz default now()
);

create table if not exists financial_entries (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  client_id uuid references clients(id),
  process_id uuid references processes(id),
  type text check (type in ('receita','despesa')) not null,
  category text,
  cost_center text,
  bank_account text,
  amount numeric(14,2) not null default 0,
  due_date date,
  paid_date date,
  status text default 'pendente',
  method text,
  receipt_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists pricing_proposals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  lead_id uuid references leads(id),
  client_id uuid references clients(id),
  process_id uuid references processes(id),
  area text,
  service_type text,
  fixed_costs jsonb default '{}',
  variable_costs jsonb default '{}',
  labor jsonb default '{}',
  legal_factors jsonb default '{}',
  real_cost numeric(14,2) default 0,
  minimum_value numeric(14,2) default 0,
  recommended_value numeric(14,2) default 0,
  premium_value numeric(14,2) default 0,
  entry_value numeric(14,2) default 0,
  installments jsonb default '[]',
  success_fee text,
  status text default 'rascunho',
  created_at timestamptz default now()
);

create table if not exists time_records (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  record_date date not null,
  record_time time not null,
  kind text not null,
  status text default 'normal',
  mode text default 'presencial',
  location jsonb default '{}',
  device text,
  ip text,
  justification text,
  approved_by uuid references users_profiles(id),
  created_at timestamptz default now()
);

create table if not exists time_adjust_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id),
  requested_date date,
  requested_time time,
  kind text,
  reason text,
  status text default 'pendente',
  reviewed_by uuid references users_profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists payrolls (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  employee_id uuid references employees(id),
  period_month integer,
  period_year integer,
  gross_value numeric(14,2) default 0,
  discounts numeric(14,2) default 0,
  benefits numeric(14,2) default 0,
  net_value numeric(14,2) default 0,
  status text default 'rascunho',
  details jsonb default '{}',
  signed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  client_id uuid references clients(id),
  process_id uuid references processes(id),
  name text not null,
  type text,
  status text default 'recebido',
  origin text,
  version text default 'v1',
  file_url text,
  ocr_text text,
  responsible_id uuid references users_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_versions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade,
  version text,
  content text,
  file_url text,
  created_by uuid references users_profiles(id),
  created_at timestamptz default now()
);

create table if not exists protocols (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid references processes(id),
  document_id uuid references documents(id),
  protocol_number text,
  body text,
  protocol_date timestamptz,
  responsible_id uuid references users_profiles(id),
  status text default 'pendente',
  receipt_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists signatures (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id),
  signer_name text,
  signer_role text,
  signer_email text,
  status text default 'solicitada',
  signature_payload jsonb default '{}',
  ip text,
  device text,
  signed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  client_id uuid references clients(id),
  process_id uuid references processes(id),
  channel text,
  subject text,
  body text,
  status text default 'pendente',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users_profiles(id),
  title text,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists nex_scores (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id),
  period_start date,
  period_end date,
  score integer default 0,
  metrics jsonb default '{}',
  classification text,
  created_at timestamptz default now()
);

create table if not exists saved_reports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  module text,
  filters jsonb default '{}',
  created_by uuid references users_profiles(id),
  created_at timestamptz default now()
);

create table if not exists integrations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  provider text not null,
  status text default 'desconectado',
  config jsonb default '{}',
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users_profiles(id),
  module text,
  action text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip text,
  device text,
  created_at timestamptz default now()
);

-- Índices principais
create index if not exists idx_clients_org on clients(organization_id);
create index if not exists idx_leads_stage on leads(stage);
create index if not exists idx_processes_org_status on processes(organization_id, status);
create index if not exists idx_tasks_due_status on tasks(due_at, status);
create index if not exists idx_financial_due_status on financial_entries(due_date, status);
create index if not exists idx_time_records_employee_date on time_records(employee_id, record_date);
create index if not exists idx_documents_process on documents(process_id);
create index if not exists idx_automation_rules_org_status on automation_rules(organization_id, status);
create index if not exists idx_automation_runs_rule on automation_runs(automation_rule_id, executed_at);

-- RLS inicial: habilitar quando usar Supabase Auth em produção.
-- alter table clients enable row level security;
-- alter table processes enable row level security;
-- alter table tasks enable row level security;
-- alter table financial_entries enable row level security;
-- alter table automation_rules enable row level security;
-- alter table automation_runs enable row level security;

-- Snapshot operacional usado pelo front-end como persistência imediata em modo produção.
-- As tabelas normalizadas acima permanecem prontas para evolução por módulo.
create table if not exists app_state_snapshots (
  id uuid primary key,
  company_id uuid references organizations(id) on delete cascade,
  state jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_app_state_company on app_state_snapshots(company_id);

-- Scanner do Portal do Cliente: campos técnicos para documento digitalizado
alter table documents add column if not exists file_name text;
alter table documents add column if not exists mime_type text;
alter table documents add column if not exists file_size_bytes bigint;
alter table documents add column if not exists storage_path text;
alter table documents add column if not exists sha256_hash text;
alter table documents add column if not exists scanner_metadata jsonb default '{}';
create index if not exists idx_documents_sha256 on documents(sha256_hash);
create index if not exists idx_documents_storage_path on documents(storage_path);

-- Bucket de documentos no Supabase Storage. Execute com permissão de owner/service role no SQL Editor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Evolução SaaS completa: prazos, soft delete, logs e campos operacionais
create table if not exists deadlines (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  process_id uuid references processes(id),
  client_id uuid references clients(id),
  type text not null,
  responsible_id uuid references users_profiles(id),
  publication_date date,
  awareness_date date,
  start_date date,
  days integer default 0,
  count_type text default 'Dias úteis',
  due_date date,
  fatal boolean default false,
  priority text default 'Média',
  status text default 'pendente',
  proof text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_deadlines_org_due on deadlines(organization_id, due_date, status);

alter table employees add column if not exists archived_at timestamptz;
alter table clients add column if not exists archived_at timestamptz;
alter table leads add column if not exists archived_at timestamptz;
alter table processes add column if not exists archived_at timestamptz;
alter table tasks add column if not exists archived_at timestamptz;
alter table financial_entries add column if not exists archived_at timestamptz;
alter table time_records add column if not exists archived_at timestamptz;
alter table documents add column if not exists archived_at timestamptz;
alter table protocols add column if not exists archived_at timestamptz;
alter table signatures add column if not exists archived_at timestamptz;
alter table messages add column if not exists archived_at timestamptz;
alter table automation_rules add column if not exists archived_at timestamptz;
alter table automation_runs add column if not exists archived_at timestamptz;
alter table pricing_proposals add column if not exists archived_at timestamptz;
alter table payrolls add column if not exists archived_at timestamptz;
alter table integrations add column if not exists archived_at timestamptz;

alter table employees add column if not exists email text;
alter table employees add column if not exists phone text;
alter table employees add column if not exists oab text;
alter table financial_entries add column if not exists paid_amount numeric(14,2);
alter table financial_entries add column if not exists recurrence text;
alter table financial_entries add column if not exists installment integer default 1;
alter table financial_entries add column if not exists installments integer default 1;
alter table financial_entries add column if not exists attachment text;
alter table processes add column if not exists last_move_days integer default 0;
alter table processes add column if not exists progress integer default 0;
alter table tasks add column if not exists comments jsonb default '[]';
alter table automation_rules add column if not exists description text;
alter table automation_rules add column if not exists recurrence text default 'Evento';
alter table automation_rules add column if not exists next_run_at timestamptz;
alter table automation_rules add column if not exists failures integer default 0;
alter table automation_rules add column if not exists responsible_id uuid references users_profiles(id);
alter table pricing_proposals add column if not exists title text;
alter table pricing_proposals add column if not exists version text default 'v1';
alter table pricing_proposals add column if not exists oab_state text;
alter table pricing_proposals add column if not exists oab_year integer;
alter table payrolls add column if not exists base_salary numeric(14,2) default 0;
alter table documents add column if not exists rejection_comment text;
alter table integrations add column if not exists description text;

create table if not exists automation_conditions (
  id uuid primary key default uuid_generate_v4(),
  automation_rule_id uuid references automation_rules(id) on delete cascade,
  field text,
  operator text,
  value text,
  created_at timestamptz default now()
);
create table if not exists automation_actions (
  id uuid primary key default uuid_generate_v4(),
  automation_rule_id uuid references automation_rules(id) on delete cascade,
  action_type text,
  params jsonb default '{}',
  created_at timestamptz default now()
);
create table if not exists automation_run_logs (
  id uuid primary key default uuid_generate_v4(),
  automation_run_id uuid references automation_runs(id) on delete cascade,
  level text default 'info',
  message text,
  payload jsonb default '{}',
  created_at timestamptz default now()
);
create table if not exists payroll_items (
  id uuid primary key default uuid_generate_v4(),
  payroll_id uuid references payrolls(id) on delete cascade,
  type text,
  description text,
  amount numeric(14,2) default 0,
  created_at timestamptz default now()
);
create table if not exists employee_benefits (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  description text,
  amount numeric(14,2) default 0,
  active boolean default true
);
create table if not exists employee_discounts (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  description text,
  amount numeric(14,2) default 0,
  active boolean default true
);
