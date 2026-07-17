-- Nex Gestão Jurídica v4.1 — Correções Enterprise Completas
-- Complementa v4.0 com RPC faltante, Storage, RLS por papel e helpers seguros.
create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- =========================================================
-- 1) HELPERS DE SEGURANÇA E PERFIL ATUAL
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

create or replace function public.nex_is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master','admin','socio');
$$;

create or replace function public.nex_is_financial_user()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master','admin','socio','financeiro');
$$;

create or replace function public.nex_is_rh_user()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.nex_current_role() in ('admin_master','admin','socio','rh');
$$;

grant execute on function public.nex_current_profile_id() to authenticated;
grant execute on function public.nex_current_org_id() to authenticated;
grant execute on function public.nex_current_role() to authenticated;
grant execute on function public.nex_is_admin() to authenticated;
grant execute on function public.nex_is_financial_user() to authenticated;
grant execute on function public.nex_is_rh_user() to authenticated;

-- =========================================================
-- 2) STORAGE DO GED / PORTAL
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','application/pdf','image/heic','image/heif']
)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists nex_documentos_insert_portal_v41 on storage.objects;
drop policy if exists nex_documentos_read_auth_v41 on storage.objects;
drop policy if exists nex_documentos_update_auth_v41 on storage.objects;
drop policy if exists nex_documentos_delete_auth_v41 on storage.objects;

create policy nex_documentos_insert_portal_v41 on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'documentos');

create policy nex_documentos_read_auth_v41 on storage.objects
for select to authenticated
using (bucket_id = 'documentos');

create policy nex_documentos_update_auth_v41 on storage.objects
for update to authenticated
using (bucket_id = 'documentos' and public.nex_current_role() in ('admin_master','admin','socio','advogado','controladoria'))
with check (bucket_id = 'documentos');

create policy nex_documentos_delete_auth_v41 on storage.objects
for delete to authenticated
using (bucket_id = 'documentos' and public.nex_current_role() in ('admin_master','admin','socio'));

-- =========================================================
-- 3) RLS BASE POR ORGANIZAÇÃO E PAPEL
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','units','departments','teams','team_members','workflow_templates','workflow_steps',
    'legal_module_records','rural_properties','document_folders','document_versions','document_templates',
    'fee_contracts','cost_entries','point_schedules','point_adjustment_requests','point_justifications',
    'notifications','employees','clients','leads','processes','deadlines','tasks','documents','protocols',
    'signatures','messages','automation_rules','automation_runs','pricing_proposals','payrolls','integrations',
    'hearings','client_consents','payment_receipts','report_exports','audit_logs'
  ] loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='organization_id'
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists nex_v41_select_org on public.%I', t);
      execute format('drop policy if exists nex_v41_insert_org on public.%I', t);
      execute format('drop policy if exists nex_v41_update_org on public.%I', t);
      execute format('drop policy if exists nex_v41_delete_admin on public.%I', t);
      execute format('create policy nex_v41_select_org on public.%I for select to authenticated using (organization_id = public.nex_current_org_id())', t);
      execute format('create policy nex_v41_insert_org on public.%I for insert to authenticated with check (organization_id = public.nex_current_org_id())', t);
      execute format('create policy nex_v41_update_org on public.%I for update to authenticated using (organization_id = public.nex_current_org_id()) with check (organization_id = public.nex_current_org_id())', t);
      execute format('create policy nex_v41_delete_admin on public.%I for delete to authenticated using (organization_id = public.nex_current_org_id() and public.nex_is_admin())', t);
    end if;
  end loop;
end $$;

-- Financeiro sensível: somente admin/sócio/financeiro.
do $$
begin
  if to_regclass('public.financial_entries') is not null then
    alter table public.financial_entries enable row level security;
    drop policy if exists nex_v41_fin_select on public.financial_entries;
    drop policy if exists nex_v41_fin_insert on public.financial_entries;
    drop policy if exists nex_v41_fin_update on public.financial_entries;
    drop policy if exists nex_v41_fin_delete on public.financial_entries;
    create policy nex_v41_fin_select on public.financial_entries for select to authenticated using (organization_id = public.nex_current_org_id() and public.nex_is_financial_user());
    create policy nex_v41_fin_insert on public.financial_entries for insert to authenticated with check (organization_id = public.nex_current_org_id() and public.nex_is_financial_user());
    create policy nex_v41_fin_update on public.financial_entries for update to authenticated using (organization_id = public.nex_current_org_id() and public.nex_is_financial_user()) with check (organization_id = public.nex_current_org_id() and public.nex_is_financial_user());
    create policy nex_v41_fin_delete on public.financial_entries for delete to authenticated using (organization_id = public.nex_current_org_id() and public.nex_is_admin());
  end if;
end $$;

-- Perfis: leitura própria ou por gestores; alteração por gestores ou próprio usuário em campos não críticos pelo app.
do $$
begin
  if to_regclass('public.users_profiles') is not null then
    alter table public.users_profiles enable row level security;
    drop policy if exists nex_v41_profiles_select on public.users_profiles;
    drop policy if exists nex_v41_profiles_insert on public.users_profiles;
    drop policy if exists nex_v41_profiles_update on public.users_profiles;
    create policy nex_v41_profiles_select on public.users_profiles
      for select to authenticated
      using (auth_user_id = auth.uid() or (organization_id = public.nex_current_org_id() and public.nex_current_role() in ('admin_master','admin','socio','rh')));
    create policy nex_v41_profiles_insert on public.users_profiles
      for insert to authenticated
      with check (organization_id = public.nex_current_org_id() and public.nex_current_role() in ('admin_master','admin','socio','rh'));
    create policy nex_v41_profiles_update on public.users_profiles
      for update to authenticated
      using (auth_user_id = auth.uid() or (organization_id = public.nex_current_org_id() and public.nex_current_role() in ('admin_master','admin','socio','rh')))
      with check (organization_id = public.nex_current_org_id());
  end if;
end $$;

-- Ponto e folha: RH/Admin têm visão geral; colaborador vê seus próprios registros quando mapeado por employee.profile_id.
do $$
begin
  if to_regclass('public.time_records') is not null and to_regclass('public.employees') is not null then
    alter table public.time_records enable row level security;
    drop policy if exists nex_v41_time_select on public.time_records;
    drop policy if exists nex_v41_time_insert on public.time_records;
    drop policy if exists nex_v41_time_update on public.time_records;
    create policy nex_v41_time_select on public.time_records for select to authenticated using (
      organization_id = public.nex_current_org_id() and (
        public.nex_is_rh_user() or exists(select 1 from public.employees e where e.id = time_records.employee_id and e.profile_id = public.nex_current_profile_id())
      )
    );
    create policy nex_v41_time_insert on public.time_records for insert to authenticated with check (
      organization_id = public.nex_current_org_id() and (
        public.nex_is_rh_user() or exists(select 1 from public.employees e where e.id = time_records.employee_id and e.profile_id = public.nex_current_profile_id())
      )
    );
    create policy nex_v41_time_update on public.time_records for update to authenticated using (organization_id = public.nex_current_org_id() and public.nex_is_rh_user()) with check (organization_id = public.nex_current_org_id());
  end if;
end $$;

-- =========================================================
-- 4) PORTAL DO CLIENTE: PAYLOAD, MENSAGEM, DOCUMENTO, PROPOSTA
-- =========================================================
create or replace function public.portal_public_payload(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_org uuid;
begin
  select * into v_client from public.clients where id = p_client_id and archived_at is null limit 1;
  if not found then raise exception 'Cliente não encontrado.'; end if;
  v_org := v_client.organization_id;
  return jsonb_build_object(
    'organizationId', v_org,
    'client', jsonb_build_object('id', v_client.id, 'organizationId', v_org, 'type', coalesce(v_client.type,'PF'), 'name', v_client.name, 'document', '', 'city', coalesce(v_client.address->>'city',''), 'origin', coalesce(v_client.origin,''), 'status', 'Ativo', 'responsible', coalesce(v_client.responsible_id::text,''), 'responsibleId', coalesce(v_client.responsible_id::text,''), 'processes', 0, 'lifetimeValue', 0, 'email', coalesce(v_client.email,''), 'phone', coalesce(v_client.phone, v_client.whatsapp, ''), 'whatsapp', coalesce(v_client.whatsapp, v_client.phone, ''), 'address', coalesce(v_client.address->>'street', v_client.address->>'full',''), 'notes', ''),
    'processes', coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'organizationId',p.organization_id,'cnj',coalesce(p.cnj,''),'type',initcap(coalesce(p.type,'Judicial')),'client',v_client.name,'clientId',v_client.id,'opposite',coalesce(p.opposite_party,''),'court',coalesce(p.court,''),'class',coalesce(p.class_processual,''),'area',coalesce(p.area,''),'phase',coalesce(p.phase,''),'status',coalesce(p.status,''),'risk',coalesce(p.risk,'Médio'),'successChance',coalesce(p.success_chance,0),'value',coalesce(p.claim_value,0),'fees',0,'responsible',coalesce(p.responsible_id::text,''),'responsibleId',coalesce(p.responsible_id::text,''),'nextDeadline',coalesce(p.expected_end_at::text,''),'lastMoveDays',0,'progress',coalesce(p.progress,0),'clientVisibleSummary',coalesce(p.client_visible_summary,p.phase,p.status,'')) order by p.created_at desc) from public.processes p where p.organization_id=v_org and p.client_id=v_client.id and p.archived_at is null),'[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'organizationId',d.organization_id,'name',d.name,'type',coalesce(d.type,'Documento'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(d.process_id::text,''),'status',coalesce(d.status,'Recebido'),'origin',coalesce(d.origin,'Upload'),'responsible',coalesce(d.responsible_id::text,''),'version',coalesce(d.version,'v1'),'fileName',d.file_name,'mimeType',d.mime_type,'storagePath',coalesce(d.storage_path,d.file_url),'clientVisible',true,'validationStatus',coalesce(d.validation_status,'Pendente'),'accessLevel','Cliente') order by d.created_at desc) from public.documents d where d.organization_id=v_org and d.client_id=v_client.id and coalesce(d.client_visible,false) is true and d.archived_at is null),'[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'organizationId',m.organization_id,'channel',coalesce(m.channel,'Chat'),'threadType',coalesce(m.thread_type,'cliente'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(m.process_id::text,''),'subject',coalesce(m.subject,''),'body',coalesce(m.body,m.subject,''),'status',initcap(coalesce(m.status,'Pendente')),'date',coalesce((m.created_at::date)::text,current_date::text),'senderName',coalesce(m.sender_name,''),'senderRole',coalesce(m.sender_role,''),'responsibleId',coalesce(m.responsible_id::text,''),'direction',coalesce(m.direction,'cliente_para_escritorio'),'priority',coalesce(m.priority,'Média'),'resolved',coalesce(m.resolved,false)) order by m.created_at asc) from public.messages m where m.organization_id=v_org and m.client_id=v_client.id and m.archived_at is null),'[]'::jsonb),
    'finances', coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'type',case when f.type='despesa' then 'Despesa' else 'Receita' end,'category',coalesce(f.category,''),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(f.process_id::text,''),'amount',coalesce(f.amount,0),'dueDate',coalesce(f.due_date::text,''),'paidAmount',coalesce(f.paid_amount,0),'status',initcap(coalesce(f.status,'Pendente')),'method',coalesce(f.method,'PIX'),'notes','') order by f.due_date desc) from public.financial_entries f where f.organization_id=v_org and f.client_id=v_client.id and f.archived_at is null),'[]'::jsonb),
    'pricings', coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'title',coalesce(pr.title,pr.service_type,'Proposta'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(pr.process_id::text,''),'area',coalesce(pr.area,''),'service',coalesce(pr.service_type,''),'minimum',coalesce(pr.minimum_value,0),'recommended',coalesce(pr.recommended_value,0),'premium',coalesce(pr.premium_value,0),'entry',coalesce(pr.entry_value,0),'successFee',0,'status',initcap(coalesce(pr.status,'Rascunho')),'createdAt',coalesce((pr.created_at::date)::text,current_date::text),'version',coalesce(pr.version,'v1')) order by pr.created_at desc) from public.pricing_proposals pr where pr.organization_id=v_org and pr.client_id=v_client.id and pr.archived_at is null),'[]'::jsonb),
    'deadlines','[]'::jsonb,
    'hearings','[]'::jsonb
  );
end $$;
grant execute on function public.portal_public_payload(uuid) to anon, authenticated;

create or replace function public.client_portal_by_full_name(p_full_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := lower(unaccent(regexp_replace(trim(coalesce(p_full_name,'')), '\s+', ' ', 'g')));
  v_client public.clients%rowtype;
  v_process public.processes%rowtype;
  v_count int;
begin
  if length(v_name) < 8 then raise exception 'Informe o nome completo do cliente.'; end if;
  select count(*) into v_count from public.clients c where lower(unaccent(regexp_replace(trim(c.name),'\s+',' ','g'))) = v_name and c.archived_at is null;
  if v_count > 1 then raise exception 'Há mais de um cadastro com esse nome. Fale com o escritório para liberar o portal com segurança.'; end if;
  select * into v_client from public.clients c where lower(unaccent(regexp_replace(trim(c.name),'\s+',' ','g'))) = v_name and c.archived_at is null order by c.created_at asc nulls last limit 1;
  if not found then
    select * into v_process from public.processes p where lower(unaccent(regexp_replace(trim(coalesce(p.client_name,'')),'\s+',' ','g'))) = v_name and p.archived_at is null order by p.created_at desc limit 1;
    if not found then return null; end if;
    if v_process.client_id is not null then
      select * into v_client from public.clients where id = v_process.client_id limit 1;
    else
      insert into public.clients(id, organization_id, type, name, document, status, origin, responsible_id, created_at, updated_at)
      values(gen_random_uuid(), v_process.organization_id, 'PF', initcap(p_full_name), '', 'ativo', 'Portal automático por processo', v_process.responsible_id, now(), now()) returning * into v_client;
      update public.processes set client_id = v_client.id, client_name = v_client.name, updated_at = now() where id = v_process.id;
    end if;
  end if;
  perform public.audit_event('acesso_portal_por_nome','portal',v_client.id,null,jsonb_build_object('client',v_client.name),v_client.id);
  return public.portal_public_payload(v_client.id);
end $$;
grant execute on function public.client_portal_by_full_name(text) to anon, authenticated;

create or replace function public.client_portal_update_pricing_status(p_client_id uuid, p_client_name text, p_proposal_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_pr public.pricing_proposals%rowtype; v_fin uuid; v_new_status text;
begin
  v_new_status := case when lower(unaccent(coalesce(p_status,''))) like 'aceit%' then 'aceita' when lower(unaccent(coalesce(p_status,''))) like 'recus%' then 'recusada' else lower(coalesce(p_status,'rascunho')) end;
  select * into v_client from public.clients where id = p_client_id and lower(unaccent(regexp_replace(trim(name),'\s+',' ','g'))) = lower(unaccent(regexp_replace(trim(p_client_name),'\s+',' ','g'))) limit 1;
  if not found then raise exception 'Cliente não encontrado para o portal.'; end if;
  select * into v_pr from public.pricing_proposals where id = p_proposal_id and client_id = v_client.id limit 1;
  if not found then raise exception 'Proposta não encontrada para este cliente.'; end if;
  update public.pricing_proposals set status = v_new_status, updated_at = now() where id = v_pr.id;
  if v_new_status = 'aceita' then
    insert into public.financial_entries(id, organization_id, client_id, process_id, type, category, amount, due_date, status, method, notes, created_at, updated_at)
    values(gen_random_uuid(), v_client.organization_id, v_client.id, v_pr.process_id, 'receita', 'Entrada de honorários', coalesce(v_pr.entry_value, v_pr.recommended_value, 0), current_date, 'pendente', 'PIX', 'Gerado pela aprovação da proposta no portal', now(), now())
    returning id into v_fin;
  end if;
  perform public.audit_event('atualizar_proposta_portal','portal',v_pr.id,to_jsonb(v_pr),jsonb_build_object('status',v_new_status,'finance_id',v_fin),v_client.id);
  return jsonb_build_object('ok', true, 'status', initcap(v_new_status), 'financeId', v_fin);
end $$;
grant execute on function public.client_portal_update_pricing_status(uuid,text,uuid,text) to anon, authenticated;

create or replace function public.portal_send_message(p_client_id uuid, p_process_id uuid, p_body text, p_priority text default 'Média')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_resp uuid; v_id uuid:=gen_random_uuid();
begin
  if length(trim(coalesce(p_body,''))) < 2 then raise exception 'Mensagem vazia.'; end if;
  select * into v_client from public.clients where id = p_client_id and archived_at is null limit 1;
  if not found then raise exception 'Cliente não encontrado.'; end if;
  if p_process_id is not null then
    select * into v_process from public.processes where id = p_process_id and client_id = v_client.id and archived_at is null limit 1;
    if found then v_resp := v_process.responsible_id; else raise exception 'Processo não pertence ao cliente.'; end if;
  end if;
  insert into public.messages(id, organization_id, client_id, process_id, channel, subject, body, status, created_at, sender_name, sender_role, responsible_id, direction, thread_type, priority, resolved)
  values(v_id, v_client.organization_id, v_client.id, p_process_id, 'Chat', left(trim(p_body),80), trim(p_body), 'pendente', now(), v_client.name, 'cliente', v_resp, 'cliente_para_escritorio', 'cliente', coalesce(p_priority,'Média'), false);
  insert into public.tasks(id, organization_id, client_id, process_id, title, description, responsible_id, sector, priority, status, due_at, created_at)
  values(gen_random_uuid(), v_client.organization_id, v_client.id, p_process_id, 'Responder mensagem do cliente '||v_client.name, trim(p_body), v_resp, 'Advocacia', case when coalesce(p_priority,'')='Urgente' then 'Urgente' else 'Alta' end, 'Pendente', now(), now());
  perform public.audit_event('enviar_mensagem_portal','portal',v_id,null,jsonb_build_object('body',left(trim(p_body),140),'priority',p_priority),v_client.id);
  return jsonb_build_object('id',v_id,'organizationId',v_client.organization_id,'channel','Chat','threadType','cliente','client',v_client.name,'clientId',v_client.id,'processId',coalesce(p_process_id::text,''),'subject',left(trim(p_body),80),'body',trim(p_body),'status','Pendente','date',current_date::text,'senderName',v_client.name,'senderRole','cliente','responsibleId',coalesce(v_resp::text,''),'direction','cliente_para_escritorio','priority',coalesce(p_priority,'Média'),'resolved',false);
end $$;
grant execute on function public.portal_send_message(uuid,uuid,text,text) to anon, authenticated;

create or replace function public.client_portal_insert_message(p_client_id uuid, p_client_name text, p_process_id uuid, p_body text, p_priority text default 'Média')
returns jsonb language sql security definer set search_path=public as $$
  select public.portal_send_message(p_client_id,p_process_id,p_body,p_priority);
$$;
grant execute on function public.client_portal_insert_message(uuid,text,uuid,text,text) to anon, authenticated;

create or replace function public.portal_upload_document(p_client_id uuid, p_process_id uuid, p_name text, p_type text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_hash text, p_storage_path text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_resp uuid; v_id uuid:=gen_random_uuid();
begin
  select * into v_client from public.clients where id = p_client_id and archived_at is null limit 1;
  if not found then raise exception 'Cliente não encontrado.'; end if;
  if p_process_id is not null then
    select * into v_process from public.processes where id = p_process_id and client_id = v_client.id and archived_at is null limit 1;
    if found then v_resp := v_process.responsible_id; else raise exception 'Processo não pertence ao cliente.'; end if;
  end if;
  insert into public.documents(id, organization_id, client_id, process_id, name, type, status, origin, version, responsible_id, file_name, mime_type, file_size_bytes, sha256_hash, storage_path, client_visible, access_level, validation_status, created_at, updated_at)
  values(v_id, v_client.organization_id, v_client.id, p_process_id, coalesce(nullif(trim(p_name),''),'Documento do cliente'), coalesce(p_type,'Documento do cliente'), 'Recebido', 'Scanner do cliente', 'v1', v_resp, p_file_name, p_mime_type, p_file_size_bytes, p_hash, p_storage_path, true, 'Cliente', 'Pendente', now(), now());
  insert into public.tasks(id, organization_id, client_id, process_id, title, description, responsible_id, sector, priority, status, due_at, created_at)
  values(gen_random_uuid(), v_client.organization_id, v_client.id, p_process_id, 'Conferir documento de '||v_client.name, coalesce(p_name,p_file_name,'Documento enviado pelo portal'), v_resp, 'Controladoria', 'Alta', 'Pendente', now(), now());
  perform public.audit_event('upload_documento_portal','portal',v_id,null,jsonb_build_object('file',p_file_name,'storage_path',p_storage_path),v_client.id);
  return jsonb_build_object('id',v_id,'organizationId',v_client.organization_id,'name',coalesce(nullif(trim(p_name),''),'Documento do cliente'),'type',coalesce(p_type,'Documento do cliente'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(p_process_id::text,''),'status','Recebido','origin','Scanner do cliente','responsible',coalesce(v_resp::text,''),'version','v1','fileName',p_file_name,'mimeType',p_mime_type,'sizeBytes',p_file_size_bytes,'hash',p_hash,'storagePath',p_storage_path,'clientVisible',true,'validationStatus','Pendente','accessLevel','Cliente');
end $$;
grant execute on function public.portal_upload_document(uuid,uuid,text,text,text,text,bigint,text,text) to anon, authenticated;

create or replace function public.client_portal_register_document(p_client_id uuid, p_client_name text, p_process_id uuid, p_name text, p_type text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_hash text)
returns jsonb language sql security definer set search_path=public as $$
  select public.portal_upload_document(p_client_id,p_process_id,p_name,p_type,p_file_name,p_mime_type,p_file_size_bytes,p_hash,null);
$$;
grant execute on function public.client_portal_register_document(uuid,text,uuid,text,text,text,text,bigint,text) to anon, authenticated;
