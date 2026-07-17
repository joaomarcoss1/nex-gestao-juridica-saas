-- Nex Gestão Jurídica v4.0 — Estabilização Enterprise
-- Fonte única Supabase, perfil automático, portal por nome completo, auditoria e RPCs estruturais.
create extension if not exists pgcrypto;
create extension if not exists unaccent;

alter table if exists public.organizations add column if not exists updated_at timestamptz default now();
alter table if exists public.users_profiles add column if not exists last_login_at timestamptz;
alter table if exists public.users_profiles add column if not exists invitation_status text default 'ativo';
alter table if exists public.users_profiles add column if not exists client_id uuid;
alter table if exists public.users_profiles add column if not exists unit_id uuid;
alter table if exists public.users_profiles add column if not exists department_id uuid;
alter table if exists public.users_profiles add column if not exists invited_by uuid;
alter table if exists public.users_profiles add column if not exists invited_at timestamptz;
alter table if exists public.employees add column if not exists email text;
alter table if exists public.employees add column if not exists phone text;
alter table if exists public.employees add column if not exists profile_id uuid;
alter table if exists public.employees add column if not exists archived_at timestamptz;
alter table if exists public.clients drop constraint if exists clients_type_check;
alter table if exists public.clients add column if not exists archived_at timestamptz;
alter table if exists public.processes add column if not exists client_name text;
alter table if exists public.processes add column if not exists client_visible_summary text;
alter table if exists public.processes add column if not exists internal_strategy text;
alter table if exists public.processes add column if not exists archived_at timestamptz;
alter table if exists public.processes add column if not exists progress integer default 0;
alter table if exists public.tasks add column if not exists delegated_by uuid;
alter table if exists public.tasks add column if not exists reviewer_id uuid;
alter table if exists public.tasks add column if not exists workflow_stage text;
alter table if exists public.tasks add column if not exists archived_at timestamptz;
alter table if exists public.documents add column if not exists storage_path text;
alter table if exists public.documents add column if not exists client_visible boolean default false;
alter table if exists public.documents add column if not exists access_level text default 'Interno';
alter table if exists public.documents add column if not exists validation_status text default 'Pendente';
alter table if exists public.documents add column if not exists archived_at timestamptz;
alter table if exists public.messages add column if not exists thread_type text default 'cliente';
alter table if exists public.messages add column if not exists direction text;
alter table if exists public.messages add column if not exists sender_name text;
alter table if exists public.messages add column if not exists sender_role text;
alter table if exists public.messages add column if not exists responsible_id uuid;
alter table if exists public.messages add column if not exists priority text default 'Média';
alter table if exists public.messages add column if not exists resolved boolean default false;
alter table if exists public.messages add column if not exists archived_at timestamptz;
alter table if exists public.financial_entries add column if not exists paid_amount numeric(14,2);
alter table if exists public.financial_entries add column if not exists archived_at timestamptz;
alter table if exists public.financial_entries add column if not exists updated_at timestamptz;

create unique index if not exists idx_users_profiles_org_email_unique on public.users_profiles(organization_id, lower(email)) where email is not null;
create index if not exists idx_users_profiles_auth_user on public.users_profiles(auth_user_id);
create index if not exists idx_clients_name_lower_v40 on public.clients(lower(name));
create index if not exists idx_processes_client_name_lower_v40 on public.processes(lower(coalesce(client_name,'')));

create or replace function public.audit_event(p_action text, p_module text, p_entity_id uuid default null, p_before jsonb default '{}'::jsonb, p_after jsonb default '{}'::jsonb, p_client_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid := gen_random_uuid(); v_org uuid; v_user uuid;
begin
  v_user := auth.uid();
  select organization_id into v_org from public.users_profiles where auth_user_id = v_user limit 1;
  if v_org is null then select organization_id into v_org from public.clients where id = p_client_id limit 1; end if;
  insert into public.audit_logs(id, organization_id, module, action, entity_id, user_id, before_data, after_data, created_at)
  values(v_id, v_org, p_module, p_action, p_entity_id, v_user, p_before, coalesce(p_after,'{}'::jsonb) || jsonb_build_object('client_id', p_client_id), now());
  return v_id;
exception when undefined_column then
  return v_id;
end $$;
grant execute on function public.audit_event(text,text,uuid,jsonb,jsonb,uuid) to anon, authenticated;

create or replace function public.ensure_current_user_profile(p_name text default null)
returns public.users_profiles language plpgsql security definer set search_path = public, auth as $$
declare v_auth_user_id uuid := auth.uid(); v_email text; v_profile public.users_profiles%rowtype; v_org_id uuid; v_role text; v_count int;
begin
  if v_auth_user_id is null then raise exception 'Usuário não autenticado.'; end if;
  select email into v_email from auth.users where id = v_auth_user_id limit 1;
  if v_email is null then raise exception 'E-mail do usuário não encontrado no Supabase Auth.'; end if;

  select * into v_profile from public.users_profiles where auth_user_id = v_auth_user_id limit 1;
  if found then
    update public.users_profiles set active = true, last_login_at = now(), updated_at = now() where id = v_profile.id returning * into v_profile;
    perform public.audit_event('login','auth',v_profile.id,null,jsonb_build_object('email',v_email,'role',v_profile.role),v_profile.client_id);
    return v_profile;
  end if;

  select * into v_profile from public.users_profiles where lower(email)=lower(v_email) order by created_at asc nulls last limit 1;
  if found then
    update public.users_profiles set auth_user_id=v_auth_user_id, name=coalesce(nullif(trim(p_name),''), name, v_email), active=true, last_login_at=now(), updated_at=now(), invitation_status=coalesce(invitation_status,'vinculado') where id=v_profile.id returning * into v_profile;
    perform public.audit_event('vincular_primeiro_acesso','auth',v_profile.id,null,jsonb_build_object('email',v_email,'role',v_profile.role),v_profile.client_id);
    return v_profile;
  end if;

  select count(*) into v_count from public.users_profiles where role in ('admin_master','admin');
  select id into v_org_id from public.organizations order by created_at asc nulls last limit 1;
  if v_org_id is null then insert into public.organizations(id,name,trade_name,created_at,updated_at) values(gen_random_uuid(),'Nex Gestão Jurídica','NexLabs',now(),now()) returning id into v_org_id; end if;
  v_role := case when v_count = 0 then 'admin_master' else 'funcionario' end;
  insert into public.users_profiles(id,organization_id,auth_user_id,name,email,role,sector,active,permissions,invitation_status,created_at,updated_at,last_login_at)
  values(gen_random_uuid(),v_org_id,v_auth_user_id,coalesce(nullif(trim(p_name),''),v_email),v_email,v_role,case when v_role='admin_master' then 'Diretoria' else 'Operacional' end,true,'{}'::jsonb,case when v_role='admin_master' then 'primeiro_admin_master' else 'primeiro_acesso_sem_convite' end,now(),now(),now())
  returning * into v_profile;
  perform public.audit_event('criar_perfil_primeiro_acesso','auth',v_profile.id,null,to_jsonb(v_profile),null);
  return v_profile;
end $$;
grant execute on function public.ensure_current_user_profile(text) to authenticated;

create or replace function public.upsert_staff_profile_from_employee(p_employee_id uuid, p_name text, p_email text, p_role text, p_sector text, p_phone text default null, p_oab text default null)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_admin public.users_profiles%rowtype; v_profile_id uuid; v_role text; v_org uuid;
begin
  select * into v_admin from public.users_profiles where auth_user_id = auth.uid() and active is true limit 1;
  if not found or v_admin.role not in ('admin_master','admin','socio','rh') then raise exception 'Sem permissão para criar perfil de colaborador.'; end if;
  if coalesce(trim(p_email),'') = '' then return null; end if;
  v_org := v_admin.organization_id;
  v_role := lower(unaccent(coalesce(p_role,'funcionario')));
  v_role := case
    when v_role like '%admin%master%' then 'admin_master'
    when v_role like '%admin%' then 'admin'
    when v_role like '%socio%' or v_role like '%sócio%' then 'socio'
    when v_role like '%advog%' then 'advogado'
    when v_role like '%estag%' then 'estagiario'
    when v_role like '%financ%' then 'financeiro'
    when v_role like '%rh%' then 'rh'
    when v_role like '%control%' then 'controladoria'
    else 'funcionario' end;
  select id into v_profile_id from public.users_profiles where organization_id = v_org and lower(email) = lower(trim(p_email)) limit 1;
  if v_profile_id is null then
    insert into public.users_profiles(id,organization_id,name,email,phone,role,sector,oab,active,permissions,invitation_status,invited_by,invited_at,created_at,updated_at)
    values(gen_random_uuid(),v_org,coalesce(nullif(trim(p_name),''),p_email),lower(trim(p_email)),p_phone,v_role,coalesce(p_sector,'Operacional'),p_oab,true,'{}'::jsonb,'perfil_preparado_para_primeiro_acesso',v_admin.id,now(),now(),now())
    returning id into v_profile_id;
  else
    update public.users_profiles set name=coalesce(nullif(trim(p_name),''),name), phone=coalesce(p_phone,phone), role=v_role, sector=coalesce(p_sector,sector), oab=coalesce(p_oab,oab), active=true, invitation_status='perfil_atualizado_para_primeiro_acesso', updated_at=now()
    where id = v_profile_id;
  end if;
  update public.employees set profile_id=v_profile_id, email=lower(trim(p_email)), phone=coalesce(p_phone, phone) where id=p_employee_id;
  perform public.audit_event('upsert_staff_profile','equipe',v_profile_id,null,jsonb_build_object('email',p_email,'role',v_role),null);
  return v_profile_id;
end $$;
grant execute on function public.upsert_staff_profile_from_employee(uuid,text,text,text,text,text,text) to authenticated;

create or replace function public.client_portal_by_full_name(p_full_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text := lower(regexp_replace(trim(coalesce(p_full_name,'')), '\s+', ' ', 'g')); v_client public.clients%rowtype; v_org uuid; v_count int; v_process public.processes%rowtype;
begin
  if length(v_name) < 8 then raise exception 'Informe o nome completo do cliente.'; end if;
  select count(*) into v_count from public.clients c where lower(regexp_replace(trim(c.name),'\s+',' ','g'))=v_name and c.archived_at is null;
  if v_count > 1 then raise exception 'Há mais de um cadastro com esse nome. Fale com o escritório para liberar o portal com segurança.'; end if;
  select * into v_client from public.clients c where lower(regexp_replace(trim(c.name),'\s+',' ','g'))=v_name and c.archived_at is null order by c.created_at asc nulls last limit 1;
  if not found then
    select * into v_process from public.processes p where lower(regexp_replace(trim(coalesce(p.client_name,'')),'\s+',' ','g'))=v_name and p.archived_at is null order by p.created_at desc limit 1;
    if not found then return null; end if;
    insert into public.clients(id,organization_id,type,name,document,status,origin,responsible_id,created_at,updated_at)
    values(gen_random_uuid(),v_process.organization_id,'PF',initcap(v_name),'','ativo','Portal automático por processo',v_process.responsible_id,now(),now()) returning * into v_client;
    update public.processes set client_id=v_client.id where id=v_process.id;
  end if;
  v_org := v_client.organization_id;
  perform public.audit_event('acesso_portal_por_nome','portal',v_client.id,null,jsonb_build_object('client',v_client.name),v_client.id);
  return jsonb_build_object(
    'organizationId', v_org,
    'client', jsonb_build_object('id', v_client.id, 'organizationId', v_client.organization_id, 'type', coalesce(v_client.type,'PF'), 'name', v_client.name, 'document', coalesce(v_client.document,''), 'city', coalesce(v_client.address->>'city',''), 'origin', coalesce(v_client.origin,''), 'status', 'Ativo', 'responsible', coalesce(v_client.responsible_id::text,''), 'responsibleId', coalesce(v_client.responsible_id::text,''), 'processes', 0, 'lifetimeValue', 0, 'email', coalesce(v_client.email,''), 'phone', coalesce(v_client.phone,coalesce(v_client.whatsapp,'')), 'whatsapp', coalesce(v_client.whatsapp,coalesce(v_client.phone,'')), 'address', coalesce(v_client.address->>'street',v_client.address->>'full',''), 'notes', ''),
    'processes', coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'organizationId',p.organization_id,'cnj',coalesce(p.cnj,''),'type',initcap(coalesce(p.type,'judicial')),'client',v_client.name,'clientId',v_client.id,'opposite',coalesce(p.opposite_party,''),'court',coalesce(p.court,''),'class',coalesce(p.class_processual,''),'area',coalesce(p.area,''),'phase',coalesce(p.phase,''),'status',coalesce(p.status,''),'risk',coalesce(p.risk,'Médio'),'successChance',coalesce(p.success_chance,0),'value',coalesce(p.claim_value,0),'fees',0,'responsible',coalesce(p.responsible_id::text,''),'responsibleId',coalesce(p.responsible_id::text,''),'nextDeadline',coalesce(p.expected_end_at::text,''),'lastMoveDays',0,'progress',coalesce(p.progress,0),'clientVisibleSummary',coalesce(p.client_visible_summary,p.phase,p.status,'')) order by p.created_at desc) from public.processes p where p.organization_id=v_org and p.client_id=v_client.id and p.archived_at is null),'[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'organizationId',d.organization_id,'name',d.name,'type',coalesce(d.type,'Documento'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(d.process_id::text,''),'status',coalesce(d.status,'Recebido'),'origin',coalesce(d.origin,'Upload'),'responsible',coalesce(d.responsible_id::text,''),'version',coalesce(d.version,'v1'),'fileName',d.file_name,'mimeType',d.mime_type,'storagePath',coalesce(d.storage_path,d.file_url),'clientVisible',true,'validationStatus',coalesce(d.validation_status,'Pendente'),'accessLevel','Cliente') order by d.created_at desc) from public.documents d where d.organization_id=v_org and d.client_id=v_client.id and coalesce(d.client_visible,false) is true and d.archived_at is null),'[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'organizationId',m.organization_id,'channel',coalesce(m.channel,'Chat'),'threadType',coalesce(m.thread_type,'cliente'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(m.process_id::text,''),'subject',coalesce(m.subject,''),'body',coalesce(m.body,m.subject,''),'status',initcap(coalesce(m.status,'Pendente')),'date',coalesce((m.created_at::date)::text,current_date::text),'senderName',coalesce(m.sender_name,''),'senderRole',coalesce(m.sender_role,''),'responsibleId',coalesce(m.responsible_id::text,''),'direction',coalesce(m.direction,'cliente_para_escritorio'),'priority',coalesce(m.priority,'Média'),'resolved',coalesce(m.resolved,false)) order by m.created_at asc) from public.messages m where m.organization_id=v_org and m.client_id=v_client.id and m.archived_at is null),'[]'::jsonb),
    'finances', coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'type',case when f.type='despesa' then 'Despesa' else 'Receita' end,'category',coalesce(f.category,''),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(f.process_id::text,''),'amount',coalesce(f.amount,0),'dueDate',coalesce(f.due_date::text,''),'paidAmount',coalesce(f.paid_amount,0),'status',initcap(coalesce(f.status,'Pendente')),'method',coalesce(f.method,'PIX'),'notes','') order by f.due_date desc) from public.financial_entries f where f.organization_id=v_org and f.client_id=v_client.id and f.archived_at is null),'[]'::jsonb),
    'pricings', coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'title',coalesce(pr.title,pr.service_type,'Proposta'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(pr.process_id::text,''),'area',coalesce(pr.area,''),'service',coalesce(pr.service_type,''),'minimum',coalesce(pr.minimum_value,0),'recommended',coalesce(pr.recommended_value,0),'premium',coalesce(pr.premium_value,0),'entry',coalesce(pr.entry_value,0),'successFee',0,'status',initcap(coalesce(pr.status,'Rascunho')),'createdAt',coalesce((pr.created_at::date)::text,current_date::text),'version',coalesce(pr.version,'v1')) order by pr.created_at desc) from public.pricing_proposals pr where pr.organization_id=v_org and pr.client_id=v_client.id and pr.archived_at is null),'[]'::jsonb),
    'deadlines','[]'::jsonb,'hearings','[]'::jsonb
  );
end $$;
grant execute on function public.client_portal_by_full_name(text) to anon, authenticated;

create or replace function public.portal_send_message(p_client_id uuid, p_process_id uuid, p_body text, p_priority text default 'Média') returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_resp uuid; v_id uuid:=gen_random_uuid();
begin
  select * into v_client from public.clients where id=p_client_id and archived_at is null limit 1; if not found then raise exception 'Cliente não encontrado.'; end if;
  if p_process_id is not null then select * into v_process from public.processes where id=p_process_id and client_id=v_client.id limit 1; v_resp := v_process.responsible_id; end if;
  insert into public.messages(id,organization_id,client_id,process_id,channel,subject,body,status,created_at,sender_name,sender_role,responsible_id,direction,thread_type,priority,resolved)
  values(v_id,v_client.organization_id,v_client.id,p_process_id,'Chat',left(coalesce(p_body,''),80),p_body,'pendente',now(),v_client.name,'cliente',v_resp,'cliente_para_escritorio','cliente',coalesce(p_priority,'Média'),false);
  insert into public.tasks(id,organization_id,client_id,process_id,title,description,responsible_id,sector,priority,status,due_at,created_at)
  values(gen_random_uuid(),v_client.organization_id,v_client.id,p_process_id,'Responder mensagem do cliente '||v_client.name,p_body,v_resp,'Advocacia',case when p_priority='Urgente' then 'Urgente' else 'Alta' end,'Pendente',now(),now());
  perform public.audit_event('enviar_mensagem_portal','portal',v_id,null,jsonb_build_object('body',p_body,'priority',p_priority),v_client.id);
  return jsonb_build_object('id',v_id,'organizationId',v_client.organization_id,'channel','Chat','threadType','cliente','client',v_client.name,'clientId',v_client.id,'processId',coalesce(p_process_id::text,''),'subject',left(coalesce(p_body,''),80),'body',p_body,'status','Pendente','date',current_date::text,'senderName',v_client.name,'senderRole','cliente','responsibleId',coalesce(v_resp::text,''),'direction','cliente_para_escritorio','priority',coalesce(p_priority,'Média'),'resolved',false);
end $$;
grant execute on function public.portal_send_message(uuid,uuid,text,text) to anon, authenticated;

create or replace function public.client_portal_insert_message(p_client_id uuid, p_client_name text, p_process_id uuid, p_body text, p_priority text default 'Média') returns jsonb language sql security definer set search_path=public as $$ select public.portal_send_message(p_client_id,p_process_id,p_body,p_priority); $$;
grant execute on function public.client_portal_insert_message(uuid,text,uuid,text,text) to anon, authenticated;

create or replace function public.portal_upload_document(p_client_id uuid, p_process_id uuid, p_name text, p_type text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_hash text, p_storage_path text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_client public.clients%rowtype; v_process public.processes%rowtype; v_resp uuid; v_id uuid:=gen_random_uuid();
begin
  select * into v_client from public.clients where id=p_client_id and archived_at is null limit 1; if not found then raise exception 'Cliente não encontrado.'; end if;
  if p_process_id is not null then select * into v_process from public.processes where id=p_process_id and client_id=v_client.id limit 1; v_resp := v_process.responsible_id; end if;
  insert into public.documents(id,organization_id,client_id,process_id,name,type,status,origin,version,responsible_id,file_name,mime_type,file_size_bytes,sha256_hash,storage_path,client_visible,access_level,validation_status,created_at,updated_at)
  values(v_id,v_client.organization_id,v_client.id,p_process_id,coalesce(nullif(p_name,''),'Documento do cliente'),coalesce(p_type,'Documento do cliente'),'Recebido','Scanner do cliente','v1',v_resp,p_file_name,p_mime_type,p_file_size_bytes,p_hash,p_storage_path,true,'Cliente','Pendente',now(),now());
  insert into public.tasks(id,organization_id,client_id,process_id,title,description,responsible_id,sector,priority,status,due_at,created_at)
  values(gen_random_uuid(),v_client.organization_id,v_client.id,p_process_id,'Conferir documento de '||v_client.name,coalesce(p_name,p_file_name,'Documento enviado pelo portal'),v_resp,'Controladoria','Alta','Pendente',now(),now());
  perform public.audit_event('upload_documento_portal','portal',v_id,null,jsonb_build_object('file',p_file_name),v_client.id);
  return jsonb_build_object('id',v_id,'organizationId',v_client.organization_id,'name',coalesce(nullif(p_name,''),'Documento do cliente'),'type',coalesce(p_type,'Documento do cliente'),'client',v_client.name,'clientId',v_client.id,'processId',coalesce(p_process_id::text,''),'status','Recebido','origin','Scanner do cliente','responsible',coalesce(v_resp::text,''),'version','v1','fileName',p_file_name,'mimeType',p_mime_type,'sizeBytes',p_file_size_bytes,'hash',p_hash,'storagePath',p_storage_path,'clientVisible',true,'validationStatus','Pendente','accessLevel','Cliente');
end $$;
grant execute on function public.portal_upload_document(uuid,uuid,text,text,text,text,bigint,text,text) to anon, authenticated;

create or replace function public.client_portal_register_document(p_client_id uuid, p_client_name text, p_process_id uuid, p_name text, p_type text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_hash text) returns jsonb language sql security definer set search_path=public as $$ select public.portal_upload_document(p_client_id,p_process_id,p_name,p_type,p_file_name,p_mime_type,p_file_size_bytes,p_hash,null); $$;
grant execute on function public.client_portal_register_document(uuid,text,uuid,text,text,text,text,bigint,text) to anon, authenticated;

create or replace function public.create_task_with_audit(p_payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid:=coalesce((p_payload->>'id')::uuid,gen_random_uuid()); begin insert into public.tasks(id,organization_id,client_id,process_id,title,description,responsible_id,sector,priority,status,due_at,created_at) values(v_id,(p_payload->>'organization_id')::uuid,(p_payload->>'client_id')::uuid,(p_payload->>'process_id')::uuid,p_payload->>'title',p_payload->>'description',(p_payload->>'responsible_id')::uuid,p_payload->>'sector',coalesce(p_payload->>'priority','Média'),coalesce(p_payload->>'status','Pendente'),coalesce((p_payload->>'due_at')::timestamptz,now()),now()) on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,updated_at=now(); perform public.audit_event('create_task_with_audit','tasks',v_id,null,p_payload,null); return v_id; end $$;
grant execute on function public.create_task_with_audit(jsonb) to authenticated;

create or replace function public.create_financial_entry_with_audit(p_payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid:=coalesce((p_payload->>'id')::uuid,gen_random_uuid()); begin insert into public.financial_entries(id,organization_id,client_id,process_id,type,category,amount,due_date,status,method,notes,created_at) values(v_id,(p_payload->>'organization_id')::uuid,(p_payload->>'client_id')::uuid,(p_payload->>'process_id')::uuid,coalesce(p_payload->>'type','receita'),p_payload->>'category',coalesce((p_payload->>'amount')::numeric,0),(p_payload->>'due_date')::date,coalesce(p_payload->>'status','pendente'),coalesce(p_payload->>'method','PIX'),p_payload->>'notes',now()) on conflict(id) do update set status=excluded.status, updated_at=now(); perform public.audit_event('create_financial_entry_with_audit','financial',v_id,null,p_payload,(p_payload->>'client_id')::uuid); return v_id; end $$;
grant execute on function public.create_financial_entry_with_audit(jsonb) to authenticated;

create or replace function public.move_process_workflow_stage(p_process_id uuid, p_stage text, p_summary text default null) returns uuid language plpgsql security definer set search_path=public as $$ begin update public.processes set phase=p_stage, client_visible_summary=coalesce(p_summary,client_visible_summary), updated_at=now() where id=p_process_id; perform public.audit_event('move_process_workflow_stage','processes',p_process_id,null,jsonb_build_object('stage',p_stage,'summary',p_summary),null); return p_process_id; end $$;
grant execute on function public.move_process_workflow_stage(uuid,text,text) to authenticated;

create or replace function public.convert_lead_to_client_case(p_lead_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$ declare v_lead public.leads%rowtype; v_client_id uuid; v_process_id uuid; begin select * into v_lead from public.leads where id=p_lead_id; if not found then raise exception 'Lead não encontrado.'; end if; insert into public.clients(id,organization_id,type,name,email,phone,origin,status,responsible_id,created_at,updated_at) values(gen_random_uuid(),v_lead.organization_id,coalesce(v_lead.type,'PF'),v_lead.name,v_lead.email,v_lead.phone,v_lead.origin,'ativo',v_lead.responsible_id,now(),now()) returning id into v_client_id; insert into public.processes(id,organization_id,client_id,client_name,area,type,phase,status,responsible_id,created_at,updated_at) values(gen_random_uuid(),v_lead.organization_id,v_client_id,v_lead.name,v_lead.area,'Consultivo','Triagem','Novo',v_lead.responsible_id,now(),now()) returning id into v_process_id; perform public.audit_event('convert_lead_to_client_case','crm',p_lead_id,to_jsonb(v_lead),jsonb_build_object('client_id',v_client_id,'process_id',v_process_id),v_client_id); return jsonb_build_object('client_id',v_client_id,'process_id',v_process_id); end $$;
grant execute on function public.convert_lead_to_client_case(uuid) to authenticated;

create or replace function public.approve_point_adjustment(p_adjustment_id uuid, p_status text, p_note text default null) returns uuid language plpgsql security definer set search_path=public as $$ begin update public.point_adjustment_requests set status=p_status, approved_at=now() where id=p_adjustment_id; perform public.audit_event('approve_point_adjustment','ponto',p_adjustment_id,null,jsonb_build_object('status',p_status,'note',p_note),null); return p_adjustment_id; end $$;
grant execute on function public.approve_point_adjustment(uuid,text,text) to authenticated;
