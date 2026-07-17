-- Nex Gestão Jurídica v4.6 — Validação Comercial, Onboarding e Stripe
-- Migration idempotente para preparar cobrança recorrente, diagnóstico comercial e isolamento multiempresa.

create extension if not exists pgcrypto;

alter table if exists public.organizations add column if not exists stripe_customer_id text;
alter table if exists public.organizations add column if not exists stripe_subscription_id text;
alter table if exists public.organizations add column if not exists subscription_status text default 'trialing';
alter table if exists public.organizations add column if not exists billing_email text;
alter table if exists public.organizations add column if not exists onboarding_completed_at timestamptz;
alter table if exists public.organizations add column if not exists commercial_readiness_score integer default 0;
alter table if exists public.organizations add column if not exists brand_settings jsonb default '{}'::jsonb;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null default 'stripe',
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'pro',
  status text not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_end timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(provider, stripe_subscription_id)
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null default 'stripe',
  stripe_invoice_id text,
  stripe_customer_id text,
  status text,
  amount_due numeric(14,2) default 0,
  amount_paid numeric(14,2) default 0,
  currency text default 'brl',
  due_date timestamptz,
  hosted_invoice_url text,
  invoice_pdf text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(provider, stripe_invoice_id)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null default 'stripe',
  provider_event_id text,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz default now(),
  unique(provider, provider_event_id)
);

create table if not exists public.commercial_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  check_key text not null,
  label text not null,
  status text not null default 'pending',
  details jsonb default '{}'::jsonb,
  checked_at timestamptz default now(),
  unique(organization_id, check_key)
);

create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  step_key text not null,
  title text not null,
  status text not null default 'pending',
  completed_at timestamptz,
  completed_by uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, step_key)
);

create index if not exists idx_billing_subscriptions_org on public.billing_subscriptions(organization_id);
create index if not exists idx_billing_subscriptions_customer on public.billing_subscriptions(stripe_customer_id);
create index if not exists idx_billing_invoices_org on public.billing_invoices(organization_id);
create index if not exists idx_payment_events_org_type on public.payment_events(organization_id, event_type);
create index if not exists idx_organizations_stripe_customer on public.organizations(stripe_customer_id);

create or replace function public.nex_safe_current_user_id()
returns uuid language sql stable as $$ select auth.uid(); $$;

create or replace function public.nex_current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select up.id from public.users_profiles up where up.auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.nex_current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select up.organization_id from public.users_profiles up where up.auth_user_id = auth.uid() and up.active = true limit 1;
$$;

create or replace function public.nex_current_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(up.role::text, '') from public.users_profiles up where up.auth_user_id = auth.uid() and up.active = true limit 1;
$$;

create or replace function public.nex_is_global_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users_profiles up where up.auth_user_id = auth.uid() and up.active = true and lower(up.role::text) in ('admin_master','admin_master_global'));
$$;

create or replace function public.nex_can_access_org(org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.nex_is_global_master() or exists(select 1 from public.users_profiles up where up.auth_user_id = auth.uid() and up.active = true and up.organization_id = org_id);
$$;

alter table public.billing_subscriptions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.payment_events enable row level security;
alter table public.commercial_readiness_checks enable row level security;
alter table public.onboarding_steps enable row level security;

do $$ begin
  create policy billing_subscriptions_select_org on public.billing_subscriptions for select using (public.nex_can_access_org(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy billing_subscriptions_service_write on public.billing_subscriptions for all using (public.nex_is_global_master()) with check (public.nex_is_global_master());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy billing_invoices_select_org on public.billing_invoices for select using (organization_id is null or public.nex_can_access_org(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy payment_events_select_master on public.payment_events for select using (public.nex_is_global_master());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy readiness_select_org on public.commercial_readiness_checks for select using (public.nex_can_access_org(organization_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy onboarding_select_org on public.onboarding_steps for select using (public.nex_can_access_org(organization_id));
exception when duplicate_object then null; end $$;

create or replace function public.nex_register_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_organization_id uuid,
  p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.payment_events(provider, provider_event_id, event_type, organization_id, payload, processed, processed_at)
  values (p_provider, p_event_id, p_event_type, p_organization_id, p_payload, true, now())
  on conflict(provider, provider_event_id) do update set payload = excluded.payload, processed = true, processed_at = now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.nex_update_commercial_readiness(p_org_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_score integer := 0;
begin
  if exists(select 1 from public.clients where organization_id = p_org_id limit 1) then v_score := v_score + 20; end if;
  if exists(select 1 from public.processes where organization_id = p_org_id limit 1) then v_score := v_score + 20; end if;
  if exists(select 1 from public.users_profiles where organization_id = p_org_id and active = true limit 1) then v_score := v_score + 20; end if;
  if exists(select 1 from public.billing_subscriptions where organization_id = p_org_id and status in ('active','trialing') limit 1) then v_score := v_score + 20; end if;
  if exists(select 1 from public.audit_logs where organization_id = p_org_id limit 1) then v_score := v_score + 20; end if;
  update public.organizations set commercial_readiness_score = v_score where id = p_org_id;
  return v_score;
end; $$;
