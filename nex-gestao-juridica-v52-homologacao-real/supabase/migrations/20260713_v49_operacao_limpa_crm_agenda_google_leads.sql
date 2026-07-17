begin;

create extension if not exists pgcrypto;

-- Cria a tabela caso não exista
create table if not exists public.scheduled_events (
  id uuid primary key default gen_random_uuid()
);

-- Adiciona todas as colunas necessárias sem quebrar dados existentes
alter table public.scheduled_events
add column if not exists organization_id uuid,
add column if not exists event_type text not null default 'meeting',
add column if not exists title text,
add column if not exists client_id uuid,
add column if not exists process_id uuid,
add column if not exists employee_id uuid,
add column if not exists finance_id uuid,
add column if not exists starts_at timestamptz,
add column if not exists ends_at timestamptz,
add column if not exists due_date date,
add column if not exists amount numeric(14,2),
add column if not exists location text,
add column if not exists meeting_link text,
add column if not exists status text not null default 'scheduled',
add column if not exists priority text not null default 'normal',
add column if not exists notes text,
add column if not exists checklist jsonb not null default '[]'::jsonb,
add column if not exists reminder_config jsonb not null default '{}'::jsonb,
add column if not exists created_by uuid,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();


-- Corrige títulos antigos vazios
update public.scheduled_events
set title = 'Evento sem título'
where title is null;


-- Garante título obrigatório
alter table public.scheduled_events
alter column title set not null;


-- Índices para performance
create index if not exists scheduled_events_org_idx
on public.scheduled_events (organization_id);


create index if not exists scheduled_events_starts_idx
on public.scheduled_events (starts_at);


create index if not exists scheduled_events_due_idx
on public.scheduled_events (due_date);


create index if not exists scheduled_events_type_idx
on public.scheduled_events (event_type);


create index if not exists scheduled_events_status_idx
on public.scheduled_events (status);


create index if not exists scheduled_events_employee_idx
on public.scheduled_events (employee_id);


create index if not exists scheduled_events_client_idx
on public.scheduled_events (client_id);


-- RLS
alter table public.scheduled_events enable row level security;


drop policy if exists scheduled_events_select_policy 
on public.scheduled_events;


create policy scheduled_events_select_policy
on public.scheduled_events
for select
using (
  public.nex_is_global_master()
  or organization_id = public.nex_current_org_id()
);



drop policy if exists scheduled_events_write_policy 
on public.scheduled_events;


create policy scheduled_events_write_policy
on public.scheduled_events
for all
using (
  public.nex_is_global_master()
  or organization_id = public.nex_current_org_id()
)
with check (
  public.nex_is_global_master()
  or organization_id = public.nex_current_org_id()
);



grant select, insert, update, delete
on public.scheduled_events
to authenticated, service_role;


commit;