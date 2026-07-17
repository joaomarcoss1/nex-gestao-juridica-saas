-- Nex Gestão Jurídica v4.4 — Correção Supabase/RLS e tabelas opcionais
-- Execute depois da v4.3/v4.2. Migration idempotente para bases que ficaram com migrations parciais.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

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

create table if not exists public.users_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  auth_user_id uuid,
  name text,
  email text,
  role text default 'funcionario',
  sector text,
  phone text,
  cpf text,
  oab text,
  permissions jsonb default '{}'::jsonb,
  client_id uuid,
  active boolean default true,
  invitation_status text default 'pendente',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users_profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.users_profiles add column if not exists auth_user_id uuid;
alter table public.users_profiles add column if not exists name text;
alter table public.users_profiles add column if not exists email text;
alter table public.users_profiles add column if not exists role text default 'funcionario';
alter table public.users_profiles add column if not exists sector text;
alter table public.users_profiles add column if not exists phone text;
alter table public.users_profiles add column if not exists cpf text;
alter table public.users_profiles add column if not exists oab text;
alter table public.users_profiles add column if not exists permissions jsonb default '{}'::jsonb;
alter table public.users_profiles add column if not exists client_id uuid;
alter table public.users_profiles add column if not exists active boolean default true;
alter table public.users_profiles add column if not exists invitation_status text default 'pendente';
alter table public.users_profiles add column if not exists updated_at timestamptz default now();

update public.users_profiles set role = 'admin_master_global' where role = 'admin_master';
update public.users_profiles set role = 'admin_empresa' where role = 'admin';
update public.users_profiles set role = 'admin_master_global', active = true where lower(email) = 'joaomarcosgpp@hotmail.com';

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

create or replace function public.nex_current_client_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select client_id from public.users_profiles where auth_user_id = auth.uid() and active is true order by created_at asc nulls last limit 1;
$$;

create or replace function public.nex_is_global_master()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master');
$$;

create or replace function public.nex_is_company_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_empresa','admin','socio');
$$;

-- Aliases para policies antigas das versões v36/v37/v38 que ainda podem existir no banco.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_profile_id();
$$;

create or replace function public.current_profile_org()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_org_id();
$$;

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public, auth as $$
  select case public.nex_current_role()
    when 'admin_master_global' then 'admin_master'
    when 'admin_empresa' then 'admin'
    else public.nex_current_role()
  end;
$$;

create or replace function public.current_profile_client_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_client_id();
$$;

create or replace function public.is_admin_master()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_is_global_master();
$$;

create or replace function public.is_admin_or_partner()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master','admin_empresa','admin','socio');
$$;

create or replace function public.can_access_financial()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master','admin_empresa','admin','socio','financeiro');
$$;

create or replace function public.can_access_hr()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master','admin_empresa','admin','socio','rh');
$$;

create or replace function public.can_access_process(process_responsible uuid default null)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master','admin_empresa','admin','socio','advogado','controladoria') or process_responsible = public.nex_current_profile_id();
$$;

create or replace function public.can_access_client(client_responsible uuid default null)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master_global','admin_master','admin_empresa','admin','socio','atendimento','advogado','controladoria','financeiro') or client_responsible = public.nex_current_profile_id();
$$;

grant execute on function public.nex_current_profile_id() to authenticated;
grant execute on function public.nex_current_org_id() to authenticated;
grant execute on function public.nex_current_role() to authenticated;
grant execute on function public.nex_current_client_id() to authenticated;
grant execute on function public.nex_is_global_master() to authenticated;
grant execute on function public.nex_is_company_admin() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_profile_org() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_client_id() to authenticated;
grant execute on function public.is_admin_master() to authenticated;
grant execute on function public.is_admin_or_partner() to authenticated;
grant execute on function public.can_access_financial() to authenticated;
grant execute on function public.can_access_hr() to authenticated;
grant execute on function public.can_access_process(uuid) to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;

-- Tabelas opcionais usadas pelo frontend enterprise. Caso alguma migration antiga não tenha criado,
-- esta migration cria um fallback seguro baseado em payload para evitar erro de schema cache/relation not found.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'units','departments','teams','team_members','workflow_templates','workflow_steps','legal_module_records',
    'rural_properties','document_folders','document_versions','document_templates','fee_contracts','cost_entries',
    'point_schedules','point_adjustment_requests','point_justifications','notifications','automation_runs',
    'client_consents','payment_receipts','report_exports'
  ] loop
    if to_regclass('public.' || tbl) is null then
      execute format('create table public.%I (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade, payload jsonb default ''{}''::jsonb, archived_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now())', tbl);
    end if;
    execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade', tbl);
    execute format('alter table public.%I add column if not exists payload jsonb default ''{}''::jsonb', tbl);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', tbl);
    execute format('alter table public.%I add column if not exists created_at timestamptz default now()', tbl);
    execute format('alter table public.%I add column if not exists updated_at timestamptz default now()', tbl);
    execute format('create index if not exists idx_%I_org_v44 on public.%I(organization_id)', tbl, tbl);
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_v44_select_org', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_v44_write_org', tbl);
    execute format('create policy %I on public.%I for select to authenticated using (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', tbl || '_v44_select_org', tbl);
    execute format('create policy %I on public.%I for all to authenticated using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id())', tbl || '_v44_write_org', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
  end loop;
end $$;

-- RLS base para organizations/users_profiles, corrigindo Admin Master Global em bases antigas.
alter table public.organizations enable row level security;
alter table public.users_profiles enable row level security;

drop policy if exists organizations_v44_select on public.organizations;
create policy organizations_v44_select on public.organizations for select to authenticated using (public.nex_is_global_master() or id = public.nex_current_org_id());

drop policy if exists organizations_v44_write on public.organizations;
create policy organizations_v44_write on public.organizations for all to authenticated using (public.nex_is_global_master() or id = public.nex_current_org_id()) with check (public.nex_is_global_master() or id = public.nex_current_org_id());

drop policy if exists users_profiles_v44_select on public.users_profiles;
create policy users_profiles_v44_select on public.users_profiles for select to authenticated using (public.nex_is_global_master() or organization_id = public.nex_current_org_id() or auth_user_id = auth.uid());

drop policy if exists users_profiles_v44_write on public.users_profiles;
create policy users_profiles_v44_write on public.users_profiles for all to authenticated using (public.nex_is_global_master() or organization_id = public.nex_current_org_id()) with check (public.nex_is_global_master() or organization_id = public.nex_current_org_id() or auth_user_id = auth.uid());

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.users_profiles to authenticated;
