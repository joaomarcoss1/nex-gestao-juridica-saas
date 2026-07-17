-- Nex Gestão Jurídica v5.2 · processos e workflow com validação de referência e concorrência
begin;

create or replace function public.nex_v52_create_process(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_data jsonb:=p_operation->'process'; v_result jsonb; v_process uuid; v_template uuid:=nullif(p_operation->>'startWorkflowTemplateId','')::uuid;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','atendimento']);
  perform public.nex_v52_assert_reference('client',nullif(v_data->>'clientId','')::uuid,true);
  perform public.nex_v52_assert_reference('profile',nullif(v_data->>'responsible','')::uuid,false);
  if v_template is not null then perform public.nex_v52_assert_reference('workflow_template',v_template,true); end if;
  v_result:=public.nex_v51_create_process(p_operation); v_process:=(v_result->>'id')::uuid;
  if v_template is not null then perform public.nex_v52_start_workflow(jsonb_build_object('type','startWorkflow','processId',v_process,'workflowTemplateId',v_template,'idempotencyKey',(p_operation->>'idempotencyKey')||':workflow')); end if;
  perform public.nex_v52_record_audit('processes','create',v_process::text,null,v_data);
  return v_result;
end $$;

create or replace function public.nex_v52_change_process_phase(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=(p_operation->>'processId')::uuid; v_expected integer:=nullif(p_operation->>'expectedVersion','')::integer; v_current integer; v_result jsonb;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria']);
  perform public.nex_v52_assert_reference('process',v_id,true);
  select version into v_current from public.processes where id=v_id and organization_id=public.nex_current_org_id() for update;
  if v_expected is not null and v_expected<>v_current then raise exception 'VERSION_CONFLICT'; end if;
  if exists(select 1 from public.tasks where organization_id=public.nex_current_org_id() and process_id=v_id and archived_at is null and status not in ('Concluída','Cancelada') and (priority='Crítica' or jsonb_array_length(coalesce(blockers,'[]'::jsonb))>0 or jsonb_array_length(coalesce(checklist_completed,'[]'::jsonb))<jsonb_array_length(coalesce(checklist,'[]'::jsonb)))) then raise exception 'PROCESS_PHASE_BLOCKED'; end if;
  v_result:=public.nex_v51_change_process_phase(p_operation);
  update public.processes p set progress=coalesce((select round(100.0*count(*) filter(where s.status='completed')/nullif(count(*),0))::integer from public.workflow_run_steps s join public.workflow_runs r on r.id=s.workflow_run_id where r.process_id=p.id and r.archived_at is null),p.progress),updated_at=now() where p.id=v_id;
  perform public.nex_v52_record_audit('processes','change_phase',v_id::text,jsonb_build_object('version',v_current),p_operation);
  return v_result;
end $$;

create or replace function public.nex_v52_close_process(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=(p_operation->>'processId')::uuid; v_expected integer:=nullif(p_operation->>'expectedVersion','')::integer; v_current integer; v_force boolean:=coalesce((p_operation->>'force')::boolean,false); v_result jsonb;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado']);
  perform public.nex_v52_assert_reference('process',v_id,true);
  select version into v_current from public.processes where id=v_id and organization_id=public.nex_current_org_id() for update;
  if v_expected is not null and v_expected<>v_current then raise exception 'VERSION_CONFLICT'; end if;
  if not v_force and (
    exists(select 1 from public.hearings where organization_id=public.nex_current_org_id() and process_id=v_id and hearing_at>now() and lower(status) not in ('cancelada','realizada')) or
    exists(select 1 from public.financial_entries where organization_id=public.nex_current_org_id() and process_id=v_id and archived_at is null and lower(status) in ('pending','pendente','partially_paid','parcial','overdue','atrasado') and amount>coalesce(paid_amount,0)) or
    exists(select 1 from public.pricing_proposals where organization_id=public.nex_current_org_id() and process_id=v_id and lower(status) in ('pendente','enviada','draft'))
  ) then raise exception 'PROCESS_HAS_PENDING_ITEMS'; end if;
  v_result:=public.nex_v51_close_process(p_operation);
  perform public.nex_v52_record_audit('processes','close',v_id::text,jsonb_build_object('version',v_current),p_operation);
  return v_result;
end $$;

create or replace function public.nex_v52_simulate_judicial_sync(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria']);
  perform public.nex_v52_assert_reference('process',(p_operation->>'processId')::uuid,true);
  return public.nex_v51_simulate_judicial_sync(p_operation);
end $$;

create or replace function public.nex_v52_start_workflow(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid:=public.nex_current_org_id(); v_process uuid:=(p_operation->>'processId')::uuid;
  v_template uuid:=(p_operation->>'workflowTemplateId')::uuid; v_key text:=p_operation->>'idempotencyKey';
  v_claim public.operation_idempotency%rowtype; v_run uuid; v_step record; v_task uuid; v_run_step uuid; v_status text;
  v_condition boolean; v_min_order integer; v_process_row public.processes%rowtype;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria']);
  perform public.nex_v52_assert_reference('process',v_process,true);
  perform public.nex_v52_assert_reference('workflow_template',v_template,true);
  select * into v_process_row from public.processes where id=v_process and organization_id=v_org for update;
  select * into v_claim from public.nex_v51_claim_idempotency('start_workflow_v52',v_key);
  if v_claim.status='completed' then return v_claim.result; end if;
  select id into v_run from public.workflow_runs
   where organization_id=v_org and process_id=v_process and workflow_template_id=v_template
     and status in ('pending','active') and archived_at is null limit 1;
  if v_run is not null then
    perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_run,jsonb_build_object('id',v_run,'existing',true));
    return jsonb_build_object('id',v_run,'existing',true);
  end if;

  insert into public.workflow_runs(organization_id,workflow_template_id,process_id,client_id,status,current_step_order,started_by,idempotency_key,version)
  values(v_org,v_template,v_process,v_process_row.client_id,'active',1,public.nex_current_profile_id(),v_key,1)
  returning id into v_run;

  for v_step in
    select * from public.workflow_steps
     where coalesce(workflow_id,workflow_template_id)=v_template and archived_at is null
     order by step_order,id
  loop
    v_condition := case coalesce(v_step.condition_type,'always')
      when 'always' then true
      when 'process_field_equals' then
        case v_step.condition_payload->>'field'
          when 'area' then coalesce(v_process_row.area,'')=coalesce(v_step.condition_payload->>'value','')
          when 'phase' then coalesce(v_process_row.phase,'')=coalesce(v_step.condition_payload->>'value','')
          when 'status' then coalesce(v_process_row.status,'')=coalesce(v_step.condition_payload->>'value','')
          when 'risk' then coalesce(v_process_row.risk,'')=coalesce(v_step.condition_payload->>'value','')
          else false
        end
      when 'process_value_gte' then coalesce(v_process_row.claim_value,0)>=coalesce((v_step.condition_payload->>'value')::numeric,0)
      else false
    end;
    v_status := case when v_condition then 'pending' else 'skipped' end;
    v_task := null;
    if v_condition and coalesce(v_step.creates_task,true) then
      insert into public.tasks(
        organization_id,process_id,client_id,title,description,responsible_id,sector,priority,status,due_at,
        estimated_hours,spent_hours,workflow_stage,sla_hours,checklist,checklist_completed,workflow_run_id,
        estimated_minutes,worked_minutes,billable_minutes,created_at,updated_at
      )
      values(
        v_org,v_process,v_process_row.client_id,coalesce(v_step.task_title,v_step.name),'Etapa persistente do workflow.',
        v_process_row.responsible_id,coalesce(v_step.responsible_role,v_step.default_responsible_role,'Jurídico'),
        coalesce(v_step.auto_priority,'Média'),'Aguardando cliente',
        now()+make_interval(hours=>greatest(1,coalesce(v_step.sla_hours,24))),
        0,0,'Execução',coalesce(v_step.sla_hours,24),coalesce(v_step.checklist,'[]'::jsonb),'[]'::jsonb,v_run,0,0,0,now(),now()
      ) returning id into v_task;
    end if;
    insert into public.workflow_run_steps(
      organization_id,workflow_run_id,workflow_step_id,task_id,step_order,status,execution_group,
      condition_type,condition_payload,required_approver_role,required_document_type,sla_started_at,sla_due_at,version,result
    )
    values(
      v_org,v_run,v_step.id,v_task,v_step.step_order,v_status,coalesce(v_step.execution_group,'default'),
      v_step.condition_type,coalesce(v_step.condition_payload,'{}'::jsonb),v_step.required_approver_role,
      case when coalesce(v_step.required_document_type,'')<>'' then v_step.required_document_type when coalesce(v_step.requires_document,false) then 'Documento obrigatório' else null end,
      case when v_condition then now() else null end,
      case when v_condition then now()+make_interval(hours=>greatest(1,coalesce(v_step.sla_hours,24))) else null end,
      1,case when v_condition then '{}'::jsonb else jsonb_build_object('skipReason','condition_not_met') end
    ) returning id into v_run_step;
    if v_task is not null then
      update public.tasks set workflow_run_step_id=v_run_step,updated_at=now() where id=v_task and organization_id=v_org;
    end if;
  end loop;

  select min(step_order) into v_min_order from public.workflow_run_steps where workflow_run_id=v_run and status='pending';
  if v_min_order is null then
    update public.workflow_runs set status='completed',completed_at=now(),version=version+1,updated_at=now() where id=v_run;
  else
    update public.workflow_run_steps set status='available',started_at=coalesce(started_at,now()),version=version+1,updated_at=now()
     where workflow_run_id=v_run and step_order=v_min_order and status='pending';
    update public.tasks set status='Pendente',updated_at=now()
     where workflow_run_step_id in (select id from public.workflow_run_steps where workflow_run_id=v_run and step_order=v_min_order);
    update public.workflow_runs set current_step_order=v_min_order,version=version+1,updated_at=now() where id=v_run;
  end if;
  perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_run,jsonb_build_object('id',v_run));
  perform public.nex_v52_record_audit('workflow','start',v_run::text,null,p_operation);
  return jsonb_build_object('id',v_run);
end $$;

create or replace function public.nex_v52_complete_workflow_step(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid:=public.nex_current_org_id(); v_step_id uuid:=(p_operation->>'runStepId')::uuid;
  v_step public.workflow_run_steps%rowtype; v_task public.tasks%rowtype; v_run public.workflow_runs%rowtype;
  v_required_role text; v_next_order integer; v_worked integer:=greatest(0,coalesce((p_operation->>'workedMinutes')::integer,0));
  v_billable integer:=greatest(0,coalesce((p_operation->>'billableMinutes')::integer,v_worked));
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','funcionario']);
  perform public.nex_v52_assert_reference('workflow_run_step',v_step_id,true);
  select * into v_step from public.workflow_run_steps where id=v_step_id and organization_id=v_org for update;
  if v_step.status='completed' then return jsonb_build_object('id',v_step_id,'existing',true); end if;
  if v_step.status not in ('available','in_progress','awaiting_review') then raise exception 'WORKFLOW_STEP_NOT_AVAILABLE'; end if;
  select * into v_run from public.workflow_runs where id=v_step.workflow_run_id and organization_id=v_org for update;
  if v_step.task_id is not null then select * into v_task from public.tasks where id=v_step.task_id and organization_id=v_org for update; end if;
  v_required_role:=v_step.required_approver_role;
  if v_task.id is not null and v_task.responsible_id is not null and v_task.responsible_id<>public.nex_current_profile_id()
     and lower(public.nex_current_role()) not in ('admin_empresa','admin','socio','controladoria') then raise exception 'WORKFLOW_STEP_NOT_ASSIGNED'; end if;
  if nullif(v_required_role,'') is not null and lower(public.nex_current_role())<>lower(v_required_role)
     and lower(public.nex_current_role()) not in ('admin_empresa','admin','socio') then raise exception 'WORKFLOW_APPROVER_REQUIRED'; end if;
  if exists(select 1 from public.workflow_run_steps prior where prior.workflow_run_id=v_step.workflow_run_id and prior.step_order<v_step.step_order and prior.status not in ('completed','skipped','cancelled')) then raise exception 'WORKFLOW_DEPENDENCY_PENDING'; end if;
  if v_task.id is not null and (jsonb_array_length(coalesce(v_task.blockers,'[]'::jsonb))>0
     or jsonb_array_length(coalesce(v_task.checklist_completed,'[]'::jsonb))<jsonb_array_length(coalesce(v_task.checklist,'[]'::jsonb))) then raise exception 'WORKFLOW_STEP_BLOCKED'; end if;
  if nullif(v_step.required_document_type,'') is not null and not exists(
    select 1 from public.documents d where d.organization_id=v_org and d.process_id=v_run.process_id and d.archived_at is null
      and lower(coalesce(d.type,''))=lower(v_step.required_document_type)
  ) then raise exception 'WORKFLOW_REQUIRED_DOCUMENT_MISSING'; end if;

  update public.workflow_run_steps set status='completed',completed_at=now(),sla_breached_at=case when sla_due_at is not null and now()>sla_due_at then coalesce(sla_breached_at,now()) else sla_breached_at end,version=version+1,updated_at=now() where id=v_step_id;
  if v_task.id is not null then
    update public.tasks set status='Concluída',completed_at=now(),worked_minutes=v_worked,billable_minutes=v_billable,spent_hours=v_worked/60.0,version=version+1,updated_at=now() where id=v_task.id;
  end if;

  if not exists(select 1 from public.workflow_run_steps s where s.workflow_run_id=v_step.workflow_run_id and s.step_order=v_step.step_order and s.status not in ('completed','skipped','cancelled')) then
    select min(step_order) into v_next_order from public.workflow_run_steps where workflow_run_id=v_step.workflow_run_id and step_order>v_step.step_order and status='pending';
    if v_next_order is null then
      update public.workflow_runs set status='completed',completed_at=now(),version=version+1,updated_at=now() where id=v_step.workflow_run_id;
    else
      update public.workflow_run_steps set status='available',started_at=coalesce(started_at,now()),version=version+1,updated_at=now()
       where workflow_run_id=v_step.workflow_run_id and step_order=v_next_order and status='pending';
      update public.tasks set status='Pendente',updated_at=now()
       where workflow_run_step_id in (select id from public.workflow_run_steps where workflow_run_id=v_step.workflow_run_id and step_order=v_next_order);
      update public.workflow_runs set current_step_order=v_next_order,version=version+1,updated_at=now() where id=v_step.workflow_run_id;
    end if;
  end if;
  perform public.nex_v52_record_audit('workflow','complete_step',v_step_id::text,null,p_operation);
  return jsonb_build_object('id',v_step_id,'runId',v_step.workflow_run_id);
end $$;

revoke all on function public.nex_v52_create_process(jsonb),public.nex_v52_change_process_phase(jsonb),public.nex_v52_close_process(jsonb),public.nex_v52_simulate_judicial_sync(jsonb),public.nex_v52_start_workflow(jsonb),public.nex_v52_complete_workflow_step(jsonb) from public,anon;
grant execute on function public.nex_v52_create_process(jsonb),public.nex_v52_change_process_phase(jsonb),public.nex_v52_close_process(jsonb),public.nex_v52_simulate_judicial_sync(jsonb),public.nex_v52_start_workflow(jsonb),public.nex_v52_complete_workflow_step(jsonb) to authenticated;
commit;
