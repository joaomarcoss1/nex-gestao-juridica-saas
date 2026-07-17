-- v5.1 · motor persistente de workflow
begin;
alter table if exists public.workflow_templates add column if not exists module_area text, add column if not exists description text, add column if not exists archived_at timestamptz;
update public.workflow_templates set module_area=coalesce(module_area,legal_area,'Geral') where module_area is null;
alter table if exists public.workflow_steps add column if not exists workflow_id uuid, add column if not exists creates_task boolean default true, add column if not exists task_title text, add column if not exists responsible_role text, add column if not exists requires_document boolean default false, add column if not exists notify_client boolean default false, add column if not exists auto_priority text default 'Média', add column if not exists archived_at timestamptz;
update public.workflow_steps set workflow_id=coalesce(workflow_id,workflow_template_id), responsible_role=coalesce(responsible_role,default_responsible_role) where workflow_id is null or responsible_role is null;
create table if not exists public.workflow_runs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 workflow_template_id uuid not null references public.workflow_templates(id), process_id uuid references public.processes(id) on delete cascade,
 client_id uuid references public.clients(id), lead_id uuid references public.leads(id), status text not null default 'active', current_step_order integer not null default 1,
 started_at timestamptz not null default now(), completed_at timestamptz, cancelled_at timestamptz, started_by uuid, idempotency_key text not null,
 metadata jsonb not null default '{}'::jsonb, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key)
);
create unique index if not exists workflow_runs_active_unique on public.workflow_runs(organization_id,process_id,workflow_template_id) where status in ('pending','active') and archived_at is null;
create table if not exists public.workflow_run_steps (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade, workflow_step_id uuid not null references public.workflow_steps(id), task_id uuid references public.tasks(id),
 step_order integer not null, status text not null default 'pending', depends_on_step_id uuid references public.workflow_run_steps(id), started_at timestamptz,
 completed_at timestamptz, skipped_at timestamptz, blocked_reason text, result jsonb not null default '{}'::jsonb, archived_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workflow_run_id,workflow_step_id)
);
alter table if exists public.tasks add column if not exists workflow_run_id uuid references public.workflow_runs(id), add column if not exists workflow_run_step_id uuid references public.workflow_run_steps(id), add column if not exists checklist_completed jsonb not null default '[]'::jsonb, add column if not exists estimated_minutes integer not null default 0, add column if not exists worked_minutes integer not null default 0, add column if not exists billable_minutes integer not null default 0, add column if not exists meeting_id uuid, add column if not exists version integer not null default 0;

create or replace function public.nex_v51_start_workflow(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_process uuid:=(p_operation->>'processId')::uuid; v_template uuid:=(p_operation->>'workflowTemplateId')::uuid; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_run uuid; v_prev uuid; v_step record; v_task uuid; v_first boolean:=true;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','advogado','controladoria']);
 select * into v_claim from public.nex_v51_claim_idempotency('start_workflow',v_key);
 if v_claim.status='completed' then return v_claim.result; end if;
 select id into v_run from public.workflow_runs where organization_id=v_org and process_id=v_process and workflow_template_id=v_template and status in ('pending','active') limit 1;
 if v_run is not null then perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_run,jsonb_build_object('id',v_run,'existing',true)); return jsonb_build_object('id',v_run,'existing',true); end if;
 insert into public.workflow_runs(organization_id,workflow_template_id,process_id,client_id,status,current_step_order,started_by,idempotency_key)
 select v_org,v_template,p.id,p.client_id,'active',coalesce((select min(step_order) from public.workflow_steps where workflow_id=v_template),1),auth.uid(),v_key from public.processes p where p.id=v_process and p.organization_id=v_org returning id into v_run;
 if v_run is null then raise exception 'PROCESS_NOT_FOUND'; end if;
 for v_step in select * from public.workflow_steps where workflow_id=v_template and archived_at is null order by step_order loop
   v_task:=null;
   if coalesce(v_step.creates_task,true) then
     insert into public.tasks(organization_id,process_id,client_id,title,description,responsible_id,sector,priority,status,due_at,estimated_hours,spent_hours,workflow_stage,sla_hours,checklist,workflow_run_id,estimated_minutes,worked_minutes,billable_minutes)
     select v_org,p.id,p.client_id,coalesce(v_step.task_title,v_step.name),'Etapa persistente do workflow.',p.responsible_id,coalesce(v_step.responsible_role,'Jurídico'),coalesce(v_step.auto_priority,'Média'),case when v_first then 'Pendente' else 'Aguardando cliente' end,now()+make_interval(days=>greatest(1,v_step.step_order)),0,0,case when v_first then 'Triagem' else 'Execução' end,24,case when v_step.requires_document then '["Anexar documento obrigatório"]'::jsonb else '[]'::jsonb end,v_run,60,0,0 from public.processes p where p.id=v_process returning id into v_task;
   end if;
   insert into public.workflow_run_steps(organization_id,workflow_run_id,workflow_step_id,task_id,step_order,status,depends_on_step_id) values(v_org,v_run,v_step.id,v_task,v_step.step_order,case when v_first then 'available' else 'pending' end,v_prev) returning id into v_prev;
   if v_task is not null then update public.tasks set workflow_run_step_id=v_prev where id=v_task; end if;
   v_first:=false;
 end loop;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_run,jsonb_build_object('id',v_run)); return jsonb_build_object('id',v_run);
end $$;
grant execute on function public.nex_v51_start_workflow(jsonb) to authenticated;

create or replace function public.nex_v51_complete_workflow_step(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_step uuid:=(p_operation->>'runStepId')::uuid; v_worked int:=greatest(0,coalesce((p_operation->>'workedMinutes')::int,0)); v_bill int:=greatest(0,coalesce((p_operation->>'billableMinutes')::int,v_worked)); v_run uuid; v_next uuid;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','advogado','controladoria','funcionario']);
 select workflow_run_id into v_run from public.workflow_run_steps where id=v_step and organization_id=v_org for update;
 if v_run is null then raise exception 'WORKFLOW_STEP_NOT_FOUND'; end if;
 if exists(select 1 from public.workflow_run_steps s join public.tasks t on t.id=s.task_id where s.id=v_step and (jsonb_array_length(coalesce(t.blockers,'[]'::jsonb))>0 or jsonb_array_length(coalesce(t.checklist_completed,'[]'::jsonb))<jsonb_array_length(coalesce(t.checklist,'[]'::jsonb)))) then raise exception 'WORKFLOW_STEP_BLOCKED'; end if;
 update public.workflow_run_steps set status='completed',completed_at=now(),updated_at=now() where id=v_step and status<>'completed';
 update public.tasks set status='Concluída',completed_at=now(),worked_minutes=v_worked,billable_minutes=v_bill,spent_hours=v_worked/60.0,updated_at=now() where workflow_run_step_id=v_step;
 select id into v_next from public.workflow_run_steps where workflow_run_id=v_run and status='pending' order by step_order limit 1;
 if v_next is null then update public.workflow_runs set status='completed',completed_at=now(),updated_at=now() where id=v_run; else update public.workflow_run_steps set status='available',updated_at=now() where id=v_next; update public.tasks set status='Pendente',updated_at=now() where workflow_run_step_id=v_next; update public.workflow_runs set current_step_order=(select step_order from public.workflow_run_steps where id=v_next),updated_at=now() where id=v_run; end if;
 return jsonb_build_object('id',v_step,'runId',v_run);
end $$;
grant execute on function public.nex_v51_complete_workflow_step(jsonb) to authenticated;
commit;
