-- Nex Gestão Jurídica v4.7 — Assinatura Teste e Isenção Permanente
-- Cria controle comercial para teste gratuito manual e abolição permanente de cobranças por empresa.
-- Todas as ações são restritas ao Admin Master Global via RLS/RPC.

alter table if exists public.organizations add column if not exists billing_mode text default 'stripe';
alter table if exists public.organizations add column if not exists manual_trial_enabled boolean default false;
alter table if exists public.organizations add column if not exists manual_trial_started_at timestamptz;
alter table if exists public.organizations add column if not exists manual_trial_disabled_at timestamptz;
alter table if exists public.organizations add column if not exists manual_trial_disabled_by uuid;
alter table if exists public.organizations add column if not exists manual_trial_reason text;
alter table if exists public.organizations add column if not exists billing_exempt_forever boolean default false;
alter table if exists public.organizations add column if not exists billing_exempt_reason text;
alter table if exists public.organizations add column if not exists billing_exempt_granted_at timestamptz;
alter table if exists public.organizations add column if not exists billing_exempt_granted_by uuid;
alter table if exists public.organizations add column if not exists billing_notes text;

create index if not exists idx_organizations_billing_mode on public.organizations(billing_mode);
create index if not exists idx_organizations_manual_trial on public.organizations(manual_trial_enabled) where manual_trial_enabled = true;
create index if not exists idx_organizations_billing_exempt on public.organizations(billing_exempt_forever) where billing_exempt_forever = true;

do $$ begin
  alter table public.organizations add constraint organizations_billing_mode_check
  check (billing_mode in ('stripe','manual_trial','lifetime_exempt','manual'));
exception when duplicate_object then null; end $$;

create or replace function public.nex_is_global_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.users_profiles up
    where up.auth_user_id = auth.uid()
      and coalesce(up.active, true) = true
      and lower(up.role::text) in ('admin_master','admin_master_global')
  );
$$;

create or replace function public.nex_set_manual_trial(
  p_org_id uuid,
  p_enabled boolean,
  p_reason text default null
) returns public.organizations language plpgsql security definer set search_path = public as $$
declare v_org public.organizations%rowtype;
declare v_profile uuid;
begin
  if not public.nex_is_global_master() then
    raise exception 'Apenas Admin Master Global pode alterar teste gratuito.';
  end if;
  select public.nex_current_profile_id() into v_profile;

  update public.organizations
  set
    manual_trial_enabled = p_enabled,
    manual_trial_started_at = case when p_enabled and manual_trial_started_at is null then now() else manual_trial_started_at end,
    manual_trial_disabled_at = case when p_enabled then null else now() end,
    manual_trial_disabled_by = case when p_enabled then null else v_profile end,
    manual_trial_reason = coalesce(nullif(trim(p_reason), ''), case when p_enabled then 'Teste gratuito liberado pelo Admin Master Global' else 'Teste gratuito desativado pelo Admin Master Global' end),
    billing_exempt_forever = case when p_enabled then false else billing_exempt_forever end,
    billing_exempt_reason = case when p_enabled then null else billing_exempt_reason end,
    billing_mode = case when p_enabled then 'manual_trial' when billing_exempt_forever then 'lifetime_exempt' else 'stripe' end,
    subscription_status = case when p_enabled then 'manual_trial' else 'trial_disabled' end,
    access_blocked = false,
    blocked_reason = null,
    billing_notes = coalesce(nullif(trim(p_reason), ''), case when p_enabled then 'Teste gratuito ativo' else 'Teste gratuito desativado' end),
    updated_at = now()
  where id = p_org_id
  returning * into v_org;

  if not found then raise exception 'Empresa não encontrada.'; end if;

  insert into public.audit_logs(organization_id, module, action, entity_id, user_id, after_data, created_at)
  values (p_org_id, 'assinaturas', case when p_enabled then 'ativar_teste_gratis' else 'desativar_teste_gratis' end, p_org_id, v_profile, jsonb_build_object('enabled', p_enabled, 'reason', p_reason), now())
  on conflict do nothing;

  return v_org;
end; $$;

create or replace function public.nex_set_lifetime_billing_exemption(
  p_org_id uuid,
  p_exempt boolean,
  p_reason text default null
) returns public.organizations language plpgsql security definer set search_path = public as $$
declare v_org public.organizations%rowtype;
declare v_profile uuid;
begin
  if not public.nex_is_global_master() then
    raise exception 'Apenas Admin Master Global pode abolir cobranças de uma empresa.';
  end if;
  select public.nex_current_profile_id() into v_profile;

  update public.organizations
  set
    billing_exempt_forever = p_exempt,
    billing_exempt_reason = coalesce(nullif(trim(p_reason), ''), case when p_exempt then 'Isenção permanente concedida pelo Admin Master Global' else 'Isenção permanente removida pelo Admin Master Global' end),
    billing_exempt_granted_at = case when p_exempt then now() else billing_exempt_granted_at end,
    billing_exempt_granted_by = case when p_exempt then v_profile else billing_exempt_granted_by end,
    manual_trial_enabled = case when p_exempt then false else manual_trial_enabled end,
    manual_trial_disabled_at = case when p_exempt and manual_trial_enabled then now() else manual_trial_disabled_at end,
    manual_trial_disabled_by = case when p_exempt and manual_trial_enabled then v_profile else manual_trial_disabled_by end,
    billing_mode = case when p_exempt then 'lifetime_exempt' else 'stripe' end,
    subscription_status = case when p_exempt then 'exempt_forever' else 'exemption_removed' end,
    access_blocked = false,
    blocked_reason = null,
    billing_notes = coalesce(nullif(trim(p_reason), ''), case when p_exempt then 'Cobrança abolida permanentemente' else 'Isenção removida' end),
    updated_at = now()
  where id = p_org_id
  returning * into v_org;

  if not found then raise exception 'Empresa não encontrada.'; end if;

  insert into public.audit_logs(organization_id, module, action, entity_id, user_id, after_data, created_at)
  values (p_org_id, 'assinaturas', case when p_exempt then 'abolir_cobrancas_para_sempre' else 'remover_isencao_permanente' end, p_org_id, v_profile, jsonb_build_object('exempt', p_exempt, 'reason', p_reason), now())
  on conflict do nothing;

  return v_org;
end; $$;

grant execute on function public.nex_set_manual_trial(uuid, boolean, text) to authenticated;
grant execute on function public.nex_set_lifetime_billing_exemption(uuid, boolean, text) to authenticated;
