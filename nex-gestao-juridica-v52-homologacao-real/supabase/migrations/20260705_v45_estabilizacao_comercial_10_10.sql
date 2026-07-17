-- Nex Gestão Jurídica v4.5 — Estabilização Comercial 10/10
-- Migration idempotente para Supabase: helpers, tabelas críticas, RLS, auditoria, portal e índices.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  registration_code text unique,
  name text not null default '',
  trade_name text,
  document text,
  email text,
  phone text,
  responsible_name text,
  responsible_email text,
  city text,
  state text,
  address text,
  plan text not null default 'Profissional',
  status text not null default 'Ativa',
  access_blocked boolean not null default false,
  blocked_reason text,
  created_by uuid,
  payload jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null default '',
  email text,
  phone text,
  cpf text,
  role text not null default 'funcionario',
  sector text,
  oab text,
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_registration_sequence (
  id integer primary key default 1,
  current_value integer not null default 327,
  updated_at timestamptz not null default now(),
  constraint one_company_registration_sequence check (id = 1)
);
insert into public.company_registration_sequence (id, current_value)
values (1, 326)
on conflict (id) do nothing;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_profile_id uuid references public.users_profiles(id) on delete set null,
  auth_user_id uuid,
  module text not null default 'sistema',
  action text not null default 'evento',
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_access_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  client_id uuid,
  full_name text,
  cpf text,
  success boolean not null default false,
  reason text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  report_name text not null,
  filters jsonb not null default '{}'::jsonb,
  format text not null default 'pdf',
  exported_by uuid,
  exported_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create or replace function public.nex_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.users_profiles p where p.auth_user_id = auth.uid() and p.active is true limit 1;
$$;

create or replace function public.nex_current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id from public.users_profiles p where p.auth_user_id = auth.uid() and p.active is true limit 1;
$$;

create or replace function public.nex_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.role, '') from public.users_profiles p where p.auth_user_id = auth.uid() and p.active is true limit 1;
$$;

create or replace function public.nex_is_global_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.nex_current_role() in ('admin_master', 'admin_master_global'), false);
$$;

create or replace function public.nex_is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.nex_current_role() in ('admin', 'admin_empresa'), false);
$$;

create or replace function public.nex_has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.nex_is_global_master(), false)
    or coalesce((select (p.permissions ->> permission_key)::boolean from public.users_profiles p where p.auth_user_id = auth.uid() and p.active is true limit 1), false);
$$;

create or replace function public.nex_can_access_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.nex_is_global_master(), false)
    or (org_id is not null and org_id = public.nex_current_org_id());
$$;

create or replace function public.nex_generate_company_registration()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value integer;
begin
  update public.company_registration_sequence
     set current_value = current_value + 1, updated_at = now()
   where id = 1
   returning current_value into next_value;
  if next_value is null then
    insert into public.company_registration_sequence (id, current_value) values (1, 327)
    on conflict (id) do update set current_value = public.company_registration_sequence.current_value + 1
    returning current_value into next_value;
  end if;
  return next_value::text || extract(year from now())::int::text;
end;
$$;

create or replace function public.create_company_with_admin(
  p_company_name text,
  p_trade_name text,
  p_document text,
  p_email text,
  p_phone text,
  p_city text,
  p_state text,
  p_address text,
  p_admin_name text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_registration text;
begin
  if not public.nex_is_global_master() then
    raise exception 'Apenas Admin Master Global pode criar empresas';
  end if;
  v_registration := public.nex_generate_company_registration();
  insert into public.organizations (registration_code, name, trade_name, document, email, phone, city, state, address, responsible_name, responsible_email, created_by)
  values (v_registration, p_company_name, coalesce(p_trade_name, p_company_name), p_document, p_email, p_phone, p_city, p_state, p_address, p_admin_name, p_admin_email, public.nex_current_profile_id())
  returning id into v_company_id;

  insert into public.users_profiles (organization_id, name, email, role, active, permissions)
  values (v_company_id, p_admin_name, p_admin_email, 'admin_empresa', true, '{"dashboard.view":true,"clients.view":true,"clients.create":true,"processes.view":true,"processes.create":true,"tasks.view":true,"reports.view":true,"users.view":true}'::jsonb)
  returning id into v_profile_id;

  insert into public.audit_logs (organization_id, user_profile_id, module, action, entity_id, after_data)
  values (v_company_id, public.nex_current_profile_id(), 'empresas', 'create_company_with_admin', v_company_id::text, jsonb_build_object('registration_code', v_registration, 'admin_profile_id', v_profile_id));

  return jsonb_build_object('organization_id', v_company_id, 'registration_code', v_registration, 'admin_profile_id', v_profile_id);
end;
$$;

create or replace function public.client_portal_by_name_cpf(p_full_name text, p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client record;
  v_total integer;
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\\D', '', 'g');
begin
  select count(*) into v_total
  from public.clients c
  where regexp_replace(coalesce(c.document,''), '\\D', '', 'g') = v_cpf
    and lower(trim(c.name)) = lower(trim(p_full_name))
    and c.archived_at is null;

  if v_total = 0 then
    insert into public.portal_access_logs (full_name, cpf, success, reason) values (p_full_name, v_cpf, false, 'cliente_nao_encontrado');
    return jsonb_build_object('ok', false, 'message', 'Cliente não encontrado. Verifique os dados informados.');
  end if;
  if v_total > 1 then
    insert into public.portal_access_logs (full_name, cpf, success, reason) values (p_full_name, v_cpf, false, 'cadastro_duplicado');
    return jsonb_build_object('ok', false, 'message', 'Encontramos mais de um cadastro com esses dados. Entre em contato com o escritório.');
  end if;

  select c.* into v_client
  from public.clients c
  where regexp_replace(coalesce(c.document,''), '\\D', '', 'g') = v_cpf
    and lower(trim(c.name)) = lower(trim(p_full_name))
    and c.archived_at is null
  limit 1;

  insert into public.portal_access_logs (organization_id, client_id, full_name, cpf, success, reason)
  values (v_client.organization_id, v_client.id, p_full_name, v_cpf, true, 'acesso_autorizado');

  return jsonb_build_object(
    'ok', true,
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.name, 'organization_id', v_client.organization_id),
    'message', 'Acesso autorizado.'
  );
end;
$$;

-- Garante colunas multiempresa críticas em tabelas existentes.
do $$
declare
  t text;
begin
  foreach t in array array['employees','clients','leads','processes','deadlines','tasks','financial_entries','time_records','documents','messages','automation_rules','automation_runs','pricing_proposals','payrolls','integrations','hearings','client_consents','payment_receipts','report_exports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete set null', t);
      execute format('alter table public.%I add column if not exists archived_at timestamptz', t);
      execute format('create index if not exists %I on public.%I (organization_id)', 'idx_' || t || '_organization_id', t);
      execute format('create index if not exists %I on public.%I (archived_at)', 'idx_' || t || '_archived_at', t);
    end if;
  end loop;
end $$;

create index if not exists idx_users_profiles_auth_user_id on public.users_profiles(auth_user_id);
create index if not exists idx_users_profiles_org on public.users_profiles(organization_id);
create index if not exists idx_organizations_registration_code on public.organizations(registration_code);
create index if not exists idx_audit_logs_org_created on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_portal_access_logs_org_created on public.portal_access_logs(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.users_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.portal_access_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.report_exports enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['employees','clients','leads','processes','deadlines','tasks','financial_entries','time_records','documents','messages','automation_rules','automation_runs','pricing_proposals','payrolls','integrations','hearings','client_consents','payment_receipts','report_exports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Políticas idempotentes: recria para evitar conflito de versões antigas.
do $$
declare
  r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and policyname like 'nex_v45_%' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy nex_v45_organizations_select on public.organizations for select using (public.nex_is_global_master() or id = public.nex_current_org_id());
create policy nex_v45_organizations_insert on public.organizations for insert with check (public.nex_is_global_master());
create policy nex_v45_organizations_update on public.organizations for update using (public.nex_is_global_master()) with check (public.nex_is_global_master());

create policy nex_v45_profiles_select on public.users_profiles for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id() or auth_user_id = auth.uid());
create policy nex_v45_profiles_insert on public.users_profiles for insert with check (public.nex_is_global_master() or (public.nex_is_company_admin() and organization_id = public.nex_current_org_id()));
create policy nex_v45_profiles_update on public.users_profiles for update using (public.nex_is_global_master() or (public.nex_is_company_admin() and organization_id = public.nex_current_org_id()) or auth_user_id = auth.uid()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id() or auth_user_id = auth.uid());

create policy nex_v45_audit_select on public.audit_logs for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
create policy nex_v45_audit_insert on public.audit_logs for insert with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
create policy nex_v45_portal_logs_select on public.portal_access_logs for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
create policy nex_v45_portal_logs_insert on public.portal_access_logs for insert with check (true);
create policy nex_v45_settings_select on public.app_settings for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
create policy nex_v45_settings_all on public.app_settings for all using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());
create policy nex_v45_report_exports_all on public.report_exports for all using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id());

-- Políticas genéricas para tabelas operacionais que existem no banco.
do $$
declare
  t text;
begin
  foreach t in array array['employees','clients','leads','processes','deadlines','tasks','financial_entries','time_records','documents','messages','automation_rules','automation_runs','pricing_proposals','payrolls','integrations','hearings','client_consents','payment_receipts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', 'nex_v45_' || t || '_select', t);
      execute format('drop policy if exists %I on public.%I', 'nex_v45_' || t || '_insert', t);
      execute format('drop policy if exists %I on public.%I', 'nex_v45_' || t || '_update', t);
      execute format('drop policy if exists %I on public.%I', 'nex_v45_' || t || '_delete', t);
      execute format('create policy %I on public.%I for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', 'nex_v45_' || t || '_select', t);
      execute format('create policy %I on public.%I for insert with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', 'nex_v45_' || t || '_insert', t);
      execute format('create policy %I on public.%I for update using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', 'nex_v45_' || t || '_update', t);
      execute format('create policy %I on public.%I for delete using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', 'nex_v45_' || t || '_delete', t);
    end if;
  end loop;
end $$;

-- Storage seguro para documentos, se o schema storage estiver disponível.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('documentos', 'documentos', false)
    on conflict (id) do nothing;
  end if;
end $$;

comment on function public.client_portal_by_name_cpf(text, text) is 'Acesso seguro do portal do cliente por nome completo e CPF, sem expor painel interno.';
comment on function public.create_company_with_admin(text,text,text,text,text,text,text,text,text,text) is 'Cria empresa multiempresa com matrícula base e admin inicial pendente.';
