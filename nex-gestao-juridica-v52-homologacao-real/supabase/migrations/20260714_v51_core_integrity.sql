-- Nex Gestão Jurídica v5.1 · núcleo de integridade, concorrência e auditoria
begin;
create extension if not exists pgcrypto;

create table if not exists public.operation_idempotency (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_type text not null,
  idempotency_key text not null,
  entity_id uuid,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  result jsonb not null default '{}'::jsonb,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, operation_type, idempotency_key)
);
create index if not exists operation_idempotency_org_created_idx on public.operation_idempotency(organization_id, created_at desc);

create or replace function public.nex_v51_assert_role(p_roles text[])
returns void language plpgsql stable security definer set search_path=public,auth as $$
declare v_role text := lower(coalesce(public.nex_current_role(),''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (v_role = any(p_roles) or v_role in ('admin_master','admin_master_global')) then raise exception 'FORBIDDEN_ROLE'; end if;
end $$;
revoke all on function public.nex_v51_assert_role(text[]) from public, anon, authenticated;
grant execute on function public.nex_v51_assert_role(text[]) to service_role;

create or replace function public.nex_v51_claim_idempotency(p_operation text,p_key text)
returns public.operation_idempotency language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_row public.operation_idempotency%rowtype;
begin
  if auth.uid() is null or v_org is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_operation,''))) not between 1 and 80 or length(trim(coalesce(p_key,''))) not between 4 and 180 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  insert into public.operation_idempotency(organization_id,operation_type,idempotency_key,processed_by)
  values(v_org,lower(trim(p_operation)),trim(p_key),auth.uid())
  on conflict(organization_id,operation_type,idempotency_key) do nothing;
  select * into v_row from public.operation_idempotency where organization_id=v_org and operation_type=lower(trim(p_operation)) and idempotency_key=trim(p_key) for update;
  return v_row;
end $$;
revoke all on function public.nex_v51_claim_idempotency(text,text) from public,anon,authenticated;
grant execute on function public.nex_v51_claim_idempotency(text,text) to service_role;

create or replace function public.nex_v51_finish_idempotency(p_id uuid,p_status text,p_entity_id uuid,p_result jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  update public.operation_idempotency set status=p_status,entity_id=p_entity_id,result=coalesce(p_result,'{}'::jsonb),processed_at=now()
  where id=p_id and organization_id=public.nex_current_org_id();
end $$;
revoke all on function public.nex_v51_finish_idempotency(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.nex_v51_finish_idempotency(uuid,text,uuid,jsonb) to service_role;

alter table if exists public.audit_logs add column if not exists before_data jsonb, add column if not exists after_data jsonb, add column if not exists ip_address inet, add column if not exists user_agent text;
commit;
