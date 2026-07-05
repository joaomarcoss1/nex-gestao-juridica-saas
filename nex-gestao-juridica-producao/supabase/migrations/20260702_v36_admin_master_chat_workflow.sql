-- Nex Gestão Jurídica v3.6
-- Admin Master, hierarquia de acesso, chat cliente-advogado responsável e workflow jurídico delegado.
-- Execute no SQL Editor do Supabase após aplicar o schema base quando estiver atualizando um banco existente.

alter table if exists public.users_profiles
  add column if not exists client_id uuid;

alter table if exists public.tasks
  add column if not exists delegated_by uuid,
  add column if not exists reviewer_id uuid,
  add column if not exists workflow_stage text default 'Triagem',
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists sla_hours numeric default 24,
  add column if not exists quality_score numeric,
  add column if not exists blockers text;

alter table if exists public.messages
  add column if not exists sender_id uuid,
  add column if not exists sender_name text,
  add column if not exists sender_role text,
  add column if not exists responsible_id uuid,
  add column if not exists direction text default 'cliente_para_escritorio',
  add column if not exists read_at timestamptz,
  add column if not exists answered_at timestamptz;

create index if not exists idx_tasks_workflow_responsible on public.tasks (organization_id, responsible_id, workflow_stage, status);
create index if not exists idx_tasks_delegation on public.tasks (organization_id, delegated_by, reviewer_id);
create index if not exists idx_messages_chat_scope on public.messages (organization_id, client_id, process_id, responsible_id, channel);

create or replace function public.is_admin_master()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() = 'admin_master', false)
$$;

create or replace function public.can_access_hr()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','rh'), false)
$$;

create or replace function public.can_access_financial()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','financeiro'), false)
$$;

drop policy if exists org_select_messages on public.messages;
create policy org_select_messages on public.messages for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio')
    or responsible_id = public.current_profile_id()
    or sender_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_modify_messages on public.messages;
create policy org_modify_messages on public.messages for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio')
    or responsible_id = public.current_profile_id()
    or sender_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio')
    or responsible_id = public.current_profile_id()
    or sender_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_select_tasks on public.tasks;
create policy org_select_tasks on public.tasks for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')
    or responsible_id = public.current_profile_id()
    or delegated_by = public.current_profile_id()
    or reviewer_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_modify_tasks on public.tasks;
create policy org_modify_tasks on public.tasks for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')
    or responsible_id = public.current_profile_id()
    or delegated_by = public.current_profile_id()
    or reviewer_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')
    or responsible_id = public.current_profile_id()
    or delegated_by = public.current_profile_id()
    or reviewer_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);
