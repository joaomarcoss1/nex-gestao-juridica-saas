begin;

-- Garante que a tabela exista
create table if not exists public.process_movements (
    id uuid primary key default gen_random_uuid()
);


-- Adiciona todas as colunas necessárias da v5.1
alter table public.process_movements

add column if not exists organization_id uuid,

add column if not exists process_id uuid,

add column if not exists movement_type text default 'manual',

add column if not exists title text default 'Movimentação',

add column if not exists description text,

add column if not exists occurred_at timestamptz default now(),

add column if not exists source text default 'manual',

add column if not exists external_id text,

add column if not exists visibility text default 'internal',

add column if not exists created_by uuid,

add column if not exists archived_at timestamptz,

add column if not exists created_at timestamptz default now(),

add column if not exists updated_at timestamptz default now();


-- Corrige registros antigos sem dados obrigatórios
update public.process_movements
set 
    movement_type = coalesce(movement_type,'manual'),
    title = coalesce(title,'Movimentação'),
    source = coalesce(source,'manual'),
    visibility = coalesce(visibility,'internal'),
    occurred_at = coalesce(occurred_at,now()),
    created_at = coalesce(created_at,now()),
    updated_at = coalesce(updated_at,now())
where 
    movement_type is null
    or title is null;


-- Índices necessários da v5.1

create unique index if not exists process_movements_external_uidx
on public.process_movements(
    organization_id,
    source,
    external_id
)
where external_id is not null;


create index if not exists process_movements_process_date_idx
on public.process_movements(
    process_id,
    occurred_at desc
);


create index if not exists process_movements_org_idx
on public.process_movements(
    organization_id
);


-- RLS
alter table public.process_movements enable row level security;


drop policy if exists v51_org_select_process_movements 
on public.process_movements;


create policy v51_org_select_process_movements
on public.process_movements
for select
to authenticated
using (
    organization_id = public.nex_current_org_id()
);


drop policy if exists v51_org_insert_process_movements
on public.process_movements;


create policy v51_org_insert_process_movements
on public.process_movements
for insert
to authenticated
with check (
    organization_id = public.nex_current_org_id()
);


drop policy if exists v51_org_update_process_movements
on public.process_movements;


create policy v51_org_update_process_movements
on public.process_movements
for update
to authenticated
using (
    organization_id = public.nex_current_org_id()
)
with check (
    organization_id = public.nex_current_org_id()
);


commit;