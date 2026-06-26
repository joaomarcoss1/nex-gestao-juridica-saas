-- Nex Gestão Jurídica — políticas RLS base para produção
-- Execute após supabase/schema.sql.
-- Ajuste os claims conforme sua estratégia de autenticação antes de usar com clientes reais.

alter table organizations enable row level security;
alter table users_profiles enable row level security;
alter table employees enable row level security;
alter table clients enable row level security;
alter table leads enable row level security;
alter table processes enable row level security;
alter table tasks enable row level security;
alter table financial_entries enable row level security;
alter table pricing_proposals enable row level security;
alter table time_records enable row level security;
alter table time_adjust_requests enable row level security;
alter table payrolls enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table protocols enable row level security;
alter table signatures enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table automation_rules enable row level security;
alter table automation_runs enable row level security;
alter table audit_logs enable row level security;

create or replace function current_organization_id()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'organization_id', '')::uuid
$$;

create or replace function current_profile_role()
returns text
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'role', 'cliente')
$$;

-- Políticas genéricas por empresa. Para produção avançada, refine por módulo e perfil.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users_profiles','employees','clients','leads','processes','tasks','financial_entries','pricing_proposals',
    'time_records','payrolls','documents','messages','notifications','automation_rules','automation_runs','audit_logs'
  ] loop
    execute format('drop policy if exists %I on %I', 'company_isolation_select', t);
    execute format('create policy %I on %I for select using (organization_id = current_organization_id() or current_profile_role() in (''admin'',''socio''))', 'company_isolation_select', t);
    execute format('drop policy if exists %I on %I', 'company_isolation_insert', t);
    execute format('create policy %I on %I for insert with check (organization_id = current_organization_id() or current_profile_role() in (''admin'',''socio''))', 'company_isolation_insert', t);
    execute format('drop policy if exists %I on %I', 'company_isolation_update', t);
    execute format('create policy %I on %I for update using (organization_id = current_organization_id() or current_profile_role() in (''admin'',''socio''))', 'company_isolation_update', t);
  end loop;
end $$;

alter table app_state_snapshots enable row level security;
drop policy if exists company_isolation_select on app_state_snapshots;
create policy company_isolation_select on app_state_snapshots for select using (company_id = current_organization_id() or current_profile_role() in ('admin','socio'));
drop policy if exists company_isolation_insert on app_state_snapshots;
create policy company_isolation_insert on app_state_snapshots for insert with check (company_id = current_organization_id() or current_profile_role() in ('admin','socio'));
drop policy if exists company_isolation_update on app_state_snapshots;
create policy company_isolation_update on app_state_snapshots for update using (company_id = current_organization_id() or current_profile_role() in ('admin','socio'));

-- Storage: documentos privados por organização/cliente. Ajuste o prefixo das pastas conforme seu fluxo de produção.
-- A versão atual do front usa documentos/<documento-id>.jpg para o scanner do portal.
create policy if not exists "Usuários autenticados podem enviar documentos" on storage.objects
for insert to authenticated
with check (bucket_id = 'documentos');

create policy if not exists "Usuários autenticados podem ler documentos" on storage.objects
for select to authenticated
using (bucket_id = 'documentos');

create policy if not exists "Usuários autenticados podem atualizar documentos" on storage.objects
for update to authenticated
using (bucket_id = 'documentos')
with check (bucket_id = 'documentos');
