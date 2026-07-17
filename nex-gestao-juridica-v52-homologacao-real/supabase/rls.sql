-- Nex Gestão Jurídica v3 — RLS Produção Segura
-- Execute depois de supabase/schema.sql.
-- Usa public.users_profiles, não usa public.profiles, e evita create policy if not exists.

create or replace function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.users_profiles where auth_user_id = auth.uid() and active is true limit 1
$$;

create or replace function public.current_profile_org()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.users_profiles where auth_user_id = auth.uid() and active is true limit 1
$$;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users_profiles where auth_user_id = auth.uid() and active is true limit 1
$$;

create or replace function public.is_admin_or_partner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio'), false)
$$;

create or replace function public.can_access_financial()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','financeiro'), false)
$$;

create or replace function public.can_access_hr()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','rh'), false)
$$;

create or replace function public.can_access_process(process_responsible uuid default null)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','controladoria') or process_responsible = public.current_profile_id(), false)
$$;

create or replace function public.can_access_client(client_responsible uuid default null)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(public.current_profile_role() in ('admin_master','admin','socio','atendimento','controladoria','financeiro') or client_responsible = public.current_profile_id(), false)
$$;

alter table public.organizations enable row level security;
alter table public.users_profiles enable row level security;
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.processes enable row level security;
alter table public.deadlines enable row level security;
alter table public.tasks enable row level security;
alter table public.financial_entries enable row level security;
alter table public.pricing_proposals enable row level security;
alter table public.documents enable row level security;
alter table public.time_records enable row level security;
alter table public.payrolls enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_state_snapshots enable row level security;
alter table public.legal_holidays enable row level security;
alter table public.pricing_templates enable row level security;
alter table public.pricing_oab_references enable row level security;
alter table public.pricing_versions enable row level security;

-- ORGANIZAÇÕES
drop policy if exists org_select_organizations on public.organizations;
create policy org_select_organizations on public.organizations for select using (id = public.current_profile_org());
drop policy if exists org_modify_organizations on public.organizations;
create policy org_modify_organizations on public.organizations for all using (id = public.current_profile_org() and public.is_admin_or_partner()) with check (id = public.current_profile_org());

-- PERFIS
drop policy if exists org_select_users_profiles on public.users_profiles;
create policy org_select_users_profiles on public.users_profiles for select using (organization_id = public.current_profile_org() or id = public.current_profile_id());
drop policy if exists org_modify_users_profiles on public.users_profiles;
create policy org_modify_users_profiles on public.users_profiles for all using (organization_id = public.current_profile_org() and public.is_admin_or_partner()) with check (organization_id = public.current_profile_org());

-- Funcionários
drop policy if exists org_select_employees on public.employees;
create policy org_select_employees on public.employees for select using (organization_id = public.current_profile_org() and (public.can_access_hr() or profile_id = public.current_profile_id() or public.current_profile_role() in ('admin_master','admin','socio')));
drop policy if exists org_modify_employees on public.employees;
create policy org_modify_employees on public.employees for all using (organization_id = public.current_profile_org() and public.can_access_hr()) with check (organization_id = public.current_profile_org());

-- CLIENTES
drop policy if exists org_select_clients on public.clients;
create policy org_select_clients on public.clients for select using (organization_id = public.current_profile_org() and (public.current_profile_role() <> 'cliente'));
drop policy if exists org_modify_clients on public.clients;
create policy org_modify_clients on public.clients for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','atendimento','advogado','controladoria')) with check (organization_id = public.current_profile_org());

-- LEADS
drop policy if exists org_select_leads on public.leads;
create policy org_select_leads on public.leads for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','atendimento','advogado'));
drop policy if exists org_modify_leads on public.leads;
create policy org_modify_leads on public.leads for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','atendimento','advogado')) with check (organization_id = public.current_profile_org());

-- PROCESSOS
drop policy if exists org_select_processes on public.processes;
create policy org_select_processes on public.processes for select using (organization_id = public.current_profile_org() and (public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','financeiro') or responsible_id = public.current_profile_id()));
drop policy if exists org_modify_processes on public.processes;
create policy org_modify_processes on public.processes for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')) with check (organization_id = public.current_profile_org());

-- PRAZOS
drop policy if exists org_select_deadlines on public.deadlines;
create policy org_select_deadlines on public.deadlines for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria'));
drop policy if exists org_modify_deadlines on public.deadlines;
create policy org_modify_deadlines on public.deadlines for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')) with check (organization_id = public.current_profile_org());

-- TAREFAS
drop policy if exists org_select_tasks on public.tasks;
create policy org_select_tasks on public.tasks for select using (organization_id = public.current_profile_org() and (responsible_id = public.current_profile_id() or public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')));
drop policy if exists org_modify_tasks on public.tasks;
create policy org_modify_tasks on public.tasks for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')) with check (organization_id = public.current_profile_org());

-- FINANCEIRO
drop policy if exists org_select_financial on public.financial_entries;
create policy org_select_financial on public.financial_entries for select using (organization_id = public.current_profile_org() and public.can_access_financial());
drop policy if exists org_modify_financial on public.financial_entries;
create policy org_modify_financial on public.financial_entries for all using (organization_id = public.current_profile_org() and public.can_access_financial()) with check (organization_id = public.current_profile_org());

-- PRECIFICAÇÃO
drop policy if exists org_select_pricing on public.pricing_proposals;
create policy org_select_pricing on public.pricing_proposals for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro','atendimento'));
drop policy if exists org_modify_pricing on public.pricing_proposals;
create policy org_modify_pricing on public.pricing_proposals for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro')) with check (organization_id = public.current_profile_org());

-- DOCUMENTOS
drop policy if exists org_select_documents on public.documents;
create policy org_select_documents on public.documents for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_documents on public.documents;
create policy org_modify_documents on public.documents for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','cliente')) with check (organization_id = public.current_profile_org());

-- PONTO E FOLHA
drop policy if exists org_select_time_records on public.time_records;
create policy org_select_time_records on public.time_records for select using (organization_id = public.current_profile_org() and (public.can_access_hr() or exists (select 1 from public.employees e where e.id = time_records.employee_id and e.profile_id = public.current_profile_id())));
drop policy if exists org_modify_time_records on public.time_records;
create policy org_modify_time_records on public.time_records for all using (organization_id = public.current_profile_org() and (public.can_access_hr() or public.current_profile_role() = 'funcionario')) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_payrolls on public.payrolls;
create policy org_select_payrolls on public.payrolls for select using (organization_id = public.current_profile_org() and (public.can_access_hr() or exists (select 1 from public.employees e where e.id = payrolls.employee_id and e.profile_id = public.current_profile_id())));
drop policy if exists org_modify_payrolls on public.payrolls;
create policy org_modify_payrolls on public.payrolls for all using (organization_id = public.current_profile_org() and public.can_access_hr()) with check (organization_id = public.current_profile_org());

-- COMUNICAÇÃO, NOTIFICAÇÕES E AUTOMAÇÕES
drop policy if exists org_select_messages on public.messages;
create policy org_select_messages on public.messages for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_messages on public.messages;
create policy org_modify_messages on public.messages for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_notifications on public.notifications;
create policy org_select_notifications on public.notifications for select using (organization_id = public.current_profile_org() and (user_id = public.current_profile_id() or user_id is null));
drop policy if exists org_modify_notifications on public.notifications;
create policy org_modify_notifications on public.notifications for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_automations on public.automation_rules;
create policy org_select_automations on public.automation_rules for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_automations on public.automation_rules;
create policy org_modify_automations on public.automation_rules for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','controladoria')) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_automation_runs on public.automation_runs;
create policy org_select_automation_runs on public.automation_runs for select using (organization_id = public.current_profile_org());
drop policy if exists org_insert_automation_runs on public.automation_runs;
create policy org_insert_automation_runs on public.automation_runs for insert with check (organization_id = public.current_profile_org());

-- INTEGRAÇÕES E AUDITORIA
drop policy if exists org_select_integrations on public.integrations;
create policy org_select_integrations on public.integrations for select using (organization_id = public.current_profile_org() and public.is_admin_or_partner());
drop policy if exists org_modify_integrations on public.integrations;
create policy org_modify_integrations on public.integrations for all using (organization_id = public.current_profile_org() and public.is_admin_or_partner()) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_audit on public.audit_logs;
create policy org_select_audit on public.audit_logs for select using (organization_id = public.current_profile_org() and public.is_admin_or_partner());
drop policy if exists org_insert_audit on public.audit_logs;
create policy org_insert_audit on public.audit_logs for insert with check (organization_id = public.current_profile_org() or organization_id is null);


-- FERIADOS E MODELOS
drop policy if exists org_select_legal_holidays on public.legal_holidays;
create policy org_select_legal_holidays on public.legal_holidays for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_legal_holidays on public.legal_holidays;
create policy org_modify_legal_holidays on public.legal_holidays for all using (organization_id = public.current_profile_org() and public.is_admin_or_partner()) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_pricing_templates on public.pricing_templates;
create policy org_select_pricing_templates on public.pricing_templates for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_pricing_templates on public.pricing_templates;
create policy org_modify_pricing_templates on public.pricing_templates for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','financeiro','advogado')) with check (organization_id = public.current_profile_org());
drop policy if exists org_select_pricing_oab_references on public.pricing_oab_references;
create policy org_select_pricing_oab_references on public.pricing_oab_references for select using (organization_id = public.current_profile_org());
drop policy if exists org_modify_pricing_oab_references on public.pricing_oab_references;
create policy org_modify_pricing_oab_references on public.pricing_oab_references for all using (organization_id = public.current_profile_org() and public.is_admin_or_partner()) with check (organization_id = public.current_profile_org());

-- Snapshot somente para demo/backup
drop policy if exists org_select_snapshots on public.app_state_snapshots;
create policy org_select_snapshots on public.app_state_snapshots for select using (company_id = public.current_profile_org());
drop policy if exists org_modify_snapshots on public.app_state_snapshots;
create policy org_modify_snapshots on public.app_state_snapshots for all using (company_id = public.current_profile_org() and public.is_admin_or_partner()) with check (company_id = public.current_profile_org());

-- Storage privado de documentos
drop policy if exists documentos_auth_upload on storage.objects;
create policy documentos_auth_upload on storage.objects for insert to authenticated with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.current_profile_org()::text);
drop policy if exists documentos_auth_select on storage.objects;
create policy documentos_auth_select on storage.objects for select to authenticated using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.current_profile_org()::text);
drop policy if exists documentos_auth_update on storage.objects;
create policy documentos_auth_update on storage.objects for update to authenticated using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.current_profile_org()::text) with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.current_profile_org()::text);

-- Nex Gestão Jurídica v4 — policies complementares para módulos operacionais reais
alter table if exists public.hearings enable row level security;
alter table if exists public.client_consents enable row level security;
alter table if exists public.document_access_logs enable row level security;
alter table if exists public.payment_receipts enable row level security;
alter table if exists public.report_exports enable row level security;

drop policy if exists org_select_hearings on public.hearings;
create policy org_select_hearings on public.hearings for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','cliente'));
drop policy if exists org_modify_hearings on public.hearings;
create policy org_modify_hearings on public.hearings for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_client_consents on public.client_consents;
create policy org_select_client_consents on public.client_consents for select using (organization_id = public.current_profile_org() and (public.is_admin_or_partner() or exists (select 1 from public.users_profiles up where up.id = public.current_profile_id() and up.client_id = client_consents.client_id)));
drop policy if exists org_modify_client_consents on public.client_consents;
create policy org_modify_client_consents on public.client_consents for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_document_access_logs on public.document_access_logs;
create policy org_select_document_access_logs on public.document_access_logs for select using (organization_id = public.current_profile_org() and public.is_admin_or_partner());
drop policy if exists org_insert_document_access_logs on public.document_access_logs;
create policy org_insert_document_access_logs on public.document_access_logs for insert with check (organization_id = public.current_profile_org());

drop policy if exists org_select_payment_receipts on public.payment_receipts;
create policy org_select_payment_receipts on public.payment_receipts for select using (organization_id = public.current_profile_org() and public.can_access_financial());
drop policy if exists org_modify_payment_receipts on public.payment_receipts;
create policy org_modify_payment_receipts on public.payment_receipts for all using (organization_id = public.current_profile_org() and public.can_access_financial()) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_report_exports on public.report_exports;
create policy org_select_report_exports on public.report_exports for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin_master','admin','socio','financeiro','rh','controladoria','advogado'));
drop policy if exists org_insert_report_exports on public.report_exports;
create policy org_insert_report_exports on public.report_exports for insert with check (organization_id = public.current_profile_org());

-- Nex Gestão Jurídica v3.2 — portal cliente por client_id, sem seleção manual ou vazamento cross-client
create or replace function public.current_profile_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select client_id from public.users_profiles where auth_user_id = auth.uid() and active is true limit 1
$$;

drop policy if exists org_select_clients on public.clients;
create policy org_select_clients on public.clients for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or id = public.current_profile_client_id()
  )
);

drop policy if exists org_select_processes on public.processes;
create policy org_select_processes on public.processes for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','financeiro')
    or responsible_id = public.current_profile_id()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_select_deadlines on public.deadlines;
create policy org_select_deadlines on public.deadlines for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_select_tasks on public.tasks;
create policy org_select_tasks on public.tasks for select using (
  organization_id = public.current_profile_org()
  and (
    responsible_id = public.current_profile_id()
    or public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria','atendimento','financeiro','rh')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_select_financial on public.financial_entries;
create policy org_select_financial on public.financial_entries for select using (
  organization_id = public.current_profile_org()
  and (
    public.can_access_financial()
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_select_pricing on public.pricing_proposals;
create policy org_select_pricing on public.pricing_proposals for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro','atendimento')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_modify_pricing on public.pricing_proposals;
create policy org_modify_pricing on public.pricing_proposals for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_documents on public.documents;
create policy org_select_documents on public.documents for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or client_id = public.current_profile_client_id()
  )
);

drop policy if exists org_modify_documents on public.documents;
create policy org_modify_documents on public.documents for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_messages on public.messages;
create policy org_select_messages on public.messages for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or client_id = public.current_profile_client_id()
  )
);

drop policy if exists org_modify_messages on public.messages;
create policy org_modify_messages on public.messages for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or client_id = public.current_profile_client_id()
  )
) with check (organization_id = public.current_profile_org());

drop policy if exists org_select_hearings on public.hearings;
create policy org_select_hearings on public.hearings for select using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

-- Nex Gestão Jurídica v3.3 — endurecimento final de portal, convites e webhooks
alter table if exists public.integration_logs enable row level security;
alter table if exists public.payment_events enable row level security;

drop policy if exists org_select_integration_logs on public.integration_logs;
create policy org_select_integration_logs on public.integration_logs for select using (organization_id = public.current_profile_org() and public.is_admin_or_partner());
drop policy if exists org_insert_integration_logs on public.integration_logs;
create policy org_insert_integration_logs on public.integration_logs for insert with check (organization_id = public.current_profile_org());

drop policy if exists org_select_payment_events on public.payment_events;
create policy org_select_payment_events on public.payment_events for select using (organization_id = public.current_profile_org() and public.can_access_financial());
drop policy if exists org_insert_payment_events on public.payment_events;
create policy org_insert_payment_events on public.payment_events for insert with check (organization_id = public.current_profile_org());

-- Reaplica policies com WITH CHECK por client_id para impedir cliente gravar dados de outro cliente.
drop policy if exists org_modify_documents on public.documents;
create policy org_modify_documents on public.documents for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','controladoria')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);

drop policy if exists org_modify_messages on public.messages;
create policy org_modify_messages on public.messages for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or client_id = public.current_profile_client_id()
  )
) with check (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() <> 'cliente'
    or client_id = public.current_profile_client_id()
  )
);

drop policy if exists org_modify_pricing on public.pricing_proposals;
create policy org_modify_pricing on public.pricing_proposals for all using (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
) with check (
  organization_id = public.current_profile_org()
  and (
    public.current_profile_role() in ('admin_master','admin','socio','advogado','financeiro')
    or (public.current_profile_role() = 'cliente' and client_id = public.current_profile_client_id())
  )
);


-- Nex Gestão Jurídica v3.6 — Admin Master, chat responsável e workflow delegado
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

-- v3.7 Enterprise: RLS incremental para novas tabelas em supabase/migrations/20260702_v37_enterprise_erp_juridico.sql
