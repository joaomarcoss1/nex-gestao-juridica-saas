-- Nex Gestão Jurídica - RLS completo por organização/perfil
-- Execute depois de criar as tabelas e configurar Supabase Auth.

create or replace function public.current_profile_org()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from public.users_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_profile_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin_or_partner()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(public.current_profile_role() in ('admin','socio'), false);
$$;

-- Habilita RLS nas tabelas principais
alter table organizations enable row level security;
alter table users_profiles enable row level security;
alter table employees enable row level security;
alter table clients enable row level security;
alter table leads enable row level security;
alter table processes enable row level security;
alter table deadlines enable row level security;
alter table tasks enable row level security;
alter table financial_entries enable row level security;
alter table pricing_proposals enable row level security;
alter table documents enable row level security;
alter table time_records enable row level security;
alter table payrolls enable row level security;
alter table messages enable row level security;
alter table automation_rules enable row level security;
alter table automation_runs enable row level security;
alter table integrations enable row level security;
alter table audit_logs enable row level security;

-- Política genérica por organização
create policy if not exists org_select_clients on clients for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_clients on clients for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_leads on leads for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_leads on leads for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_processes on processes for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_processes on processes for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_deadlines on deadlines for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_deadlines on deadlines for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_tasks on tasks for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_tasks on tasks for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_financial on financial_entries for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','financeiro'));
create policy if not exists org_modify_financial on financial_entries for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','financeiro')) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_documents on documents for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_documents on documents for all using (organization_id = public.current_profile_org()) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_time_records on time_records for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','rh','funcionario'));
create policy if not exists org_modify_time_records on time_records for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','rh','funcionario')) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_payrolls on payrolls for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','rh','funcionario'));
create policy if not exists org_modify_payrolls on payrolls for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','rh')) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_automations on automation_rules for select using (organization_id = public.current_profile_org());
create policy if not exists org_modify_automations on automation_rules for all using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio','controladoria')) with check (organization_id = public.current_profile_org());
create policy if not exists org_select_audit on audit_logs for select using (organization_id = public.current_profile_org() and public.current_profile_role() in ('admin','socio'));
create policy if not exists org_insert_audit on audit_logs for insert with check (organization_id = public.current_profile_org() or organization_id is null);

-- Storage privado de documentos: cada usuário autenticado só acessa arquivos da própria organização via paths controlados.
create policy if not exists documentos_auth_upload on storage.objects for insert to authenticated with check (bucket_id = 'documentos');
create policy if not exists documentos_auth_select on storage.objects for select to authenticated using (bucket_id = 'documentos');
