-- Nex Gestão Jurídica v5.0
-- Segurança P0, portal autenticado, storage multiempresa, agenda unificada,
-- fontes de leads, idempotência e correção incremental da migration v4.9.

begin;
create extension if not exists pgcrypto;

-- =========================================================
-- 1. CORREÇÃO FINANCEIRA E CAMPOS DE INTEGRAÇÃO
-- =========================================================
alter table if exists public.financial_entries
  add column if not exists scheduled_event_id uuid,
  add column if not exists cost_center text,
  add column if not exists payroll_id uuid,
  add column if not exists payment_schedule_type text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.payment_events
  add column if not exists processing_result jsonb,
  add column if not exists processing_error text;

alter table if exists public.audit_logs
  add column if not exists user_id uuid;

alter table if exists public.leads
  add column if not exists source_id uuid,
  add column if not exists external_source_id text,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists source_campaign text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.crm_lead_sources
  add column if not exists is_default boolean not null default false,
  add column if not exists active boolean not null default true;

alter table if exists public.scheduled_events
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists responsible_id uuid,
  add column if not exists client_visible boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table if exists public.notifications
  add column if not exists read_at timestamptz,
  add column if not exists link_path text,
  add column if not exists payload jsonb not null default '{}'::jsonb;

drop index if exists public.users_profiles_org_email_uidx;
create index if not exists users_profiles_org_email_idx
  on public.users_profiles (organization_id, lower(email))
  where email is not null;
with ranked_leads as (
  select id, external_source_id, row_number() over (
    partition by organization_id, origin, external_source_id
    order by created_at asc nulls last, id asc
  ) as rn
  from public.leads
  where external_source_id is not null
)
update public.leads l
   set source_payload = coalesce(l.source_payload, '{}'::jsonb) || jsonb_build_object('_v50_duplicate_external_source_id', r.external_source_id),
       external_source_id = null,
       updated_at = now()
  from ranked_leads r
 where l.id = r.id and r.rn > 1;

create unique index if not exists leads_external_source_uidx
  on public.leads (organization_id, origin, external_source_id)
  where external_source_id is not null;
with ranked_events as (
  select id, row_number() over (
    partition by organization_id, source_type, source_id
    order by created_at asc nulls last, id asc
  ) as rn
  from public.scheduled_events
  where source_type is not null and source_id is not null
)
update public.scheduled_events e
   set notes = concat_ws(E'\n', nullif(e.notes, ''), 'Evento duplicado preservado pela migration v5.0.'),
       source_id = null,
       updated_at = now()
  from ranked_events r
 where e.id = r.id and r.rn > 1;

create unique index if not exists scheduled_events_source_uidx
  on public.scheduled_events (organization_id, source_type, source_id)
  where source_type is not null and source_id is not null;
create index if not exists financial_entries_scheduled_event_idx on public.financial_entries(scheduled_event_id);
create index if not exists scheduled_events_org_start_idx on public.scheduled_events(organization_id, starts_at);
create index if not exists crm_lead_sources_org_active_idx on public.crm_lead_sources(organization_id, active, is_default);

-- =========================================================
-- 2. PERFIL E PORTAL AUTENTICADO
-- =========================================================
create or replace function public.nex_current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.client_id
  from public.users_profiles p
  where p.auth_user_id = auth.uid() and p.active is true
  limit 1;
$$;

create or replace function public.nex_is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(public.nex_current_role()) = 'cliente', false);
$$;

grant execute on function public.nex_current_client_id() to authenticated, service_role;
grant execute on function public.nex_is_client() to authenticated, service_role;

-- Impede que qualquer e-mail autenticado crie um perfil operacional arbitrário.
-- O primeiro usuário do banco ainda pode inicializar a plataforma; os demais
-- precisam ter perfil previamente convidado ou preparado.
create or replace function public.ensure_current_user_profile(p_name text default null)
returns public.users_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text;
  v_profile public.users_profiles%rowtype;
  v_org_id uuid;
begin
  if v_auth_user_id is null then raise exception 'Usuário não autenticado.'; end if;
  select email into v_email from auth.users where id = v_auth_user_id limit 1;
  if v_email is null then raise exception 'E-mail do usuário não encontrado.'; end if;

  select * into v_profile from public.users_profiles where auth_user_id = v_auth_user_id limit 1;
  if found then
    update public.users_profiles
       set last_login_at = now(), updated_at = now()
     where id = v_profile.id
     returning * into v_profile;
    return v_profile;
  end if;

  select * into v_profile
    from public.users_profiles
   where lower(email) = lower(v_email)
     and active is true
   order by created_at asc nulls last
   limit 1;
  if found then
    update public.users_profiles
       set auth_user_id = v_auth_user_id,
           name = coalesce(nullif(trim(p_name), ''), name, v_email),
           last_login_at = now(),
           updated_at = now(),
           invitation_status = case when lower(role) = 'cliente' then 'portal_ativo' else coalesce(invitation_status, 'aceito') end
     where id = v_profile.id
     returning * into v_profile;
    return v_profile;
  end if;

  if exists (select 1 from public.users_profiles) then
    raise exception 'Usuário autenticado, mas sem convite ou perfil vinculado.';
  end if;

  select id into v_org_id from public.organizations order by created_at asc nulls last limit 1;
  if v_org_id is null then
    insert into public.organizations(name, trade_name, status, access_blocked)
    values ('Nex Gestão Jurídica', 'NexLabs', 'Ativa', false)
    returning id into v_org_id;
  end if;

  insert into public.users_profiles(
    organization_id, auth_user_id, name, email, role, sector, active,
    permissions, invitation_status, created_at, updated_at, last_login_at
  ) values (
    v_org_id, v_auth_user_id, coalesce(nullif(trim(p_name), ''), v_email), v_email,
    'admin_master_global', 'Diretoria e Configurações', true, '{}'::jsonb,
    'bootstrap_primeiro_usuario', now(), now(), now()
  ) returning * into v_profile;
  return v_profile;
end;
$$;

grant execute on function public.ensure_current_user_profile(text) to authenticated;

-- Remove caminhos antigos de autenticação por dados previsíveis.
revoke all on function public.client_portal_by_full_name(text) from public, anon, authenticated;
revoke all on function public.client_portal_by_name_cpf(text,text) from public, anon, authenticated;
revoke all on function public.portal_send_message(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.client_portal_insert_message(uuid,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.portal_upload_document(uuid,uuid,text,text,text,text,bigint,text,text) from public, anon, authenticated;
revoke all on function public.client_portal_register_document(uuid,text,uuid,text,text,text,text,bigint,text) from public, anon, authenticated;
revoke all on function public.client_portal_update_pricing_status(uuid,text,uuid,text) from public, anon, authenticated;

create or replace function public.portal_current_payload()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_client_id uuid := public.nex_current_client_id();
  v_client public.clients%rowtype;
begin
  if auth.uid() is null or not public.nex_is_client() or v_client_id is null then
    raise exception 'Sessão de cliente inválida.';
  end if;
  select * into v_client
    from public.clients
   where id = v_client_id
     and organization_id = public.nex_current_org_id()
     and lower(coalesce(status, 'ativo')) not in ('inativo','arquivado')
   limit 1;
  if not found then raise exception 'Cliente vinculado não encontrado.'; end if;
  return public.client_portal_by_name_cpf(v_client.name, coalesce(v_client.document, ''));
end;
$$;

create or replace function public.portal_send_message_v2(
  p_process_id uuid,
  p_body text,
  p_priority text default 'Média'
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_client_id uuid := public.nex_current_client_id();
begin
  if auth.uid() is null or not public.nex_is_client() or v_client_id is null then raise exception 'Sessão de cliente inválida.'; end if;
  if nullif(trim(coalesce(p_body,'')), '') is null then raise exception 'Mensagem vazia.'; end if;
  if p_process_id is not null and not exists (
    select 1 from public.processes p
    where p.id = p_process_id and p.client_id = v_client_id and p.organization_id = public.nex_current_org_id()
  ) then raise exception 'Processo inválido para o cliente.'; end if;
  return public.portal_send_message(v_client_id, p_process_id, left(trim(p_body), 5000), coalesce(p_priority, 'Média'));
end;
$$;

create or replace function public.portal_register_document_v2(
  p_process_id uuid,
  p_name text,
  p_type text,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_hash text,
  p_storage_path text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_client_id uuid := public.nex_current_client_id();
  v_path_parts text[];
begin
  if auth.uid() is null or not public.nex_is_client() or v_client_id is null then raise exception 'Sessão de cliente inválida.'; end if;
  if p_file_size_bytes is not null and p_file_size_bytes > 10485760 then raise exception 'Arquivo maior que 10MB.'; end if;
  if lower(coalesce(p_mime_type,'')) not in ('application/pdf','image/jpeg','image/png') then raise exception 'Tipo de arquivo não permitido.'; end if;
  if p_process_id is not null and not exists (
    select 1 from public.processes p
    where p.id = p_process_id and p.client_id = v_client_id and p.organization_id = public.nex_current_org_id()
  ) then raise exception 'Processo inválido para o cliente.'; end if;
  if p_storage_path is not null then
    v_path_parts := string_to_array(p_storage_path, '/');
    if coalesce(v_path_parts[1], '') <> public.nex_current_org_id()::text
       or coalesce(v_path_parts[2], '') <> v_client_id::text then
      raise exception 'Caminho de armazenamento inválido.';
    end if;
  end if;
  return public.portal_upload_document(v_client_id, p_process_id, left(trim(p_name), 180), left(trim(p_type), 80), p_file_name, p_mime_type, p_file_size_bytes, p_hash, p_storage_path);
end;
$$;

create or replace function public.portal_update_pricing_status_v2(
  p_proposal_id uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_client_id uuid := public.nex_current_client_id();
  v_name text;
begin
  if auth.uid() is null or not public.nex_is_client() or v_client_id is null then raise exception 'Sessão de cliente inválida.'; end if;
  if p_status not in ('Aceita','Recusada') then raise exception 'Status inválido.'; end if;
  select c.name into v_name from public.clients c where c.id = v_client_id and c.organization_id = public.nex_current_org_id();
  if not exists (
    select 1 from public.pricing_proposals p
    where p.id = p_proposal_id and p.client_id = v_client_id and p.organization_id = public.nex_current_org_id()
  ) then raise exception 'Proposta inválida para o cliente.'; end if;
  return public.client_portal_update_pricing_status(v_client_id, v_name, p_proposal_id, p_status);
end;
$$;

grant execute on function public.portal_current_payload() to authenticated;
grant execute on function public.portal_send_message_v2(uuid,text,text) to authenticated;
grant execute on function public.portal_register_document_v2(uuid,text,text,text,text,bigint,text,text) to authenticated;
grant execute on function public.portal_update_pricing_status_v2(uuid,text) to authenticated;

-- =========================================================
-- 3. RATE LIMIT DISTRIBUÍDO PARA ENDPOINTS PÚBLICOS
-- =========================================================
create table if not exists public.api_rate_limits (
  key_hash text primary key,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.nex_consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_now timestamptz := now();
begin
  delete from public.api_rate_limits where expires_at < v_now - interval '1 hour';
  insert into public.api_rate_limits(key_hash, request_count, expires_at, updated_at)
  values (p_key_hash, 1, v_now + make_interval(secs => greatest(p_window_seconds, 1)), v_now)
  on conflict(key_hash) do update
     set request_count = case when public.api_rate_limits.expires_at <= v_now then 1 else public.api_rate_limits.request_count + 1 end,
         expires_at = case when public.api_rate_limits.expires_at <= v_now then v_now + make_interval(secs => greatest(p_window_seconds, 1)) else public.api_rate_limits.expires_at end,
         updated_at = v_now
  returning request_count into v_count;
  return v_count <= greatest(p_limit, 1);
end;
$$;
revoke all on function public.nex_consume_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.nex_consume_rate_limit(text,integer,integer) to service_role;

-- =========================================================
-- 4. RLS RESTRITIVA PARA PERFIS CLIENTE
-- =========================================================
-- Garante RLS ativa mesmo quando a base veio de uma versão intermediária.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clients','processes','documents','messages','financial_entries',
    'pricing_proposals','deadlines','hearings','leads','employees','tasks',
    'payrolls','audit_logs','integrations','automation_rules','automation_runs',
    'users_profiles','scheduled_events','crm_lead_sources','notifications'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.clients') is not null then
    drop policy if exists v50_client_scope_restrict on public.clients;
    create policy v50_client_scope_restrict on public.clients as restrictive for all to authenticated
      using (not public.nex_is_client() or (id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.processes') is not null then
    drop policy if exists v50_client_scope_restrict on public.processes;
    create policy v50_client_scope_restrict on public.processes as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.documents') is not null then
    drop policy if exists v50_client_scope_restrict on public.documents;
    create policy v50_client_scope_restrict on public.documents as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id() and coalesce(client_visible, false)))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.messages') is not null then
    drop policy if exists v50_client_scope_restrict on public.messages;
    create policy v50_client_scope_restrict on public.messages as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.financial_entries') is not null then
    drop policy if exists v50_client_scope_restrict on public.financial_entries;
    create policy v50_client_scope_restrict on public.financial_entries as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.pricing_proposals') is not null then
    drop policy if exists v50_client_scope_restrict on public.pricing_proposals;
    create policy v50_client_scope_restrict on public.pricing_proposals as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.deadlines') is not null then
    drop policy if exists v50_client_scope_restrict on public.deadlines;
    create policy v50_client_scope_restrict on public.deadlines as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
  if to_regclass('public.hearings') is not null then
    drop policy if exists v50_client_scope_restrict on public.hearings;
    create policy v50_client_scope_restrict on public.hearings as restrictive for all to authenticated
      using (not public.nex_is_client() or (client_id = public.nex_current_client_id() and organization_id = public.nex_current_org_id()))
      with check (not public.nex_is_client());
  end if;
end $$;

-- Módulos internos nunca devem ser lidos diretamente pelo cliente.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['leads','employees','tasks','payrolls','audit_logs','integrations','automation_rules','automation_runs','users_profiles']
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop policy if exists v50_deny_client_restrict on public.%I', v_table);
      execute format('create policy v50_deny_client_restrict on public.%I as restrictive for all to authenticated using (not public.nex_is_client()) with check (not public.nex_is_client())', v_table);
    end if;
  end loop;
end $$;

-- =========================================================
-- 5. STORAGE PRIVADO E MULTIEMPRESA
-- Caminho obrigatório: organization_id/client_id-ou-contexto/document_id/arquivo.ext
-- =========================================================
drop policy if exists nex_documentos_insert_portal_v41 on storage.objects;
drop policy if exists nex_documentos_read_auth_v41 on storage.objects;
drop policy if exists nex_documentos_update_auth_v41 on storage.objects;
drop policy if exists nex_documentos_delete_auth_v41 on storage.objects;
drop policy if exists documentos_auth_upload on storage.objects;
drop policy if exists documentos_auth_select on storage.objects;
drop policy if exists documentos_auth_update on storage.objects;
revoke insert, update, delete on storage.objects from anon;

drop policy if exists v50_documentos_select on storage.objects;
create policy v50_documentos_select on storage.objects for select to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = public.nex_current_org_id()::text
  and (
    not public.nex_is_client()
    or (storage.foldername(name))[2] = public.nex_current_client_id()::text
  )
);

drop policy if exists v50_documentos_insert on storage.objects;
create policy v50_documentos_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = public.nex_current_org_id()::text
  and lower(storage.extension(name)) in ('pdf','jpg','jpeg','png')
  and (
    not public.nex_is_client()
    or (storage.foldername(name))[2] = public.nex_current_client_id()::text
  )
);

drop policy if exists v50_documentos_update on storage.objects;
create policy v50_documentos_update on storage.objects for update to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = public.nex_current_org_id()::text
  and lower(public.nex_current_role()) in ('admin_master','admin_master_global','admin_empresa','admin','socio','advogado','controladoria')
)
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = public.nex_current_org_id()::text
  and lower(storage.extension(name)) in ('pdf','jpg','jpeg','png')
);

drop policy if exists v50_documentos_delete on storage.objects;
create policy v50_documentos_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = public.nex_current_org_id()::text
  and lower(public.nex_current_role()) in ('admin_master','admin_master_global','admin_empresa','admin','socio')
);

-- =========================================================
-- 6. AGENDA UNIFICADA SINCRONIZADA SEM DUPLICIDADE
-- =========================================================
create or replace function public.nex_sync_hearing_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null then
    update public.scheduled_events set archived_at = now(), updated_at = now()
     where organization_id = new.organization_id and source_type = 'hearing' and source_id = new.id;
    return new;
  end if;
  insert into public.scheduled_events(
    organization_id, event_type, source_type, source_id, title, client_id, process_id,
    responsible_id, starts_at, ends_at, location, meeting_link, status, notes,
    client_visible, created_at, updated_at
  ) values (
    new.organization_id, 'hearing', 'hearing', new.id, coalesce(new.title, 'Audiência/Reunião'),
    new.client_id, new.process_id, new.responsible_id, new.hearing_at, new.hearing_at,
    new.location, new.link, lower(coalesce(new.status, 'agendada')), new.agenda_notes,
    true, now(), now()
  ) on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null
  do update set title = excluded.title, client_id = excluded.client_id, process_id = excluded.process_id,
    responsible_id = excluded.responsible_id, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    location = excluded.location, meeting_link = excluded.meeting_link, status = excluded.status,
    notes = excluded.notes, archived_at = null, updated_at = now();
  return new;
end $$;

drop trigger if exists trg_v50_sync_hearing_event on public.hearings;
create trigger trg_v50_sync_hearing_event after insert or update on public.hearings
for each row execute function public.nex_sync_hearing_event();

create or replace function public.nex_sync_task_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null or new.due_at is null then
    update public.scheduled_events set archived_at = now(), updated_at = now()
     where organization_id = new.organization_id and source_type = 'task' and source_id = new.id;
    return new;
  end if;
  insert into public.scheduled_events(
    organization_id, event_type, source_type, source_id, title, client_id, process_id,
    responsible_id, starts_at, ends_at, status, notes, client_visible, created_at, updated_at
  ) values (
    new.organization_id, 'task', 'task', new.id, coalesce(new.title, 'Tarefa'), new.client_id,
    new.process_id, new.responsible_id, new.due_at, new.due_at, lower(coalesce(new.status, 'pendente')),
    new.description, false, now(), now()
  ) on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null
  do update set title = excluded.title, client_id = excluded.client_id, process_id = excluded.process_id,
    responsible_id = excluded.responsible_id, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    status = excluded.status, notes = excluded.notes, archived_at = null, updated_at = now();
  return new;
end $$;

drop trigger if exists trg_v50_sync_task_event on public.tasks;
create trigger trg_v50_sync_task_event after insert or update on public.tasks
for each row execute function public.nex_sync_task_event();

create or replace function public.nex_sync_finance_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event_id uuid;
begin
  if new.archived_at is not null or new.due_date is null then
    update public.scheduled_events set archived_at = now(), updated_at = now()
     where organization_id = new.organization_id and source_type = 'finance' and source_id = new.id;
    return new;
  end if;
  insert into public.scheduled_events(
    organization_id, event_type, source_type, source_id, title, client_id, process_id,
    finance_id, starts_at, ends_at, due_date, amount, status, notes,
    client_visible, created_at, updated_at
  ) values (
    new.organization_id, 'payment', 'finance', new.id,
    concat(case when lower(coalesce(new.type,'receita')) = 'despesa' then 'Pagamento' else 'Recebimento' end, ' · ', coalesce(new.category,'Financeiro')),
    new.client_id, new.process_id, new.id, new.due_date::timestamptz, new.due_date::timestamptz,
    new.due_date, new.amount, lower(coalesce(new.status, 'pendente')), new.notes,
    true, now(), now()
  ) on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null
  do update set title = excluded.title, client_id = excluded.client_id, process_id = excluded.process_id,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, due_date = excluded.due_date,
    amount = excluded.amount, status = excluded.status, notes = excluded.notes,
    archived_at = null, updated_at = now()
  returning id into v_event_id;
  update public.financial_entries set scheduled_event_id = v_event_id where id = new.id;
  return new;
end $$;

drop trigger if exists trg_v50_sync_finance_event on public.financial_entries;
create trigger trg_v50_sync_finance_event after insert or update of due_date, amount, status, category, archived_at on public.financial_entries
for each row execute function public.nex_sync_finance_event();

-- Backfill não destrutivo dos registros existentes.
insert into public.scheduled_events(
  organization_id, event_type, source_type, source_id, title, client_id, process_id,
  responsible_id, starts_at, ends_at, location, meeting_link, status, client_visible, created_at, updated_at
)
select h.organization_id, 'hearing', 'hearing', h.id, coalesce(h.title,'Audiência/Reunião'), h.client_id,
       h.process_id, h.responsible_id, h.hearing_at, h.hearing_at, h.location, h.link,
       lower(coalesce(h.status,'agendada')), true, now(), now()
from public.hearings h
where h.archived_at is null
on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null do nothing;

insert into public.scheduled_events(
  organization_id, event_type, source_type, source_id, title, client_id, process_id,
  responsible_id, starts_at, ends_at, status, notes, client_visible, created_at, updated_at
)
select t.organization_id, 'task', 'task', t.id, coalesce(t.title,'Tarefa'), t.client_id, t.process_id,
       t.responsible_id, t.due_at, t.due_at, lower(coalesce(t.status,'pendente')), t.description,
       false, now(), now()
from public.tasks t
where t.archived_at is null and t.due_at is not null
on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null do nothing;

insert into public.scheduled_events(
  organization_id, event_type, source_type, source_id, title, client_id, process_id, finance_id,
  starts_at, ends_at, due_date, amount, status, notes, client_visible, created_at, updated_at
)
select f.organization_id, 'payment', 'finance', f.id,
       concat(case when lower(coalesce(f.type,'receita')) = 'despesa' then 'Pagamento' else 'Recebimento' end, ' · ', coalesce(f.category,'Financeiro')),
       f.client_id, f.process_id, f.id, f.due_date::timestamptz, f.due_date::timestamptz,
       f.due_date, f.amount, lower(coalesce(f.status,'pendente')), f.notes, true, now(), now()
from public.financial_entries f
where f.archived_at is null and f.due_date is not null
on conflict (organization_id, source_type, source_id) where source_type is not null and source_id is not null do nothing;

-- Garante uma única fonte padrão ativa por organização sem apagar fontes.
with ranked_sources as (
  select id, row_number() over (
    partition by organization_id
    order by updated_at desc nulls last, created_at asc nulls last, id asc
  ) as rn
  from public.crm_lead_sources
  where is_default is true and active is true
)
update public.crm_lead_sources s
   set is_default = false, updated_at = now()
  from ranked_sources r
 where s.id = r.id and r.rn > 1;

create unique index if not exists crm_lead_sources_one_default_uidx
  on public.crm_lead_sources(organization_id)
  where is_default is true and active is true;

commit;
