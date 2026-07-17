-- v5.1 · conversão transacional e idempotente do CRM
begin;
alter table if exists public.leads add column if not exists document text, add column if not exists consent_accepted boolean not null default false,
 add column if not exists loss_notes text, add column if not exists lost_at timestamptz, add column if not exists lost_by uuid, add column if not exists competitor text,
 add column if not exists converted_at timestamptz, add column if not exists converted_by uuid, add column if not exists conversion_client_id uuid references public.clients(id),
 add column if not exists conversion_process_id uuid references public.processes(id), add column if not exists conversion_status text,
 add column if not exists conversion_idempotency_key text, add column if not exists checklist jsonb not null default '[]'::jsonb, add column if not exists version integer not null default 0;
create unique index if not exists leads_conversion_key_uidx on public.leads(organization_id,conversion_idempotency_key) where conversion_idempotency_key is not null;
create index if not exists clients_org_email_idx on public.clients(organization_id,lower(email)) where email is not null;
create index if not exists clients_org_phone_idx on public.clients(organization_id,phone) where phone is not null;

create or replace function public.nex_v51_convert_lead(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_lead uuid:=(p_operation->>'leadId')::uuid; v_key text:=p_operation->>'idempotencyKey'; v_reuse uuid:=nullif(p_operation->>'reuseClientId','')::uuid;
 v_claim public.operation_idempotency%rowtype; v_l public.leads%rowtype; v_client uuid; v_process uuid; v_template uuid;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
 select * into v_claim from public.nex_v51_claim_idempotency('convert_lead',v_key); if v_claim.status='completed' then return v_claim.result; end if;
 select * into v_l from public.leads where id=v_lead and organization_id=v_org for update; if not found then raise exception 'LEAD_NOT_FOUND'; end if;
 if v_l.conversion_status='completed' and v_l.conversion_client_id is not null then perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_l.conversion_process_id,jsonb_build_object('id',v_l.conversion_process_id,'clientId',v_l.conversion_client_id,'existing',true)); return jsonb_build_object('id',v_l.conversion_process_id,'clientId',v_l.conversion_client_id,'existing',true); end if;
 if trim(coalesce(v_l.name,''))='' or (trim(coalesce(v_l.phone,''))='' and trim(coalesce(v_l.email,''))='') then raise exception 'LEAD_MINIMUM_DATA_REQUIRED'; end if;
 if v_reuse is not null then select id into v_client from public.clients where id=v_reuse and organization_id=v_org and archived_at is null; end if;
 if v_client is null then select id into v_client from public.clients where organization_id=v_org and archived_at is null and ((nullif(v_l.document,'') is not null and document=v_l.document) or (nullif(v_l.email,'') is not null and lower(email)=lower(v_l.email)) or (nullif(v_l.phone,'') is not null and (phone=v_l.phone or whatsapp=v_l.phone))) order by created_at limit 1; end if;
 if v_client is null then insert into public.clients(organization_id,type,name,document,email,phone,whatsapp,origin,status,responsible_id,notes,created_at,updated_at) values(v_org,coalesce(v_l.type,'PF'),v_l.name,coalesce(v_l.document,''),v_l.email,v_l.phone,v_l.phone,v_l.origin,'ativo',v_l.responsible_id,v_l.notes,now(),now()) returning id into v_client; end if;
 insert into public.processes(organization_id,client_id,cnj,type,active_pole,passive_pole,subject,court,class_processual,area,phase,status,risk,success_chance,claim_value,fees_value,responsible_id,expected_end_at,progress,client_visible_summary,internal_strategy,source,opened_at,version,created_at,updated_at)
 values(v_org,v_client,'','extrajudicial',v_l.name,'A definir',coalesce(v_l.demand_type,v_l.area),'Controle interno',coalesce(v_l.demand_type,'Novo caso'),v_l.area,'Triagem','Novo caso','Médio',50,coalesce(v_l.estimated_value,0),round(coalesce(v_l.estimated_value,0)*0.30,2),v_l.responsible_id,v_l.next_contact,0,'Caso recebido e em triagem jurídica.',v_l.notes,'CRM:'||coalesce(v_l.origin,''),current_date,1,now(),now()) returning id into v_process;
 insert into public.process_movements(organization_id,process_id,movement_type,title,description,source,visibility,created_by) values(v_org,v_process,'crm_conversion','Caso convertido pelo CRM','Cliente e processo confirmados na mesma transação.','workflow','internal',auth.uid());
 update public.leads set stage='Cliente convertido',converted_at=now(),converted_by=auth.uid(),conversion_client_id=v_client,conversion_process_id=v_process,conversion_status='completed',conversion_idempotency_key=v_key,version=version+1,updated_at=now() where id=v_lead;
 select id into v_template from public.workflow_templates where organization_id=v_org and active is true and archived_at is null order by case when coalesce(module_area,legal_area)=v_l.area then 0 else 1 end,created_at limit 1;
 if v_template is not null then perform public.nex_v51_start_workflow(jsonb_build_object('type','startWorkflow','processId',v_process,'workflowTemplateId',v_template,'idempotencyKey',v_key||':workflow')); end if;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_process,jsonb_build_object('id',v_process,'clientId',v_client)); return jsonb_build_object('id',v_process,'clientId',v_client);
exception when others then update public.leads set conversion_status='failed',version=version+1,updated_at=now() where id=v_lead and organization_id=v_org; raise;
end $$;
grant execute on function public.nex_v51_convert_lead(jsonb) to authenticated;
commit;
