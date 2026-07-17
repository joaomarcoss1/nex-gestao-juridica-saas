-- Nex Gestão Jurídica v4.2 — Redesign Premium, Multiempresa com Matrícula e Portal por CPF
-- Execute depois da v4.1. Migration incremental, idempotente e segura para bases existentes.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- =========================================================
-- 1) ORGANIZAÇÕES COM MATRÍCULA BASE
-- =========================================================
create sequence if not exists public.company_registration_sequence start with 327 increment by 1;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  registration_code text unique,
  name text not null default 'Empresa sem nome',
  trade_name text,
  document text,
  email text,
  phone text,
  responsible_name text,
  responsible_email text,
  city text,
  state text,
  address text,
  plan text default 'Profissional',
  status text default 'Ativa',
  access_blocked boolean default false,
  blocked_reason text,
  created_by uuid,
  payload jsonb default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations add column if not exists registration_code text;
alter table public.organizations add column if not exists trade_name text;
alter table public.organizations add column if not exists document text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists phone text;
alter table public.organizations add column if not exists responsible_name text;
alter table public.organizations add column if not exists responsible_email text;
alter table public.organizations add column if not exists city text;
alter table public.organizations add column if not exists state text;
alter table public.organizations add column if not exists address text;
alter table public.organizations add column if not exists plan text default 'Profissional';
alter table public.organizations add column if not exists status text default 'Ativa';
alter table public.organizations add column if not exists access_blocked boolean default false;
alter table public.organizations add column if not exists blocked_reason text;
alter table public.organizations add column if not exists created_by uuid;
alter table public.organizations add column if not exists payload jsonb default '{}'::jsonb;
alter table public.organizations add column if not exists archived_at timestamptz;
alter table public.organizations add column if not exists updated_at timestamptz default now();

update public.organizations
set registration_code = concat(nextval('public.company_registration_sequence'), extract(year from now())::int)
where registration_code is null or registration_code = '';

create unique index if not exists organizations_registration_code_uidx on public.organizations (registration_code);
create index if not exists idx_organizations_status_registration on public.organizations (status, access_blocked, registration_code);

-- =========================================================
-- 2) PERFIS, PAPÉIS E COLUNAS DE ISOLAMENTO
-- =========================================================
alter table if exists public.users_profiles add column if not exists permissions jsonb default '{}'::jsonb;
alter table if exists public.users_profiles add column if not exists invitation_status text default 'pendente';
alter table if exists public.users_profiles add column if not exists client_id uuid;
alter table if exists public.users_profiles add column if not exists last_login_at timestamptz;
alter table if exists public.users_profiles add column if not exists active boolean default true;

update public.users_profiles set role = 'admin_master_global' where role = 'admin_master';
update public.users_profiles set role = 'admin_empresa' where role = 'admin';
-- Garante que o usuário principal informado no projeto continue como Admin Master Global após a migração.
update public.users_profiles
set role = 'admin_master_global', active = true
where lower(email) = 'joaomarcosgpp@hotmail.com';

-- Todo dado operacional precisa ter organization_id quando a tabela existir.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'clients','employees','processes','tasks','documents','messages','financial_entries','time_records','payrolls',
    'deadlines','hearings','pricing_proposals','audit_logs','report_exports','integrations','automation_rules',
    'automation_runs','leads','fee_contracts','cost_entries','document_folders','notifications','client_consents',
    'legal_module_records','rural_properties','point_schedules','point_adjustment_requests','point_justifications'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade', tbl);
      execute format('create index if not exists idx_%I_org on public.%I (organization_id)', tbl, tbl);
    end if;
  end loop;
end $$;

-- =========================================================
-- 3) HELPERS RLS PADRÃO NEX
-- =========================================================
create or replace function public.nex_current_profile_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from public.users_profiles where auth_user_id = auth.uid() and active is true order by created_at asc nulls last limit 1;
$$;

create or replace function public.nex_current_org_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select organization_id from public.users_profiles where auth_user_id = auth.uid() and active is true order by created_at asc nulls last limit 1;
$$;

create or replace function public.nex_current_role()
returns text language sql stable security definer set search_path = public, auth as $$
  select coalesce((select role from public.users_profiles where auth_user_id = auth.uid() and active is true order by created_at asc nulls last limit 1), 'anon');
$$;

create or replace function public.nex_is_global_master()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master');
$$;

create or replace function public.nex_is_company_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_empresa','admin','socio');
$$;

create or replace function public.nex_has_permission(permission_key text)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.nex_is_global_master(), false)
    or coalesce((select (permissions ? permission_key) and (permissions ->> permission_key)::boolean from public.users_profiles where id = public.nex_current_profile_id()), false);
$$;

create or replace function public.nex_can_access_org(org_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.nex_is_global_master(), false)
    or org_id = public.nex_current_org_id();
$$;

grant execute on function public.nex_current_profile_id() to authenticated;
grant execute on function public.nex_current_org_id() to authenticated;
grant execute on function public.nex_current_role() to authenticated;
grant execute on function public.nex_is_global_master() to authenticated;
grant execute on function public.nex_is_company_admin() to authenticated;
grant execute on function public.nex_has_permission(text) to authenticated;
grant execute on function public.nex_can_access_org(uuid) to authenticated;

-- =========================================================
-- 4) RPC DE CRIAÇÃO DE EMPRESA + ADMIN PENDENTE
-- =========================================================
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
set search_path = public, auth
as $$
declare
  v_company public.organizations%rowtype;
  v_registration text;
  v_admin_id uuid;
begin
  if not public.nex_is_global_master() then
    raise exception 'Apenas Admin Master Global pode criar empresas.';
  end if;

  v_registration := concat(nextval('public.company_registration_sequence'), extract(year from now())::int);

  insert into public.organizations (
    registration_code, name, trade_name, document, email, phone, city, state, address,
    plan, status, access_blocked, responsible_name, responsible_email, created_by
  ) values (
    v_registration, nullif(trim(p_company_name), ''), nullif(trim(p_trade_name), ''), p_document, p_email, p_phone,
    p_city, p_state, p_address, 'Profissional', 'Ativa', false, p_admin_name, p_admin_email, public.nex_current_profile_id()
  ) returning * into v_company;

  insert into public.users_profiles (organization_id, name, email, role, sector, active, invitation_status, permissions)
  values (v_company.id, p_admin_name, lower(trim(p_admin_email)), 'admin_empresa', 'Administração', true, 'pendente', '{}'::jsonb)
  returning id into v_admin_id;

  insert into public.audit_logs (organization_id, module, action, entity_id, user_id, after_data, created_at)
  values (v_company.id, 'Empresas', 'create_company_with_admin', v_company.id, public.nex_current_profile_id(), jsonb_build_object('registration_code', v_registration, 'admin_id', v_admin_id), now())
  on conflict do nothing;

  return jsonb_build_object('company', to_jsonb(v_company), 'registration_code', v_registration, 'admin_profile_id', v_admin_id);
end;
$$;

grant execute on function public.create_company_with_admin(text,text,text,text,text,text,text,text,text,text) to authenticated;

-- =========================================================
-- 5) PORTAL DO CLIENTE POR NOME COMPLETO + CPF
-- =========================================================
create or replace function public.client_portal_by_name_cpf(p_full_name text, p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_count int;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_name text := lower(unaccent(regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g')));
begin
  select count(*) into v_count
  from public.clients c
  where lower(unaccent(regexp_replace(trim(c.name), '\s+', ' ', 'g'))) = v_name
    and regexp_replace(coalesce(c.document, ''), '\D', '', 'g') = v_cpf
    and coalesce(c.archived_at, null) is null;

  if v_count = 0 then
    raise exception 'Cliente não encontrado. Confira nome completo e CPF.';
  elsif v_count > 1 then
    raise exception 'Mais de um cadastro encontrado. Entre em contato com o escritório.';
  end if;

  select * into v_client
  from public.clients c
  where lower(unaccent(regexp_replace(trim(c.name), '\s+', ' ', 'g'))) = v_name
    and regexp_replace(coalesce(c.document, ''), '\D', '', 'g') = v_cpf
    and coalesce(c.archived_at, null) is null
  limit 1;

  insert into public.audit_logs (organization_id, module, action, entity_id, after_data, created_at)
  values (v_client.organization_id, 'Portal do Cliente', 'client_login_name_cpf', v_client.id, jsonb_build_object('client_name', v_client.name), now())
  on conflict do nothing;

  return jsonb_build_object(
    'organizationId', v_client.organization_id,
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.name, 'email', v_client.email, 'phone', coalesce(v_client.phone, v_client.whatsapp))
  );
end;
$$;

grant execute on function public.client_portal_by_name_cpf(text,text) to anon, authenticated;

-- =========================================================
-- 6) RLS MULTIEMPRESA — POLICIES IDPOTENTES
-- =========================================================
alter table public.organizations enable row level security;
drop policy if exists organizations_v42_select on public.organizations;
drop policy if exists organizations_v42_insert on public.organizations;
drop policy if exists organizations_v42_update on public.organizations;
create policy organizations_v42_select on public.organizations for select using (public.nex_is_global_master() or id = public.nex_current_org_id());
create policy organizations_v42_insert on public.organizations for insert with check (public.nex_is_global_master());
create policy organizations_v42_update on public.organizations for update using (public.nex_is_global_master() or id = public.nex_current_org_id()) with check (public.nex_is_global_master() or id = public.nex_current_org_id());

-- Proteção genérica: global master acessa tudo; demais somente organization_id atual.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'users_profiles','clients','employees','processes','tasks','documents','messages','financial_entries','time_records','payrolls',
    'deadlines','hearings','pricing_proposals','audit_logs','report_exports','integrations','automation_rules','automation_runs','leads',
    'fee_contracts','cost_entries','document_folders','notifications','client_consents','legal_module_records','rural_properties',
    'point_schedules','point_adjustment_requests','point_justifications'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_v42_select_org', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_v42_insert_org', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_v42_update_org', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_v42_delete_org', tbl);
      execute format('create policy %I on public.%I for select using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', tbl || '_v42_select_org', tbl);
      execute format('create policy %I on public.%I for insert with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', tbl || '_v42_insert_org', tbl);
      execute format('create policy %I on public.%I for update using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', tbl || '_v42_update_org', tbl);
      execute format('create policy %I on public.%I for delete using (public.nex_is_global_master())', tbl || '_v42_delete_org', tbl);
    end if;
  end loop;
end $$;

-- Garante que o primeiro usuário informado vire Admin Master Global, caso ainda não exista.
insert into public.users_profiles (organization_id, name, email, role, sector, active, invitation_status, permissions)
select (select id from public.organizations order by created_at asc limit 1), 'João Marcos Gomes Pereira', 'joaomarcosgpp@hotmail.com', 'admin_master_global', 'Diretoria NexLabs', true, 'ativo', '{}'::jsonb
where not exists (select 1 from public.users_profiles where role in ('admin_master_global','admin_master'));

-- Marca matrícula demo em organizações antigas sem matrícula visível.
update public.organizations set registration_code = concat(nextval('public.company_registration_sequence'), extract(year from now())::int) where registration_code is null or registration_code = '';
