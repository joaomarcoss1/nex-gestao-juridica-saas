-- Nex Gestão Jurídica v3.8 Enterprise Completion
-- Complementa a v3.7 com entidades realmente persistíveis usadas pelo frontend.
-- Mantém compatibilidade: tabelas genéricas com payload jsonb para evolução incremental sem quebrar schema legado.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text,
  document text,
  plan text,
  status text default 'Ativa',
  payload jsonb default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabelas usadas diretamente pelo normalizedRepository v3.8.
do $$ declare tbl text; begin
  foreach tbl in array array[
    'document_folders','document_versions','document_templates','fee_contracts','cost_entries',
    'legal_module_records','notifications'
  ] loop
    execute format('create table if not exists public.%I (id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade, payload jsonb default ''{}''::jsonb, archived_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now())', tbl);
  end loop;
end $$;

-- Compatibilidade para tabelas já criadas na v3.7, garantindo payload e timestamps.
do $$ declare tbl text; begin
  foreach tbl in array array[
    'units','departments','teams','team_members','workflow_templates','workflow_steps','rural_properties',
    'point_schedules','point_adjustment_requests','point_justifications'
  ] loop
    execute format('alter table public.%I add column if not exists payload jsonb default ''{}''::jsonb', tbl);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', tbl);
    execute format('alter table public.%I add column if not exists created_at timestamptz default now()', tbl);
    execute format('alter table public.%I add column if not exists updated_at timestamptz default now()', tbl);
  end loop;
end $$;

-- Processos e documentos: campos enterprise adicionais sem quebrar registros anteriores.
alter table public.processes add column if not exists unit_id uuid;
alter table public.processes add column if not exists department_id uuid;
alter table public.processes add column if not exists team_id uuid;
alter table public.processes add column if not exists active_pole text;
alter table public.processes add column if not exists passive_pole text;
alter table public.processes add column if not exists subject text;
alter table public.processes add column if not exists court_division text;
alter table public.processes add column if not exists district text;
alter table public.processes add column if not exists state text;
alter table public.processes add column if not exists administrative_body text;
alter table public.processes add column if not exists protocol_number text;
alter table public.processes add column if not exists procedure_type text;
alter table public.processes add column if not exists costs numeric default 0;
alter table public.processes add column if not exists checklist jsonb default '[]'::jsonb;
alter table public.processes add column if not exists timeline jsonb default '[]'::jsonb;

alter table public.documents add column if not exists folder_id uuid;
alter table public.documents add column if not exists tags jsonb default '[]'::jsonb;
alter table public.documents add column if not exists client_visible boolean default false;
alter table public.documents add column if not exists released_at timestamptz;
alter table public.documents add column if not exists validation_status text default 'Pendente';
alter table public.documents add column if not exists access_level text default 'Interno';

alter table public.messages add column if not exists thread_type text default 'cliente';
alter table public.messages add column if not exists related_task_id uuid;
alter table public.messages add column if not exists related_document_id uuid;
alter table public.messages add column if not exists department_id uuid;
alter table public.messages add column if not exists resolved boolean default false;

-- Índices úteis.
create index if not exists idx_legal_module_records_payload on public.legal_module_records using gin(payload);
create index if not exists idx_rural_properties_payload on public.rural_properties using gin(payload);
create index if not exists idx_fee_contracts_payload on public.fee_contracts using gin(payload);
create index if not exists idx_cost_entries_payload on public.cost_entries using gin(payload);
create index if not exists idx_document_folders_payload on public.document_folders using gin(payload);
create index if not exists idx_point_adjustments_payload on public.point_adjustment_requests using gin(payload);
create index if not exists idx_point_justifications_payload on public.point_justifications using gin(payload);
create index if not exists idx_messages_thread on public.messages(organization_id, client_id, process_id, responsible_id, thread_type);

-- RLS para novas tabelas genéricas.
do $$ declare tbl text; begin
  foreach tbl in array array[
    'organizations','document_folders','document_versions','document_templates','fee_contracts','cost_entries','legal_module_records','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=tbl || '_org_select') then
      execute format('create policy %I on public.%I for select using (organization_id = public.current_profile_org() or public.is_admin_or_partner())', tbl || '_org_select', tbl);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=tbl || '_write_admin') then
      execute format('create policy %I on public.%I for all using (public.is_admin_or_partner()) with check (public.is_admin_or_partner())', tbl || '_write_admin', tbl);
    end if;
  end loop;
end $$;

-- Segurança do ponto: bloquear deleção direta de batidas. Ajustes são feitos via point_adjustment_requests.
create or replace function public.prevent_time_record_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'time_records são imutáveis; solicite ajuste/abono em point_adjustment_requests';
end;
$$;

drop trigger if exists trg_prevent_time_record_delete on public.time_records;
create trigger trg_prevent_time_record_delete before delete on public.time_records for each row execute function public.prevent_time_record_delete();
