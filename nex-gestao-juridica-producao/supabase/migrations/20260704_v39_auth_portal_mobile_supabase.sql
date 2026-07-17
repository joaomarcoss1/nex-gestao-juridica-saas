-- v39 — autenticação real, perfil automático, portal público por nome completo e persistência no Supabase
create extension if not exists pgcrypto;

alter table if exists public.clients drop constraint if exists clients_type_check;
alter table if exists public.users_profiles add column if not exists last_login_at timestamptz;
alter table if exists public.users_profiles add column if not exists invitation_status text;
alter table if exists public.users_profiles add column if not exists client_id uuid;
alter table if exists public.documents add column if not exists file_name text;
alter table if exists public.documents add column if not exists mime_type text;
alter table if exists public.documents add column if not exists file_size_bytes bigint;
alter table if exists public.documents add column if not exists storage_path text;
alter table if exists public.documents add column if not exists sha256_hash text;
alter table if exists public.documents add column if not exists client_visible boolean default false;
alter table if exists public.documents add column if not exists validation_status text default 'Pendente';
alter table if exists public.messages add column if not exists sender_id uuid;
alter table if exists public.messages add column if not exists sender_name text;
alter table if exists public.messages add column if not exists sender_role text;
alter table if exists public.messages add column if not exists responsible_id uuid;
alter table if exists public.messages add column if not exists direction text;
alter table if exists public.messages add column if not exists thread_type text default 'cliente';
alter table if exists public.messages add column if not exists priority text default 'Média';
alter table if exists public.messages add column if not exists resolved boolean default false;
alter table if exists public.messages add column if not exists archived_at timestamptz;
alter table if exists public.financial_entries add column if not exists paid_amount numeric(14,2);
alter table if exists public.financial_entries add column if not exists archived_at timestamptz;
alter table if exists public.pricing_proposals add column if not exists title text;
alter table if exists public.pricing_proposals add column if not exists version text default 'v1';
alter table if exists public.pricing_proposals add column if not exists archived_at timestamptz;
alter table if exists public.processes add column if not exists archived_at timestamptz;
alter table if exists public.processes add column if not exists progress integer default 0;
alter table if exists public.processes add column if not exists last_move_days integer default 0;
alter table if exists public.processes add column if not exists client_visible_summary text;
alter table if exists public.tasks add column if not exists archived_at timestamptz;

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
  v_role text;
begin
  if v_auth_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select email into v_email from auth.users where id = v_auth_user_id limit 1;
  if v_email is null then
    raise exception 'E-mail do usuário não encontrado no Supabase Auth.';
  end if;

  select * into v_profile from public.users_profiles where auth_user_id = v_auth_user_id limit 1;
  if found then
    update public.users_profiles set last_login_at = now(), updated_at = now(), active = coalesce(active, true)
    where id = v_profile.id returning * into v_profile;
    return v_profile;
  end if;

  select * into v_profile from public.users_profiles where lower(email) = lower(v_email) order by created_at asc nulls last limit 1;
  if found then
    update public.users_profiles
      set auth_user_id = v_auth_user_id,
          name = coalesce(nullif(trim(p_name), ''), name, v_email),
          active = true,
          last_login_at = now(),
          updated_at = now()
      where id = v_profile.id returning * into v_profile;
    return v_profile;
  end if;

  select id into v_org_id from public.organizations order by created_at asc nulls last limit 1;
  if v_org_id is null then
    insert into public.organizations (id, name, trade_name, created_at, updated_at)
    values (gen_random_uuid(), 'Nex Gestão Jurídica', 'NexLabs', now(), now()) returning id into v_org_id;
  end if;

  if not exists (select 1 from public.users_profiles) then v_role := 'admin_master'; else v_role := 'funcionario'; end if;

  insert into public.users_profiles (id, organization_id, auth_user_id, name, email, role, sector, active, permissions, invitation_status, created_at, updated_at, last_login_at)
  values (gen_random_uuid(), v_org_id, v_auth_user_id, coalesce(nullif(trim(p_name), ''), v_email), v_email, v_role,
          case when v_role = 'admin_master' then 'Diretoria' else 'Operacional' end,
          true, '{}'::jsonb, 'criado_por_primeiro_acesso', now(), now(), now())
  returning * into v_profile;
  return v_profile;
end;
$$;

grant execute on function public.ensure_current_user_profile(text) to authenticated;

create or replace function public.client_portal_by_full_name(p_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := lower(regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g'));
  v_client public.clients%rowtype;
  v_org uuid;
begin
  if length(v_name) < 8 then raise exception 'Informe o nome completo do cliente.'; end if;

  select * into v_client
  from public.clients c
  where lower(regexp_replace(trim(c.name), '\s+', ' ', 'g')) = v_name
  order by c.created_at asc nulls last limit 1;

  if not found then return null; end if;
  v_org := v_client.organization_id;

  return jsonb_build_object(
    'organizationId', v_org,
    'client', jsonb_build_object('id', v_client.id, 'organizationId', v_client.organization_id, 'type', coalesce(v_client.type, 'PF'), 'name', v_client.name, 'document', coalesce(v_client.document, ''), 'city', coalesce(v_client.address->>'city', ''), 'origin', coalesce(v_client.origin, ''), 'status', 'Ativo', 'responsible', coalesce(v_client.responsible_id::text, ''), 'responsibleId', coalesce(v_client.responsible_id::text, ''), 'processes', 0, 'lifetimeValue', 0, 'email', coalesce(v_client.email, ''), 'phone', coalesce(v_client.phone, coalesce(v_client.whatsapp, '')), 'whatsapp', coalesce(v_client.whatsapp, coalesce(v_client.phone, '')), 'address', coalesce(v_client.address->>'street', v_client.address->>'full', ''), 'notes', ''),
    'processes', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'organizationId', p.organization_id, 'cnj', coalesce(p.cnj, ''), 'type', initcap(coalesce(p.type, 'judicial')), 'client', v_client.name, 'clientId', v_client.id, 'opposite', coalesce(p.opposite_party, ''), 'court', coalesce(p.court, ''), 'class', coalesce(p.class_processual, ''), 'area', coalesce(p.area, ''), 'phase', coalesce(p.phase, ''), 'status', coalesce(p.status, ''), 'risk', coalesce(p.risk, 'Médio'), 'successChance', coalesce(p.success_chance, 0), 'value', coalesce(p.claim_value, 0), 'fees', coalesce(p.fees_value,0), 'responsible', coalesce(p.responsible_id::text, ''), 'responsibleId', coalesce(p.responsible_id::text, ''), 'nextDeadline', coalesce(p.expected_end_at::text, ''), 'lastMoveDays', coalesce(p.last_move_days, 0), 'progress', coalesce(p.progress, 0), 'clientVisibleSummary', coalesce(p.client_visible_summary, p.phase, p.status, '')) order by p.created_at desc) from public.processes p where p.client_id = v_client.id and p.organization_id = v_org and p.archived_at is null), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'organizationId', d.organization_id, 'name', d.name, 'type', coalesce(d.type, 'Documento'), 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(d.process_id::text, ''), 'status', coalesce(d.status, 'Recebido'), 'origin', coalesce(d.origin, 'Upload'), 'responsible', coalesce(d.responsible_id::text, ''), 'version', coalesce(d.version, 'v1'), 'fileName', d.file_name, 'mimeType', d.mime_type, 'storagePath', coalesce(d.storage_path,d.file_url), 'clientVisible', true, 'validationStatus', coalesce(d.validation_status, 'Pendente'), 'accessLevel', 'Cliente') order by d.created_at desc) from public.documents d where d.client_id = v_client.id and d.organization_id = v_org and coalesce(d.client_visible, true) is true), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'organizationId', m.organization_id, 'channel', coalesce(m.channel, 'Chat'), 'threadType', coalesce(m.thread_type, 'cliente'), 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(m.process_id::text, ''), 'subject', coalesce(m.subject, ''), 'body', coalesce(m.body, m.subject, ''), 'status', initcap(coalesce(m.status, 'Pendente')), 'date', coalesce((m.created_at::date)::text, current_date::text), 'senderName', coalesce(m.sender_name, ''), 'senderRole', coalesce(m.sender_role, ''), 'responsibleId', coalesce(m.responsible_id::text, ''), 'direction', coalesce(m.direction, 'cliente_para_escritorio'), 'priority', coalesce(m.priority, 'Média'), 'resolved', coalesce(m.resolved, false)) order by m.created_at asc) from public.messages m where m.client_id = v_client.id and m.organization_id = v_org and m.archived_at is null), '[]'::jsonb),
    'finances', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'type', case when f.type = 'despesa' then 'Despesa' else 'Receita' end, 'category', coalesce(f.category, ''), 'costCenter', coalesce(f.cost_center, ''), 'bankAccount', coalesce(f.bank_account, ''), 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(f.process_id::text, ''), 'amount', coalesce(f.amount, 0), 'dueDate', coalesce(f.due_date::text, ''), 'paidAmount', coalesce(f.paid_amount, 0), 'status', initcap(coalesce(f.status, 'Pendente')), 'method', coalesce(f.method, 'PIX'), 'notes', '') order by f.due_date desc) from public.financial_entries f where f.client_id = v_client.id and f.organization_id = v_org and f.archived_at is null), '[]'::jsonb),
    'pricings', coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'title', coalesce(pr.title, pr.service_type, 'Proposta'), 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(pr.process_id::text, ''), 'area', coalesce(pr.area, ''), 'service', coalesce(pr.service_type, ''), 'minimum', coalesce(pr.minimum_value, 0), 'recommended', coalesce(pr.recommended_value, 0), 'premium', coalesce(pr.premium_value, 0), 'entry', coalesce(pr.entry_value, 0), 'successFee', coalesce(pr.success_fee, '0'), 'status', initcap(coalesce(pr.status, 'Rascunho')), 'createdAt', coalesce((pr.created_at::date)::text, current_date::text), 'version', coalesce(pr.version, 'v1')) order by pr.created_at desc) from public.pricing_proposals pr where pr.client_id = v_client.id and pr.organization_id = v_org and pr.archived_at is null), '[]'::jsonb),
    'deadlines', '[]'::jsonb,
    'hearings', '[]'::jsonb
  );
end;
$$;

grant execute on function public.client_portal_by_full_name(text) to anon, authenticated;

create or replace function public.client_portal_insert_message(p_client_id uuid, p_client_name text, p_process_id uuid, p_body text, p_priority text default 'Média')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_id uuid := gen_random_uuid(); v_resp uuid;
begin
  select * into v_client from public.clients where id=p_client_id and lower(regexp_replace(trim(name),'\s+',' ','g'))=lower(regexp_replace(trim(p_client_name),'\s+',' ','g')) limit 1;
  if not found then raise exception 'Cliente não encontrado para o portal.'; end if;
  if p_process_id is not null then select * into v_process from public.processes where id=p_process_id and client_id=v_client.id limit 1; v_resp := v_process.responsible_id; end if;
  insert into public.messages(id, organization_id, client_id, process_id, channel, subject, body, status, created_at, sender_name, sender_role, responsible_id, direction, thread_type, priority, resolved)
  values(v_id, v_client.organization_id, v_client.id, p_process_id, 'Chat', left(coalesce(p_body,''),80), p_body, 'pendente', now(), v_client.name, 'cliente', v_resp, 'cliente_para_escritorio', 'cliente', coalesce(p_priority,'Média'), false);
  insert into public.tasks(id, organization_id, client_id, process_id, title, description, responsible_id, sector, priority, status, due_at, created_at)
  values(gen_random_uuid(), v_client.organization_id, v_client.id, p_process_id, 'Responder mensagem do cliente '||v_client.name, p_body, v_resp, 'Advocacia', case when p_priority='Urgente' then 'Urgente' else 'Alta' end, 'Pendente', now(), now());
  return jsonb_build_object('id', v_id, 'organizationId', v_client.organization_id, 'channel', 'Chat', 'threadType', 'cliente', 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(p_process_id::text,''), 'subject', left(coalesce(p_body,''),80), 'body', p_body, 'status', 'Pendente', 'date', current_date::text, 'senderName', v_client.name, 'senderRole', 'cliente', 'responsibleId', coalesce(v_resp::text,''), 'direction', 'cliente_para_escritorio', 'priority', coalesce(p_priority,'Média'), 'resolved', false);
end; $$;

grant execute on function public.client_portal_insert_message(uuid,text,uuid,text,text) to anon, authenticated;

create or replace function public.client_portal_register_document(p_client_id uuid, p_client_name text, p_process_id uuid, p_name text, p_type text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_id uuid := gen_random_uuid(); v_resp uuid;
begin
  select * into v_client from public.clients where id=p_client_id and lower(regexp_replace(trim(name),'\s+',' ','g'))=lower(regexp_replace(trim(p_client_name),'\s+',' ','g')) limit 1;
  if not found then raise exception 'Cliente não encontrado para o portal.'; end if;
  if p_process_id is not null then select * into v_process from public.processes where id=p_process_id and client_id=v_client.id limit 1; v_resp := v_process.responsible_id; end if;
  insert into public.documents(id, organization_id, client_id, process_id, name, type, status, origin, version, responsible_id, file_name, mime_type, file_size_bytes, sha256_hash, client_visible, validation_status, created_at, updated_at)
  values(v_id, v_client.organization_id, v_client.id, p_process_id, coalesce(nullif(p_name,''),'Documento do cliente'), coalesce(p_type,'Documento do cliente'), 'Recebido', 'Scanner do cliente', 'v1', v_resp, p_file_name, p_mime_type, p_file_size_bytes, p_hash, true, 'Pendente', now(), now());
  insert into public.tasks(id, organization_id, client_id, process_id, title, description, responsible_id, sector, priority, status, due_at, created_at)
  values(gen_random_uuid(), v_client.organization_id, v_client.id, p_process_id, 'Conferir documento de '||v_client.name, coalesce(p_name,p_file_name,'Documento enviado pelo portal'), v_resp, 'Controladoria', 'Alta', 'Pendente', now(), now());
  return jsonb_build_object('id', v_id, 'organizationId', v_client.organization_id, 'name', coalesce(nullif(p_name,''),'Documento do cliente'), 'type', coalesce(p_type,'Documento do cliente'), 'client', v_client.name, 'clientId', v_client.id, 'processId', coalesce(p_process_id::text,''), 'status', 'Recebido', 'origin', 'Scanner do cliente', 'responsible', coalesce(v_resp::text,''), 'version', 'v1', 'fileName', p_file_name, 'mimeType', p_mime_type, 'sizeBytes', p_file_size_bytes, 'hash', p_hash, 'clientVisible', true, 'validationStatus', 'Pendente', 'accessLevel', 'Cliente');
end; $$;

grant execute on function public.client_portal_register_document(uuid,text,uuid,text,text,text,text,bigint,text) to anon, authenticated;

create or replace function public.client_portal_update_pricing_status(p_client_id uuid, p_client_name text, p_proposal_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_pr public.pricing_proposals%rowtype;
begin
  select * into v_client from public.clients where id=p_client_id and lower(regexp_replace(trim(name),'\s+',' ','g'))=lower(regexp_replace(trim(p_client_name),'\s+',' ','g')) limit 1;
  if not found then raise exception 'Cliente não encontrado para o portal.'; end if;
  select * into v_pr from public.pricing_proposals where id=p_proposal_id and client_id=v_client.id limit 1;
  if not found then raise exception 'Proposta não encontrada para este cliente.'; end if;
  update public.pricing_proposals set status=lower(p_status) where id=v_pr.id;
  if lower(p_status) = 'aceita' then
    insert into public.financial_entries(id, organization_id, client_id, process_id, type, category, amount, due_date, status, method, notes, created_at)
    values(gen_random_uuid(), v_client.organization_id, v_client.id, v_pr.process_id, 'receita', 'Entrada de honorários', coalesce(v_pr.entry_value, v_pr.recommended_value, 0), current_date, 'pendente', 'PIX', 'Gerado pela aprovação da proposta no portal', now());
  end if;
  return jsonb_build_object('ok', true);
end; $$;

grant execute on function public.client_portal_update_pricing_status(uuid,text,uuid,text) to anon, authenticated;
