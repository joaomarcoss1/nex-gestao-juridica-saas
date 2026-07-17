-- Nex Gestão Jurídica v5.2 · compatibilidade não destrutiva de movimentações processuais
begin;

create table if not exists public.process_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.process_movements
  add column if not exists movement_type text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists occurred_at timestamptz,
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists visibility text,
  add column if not exists created_by uuid,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz,
  -- Colunas legadas são mantidas para integrações anteriores.
  add column if not exists provider text,
  add column if not exists external_movement_id text,
  add column if not exists movement_at timestamptz,
  add column if not exists requires_action boolean,
  add column if not exists raw_payload jsonb;

update public.process_movements
set occurred_at = coalesce(occurred_at, movement_at, created_at, now()),
    movement_at = coalesce(movement_at, occurred_at, created_at, now()),
    external_id = coalesce(nullif(external_id, ''), nullif(external_movement_id, '')),
    external_movement_id = coalesce(nullif(external_movement_id, ''), nullif(external_id, '')),
    source = coalesce(nullif(source, ''), nullif(provider, ''), 'manual'),
    provider = coalesce(nullif(provider, ''), nullif(source, ''), 'manual'),
    movement_type = coalesce(nullif(movement_type, ''), case when coalesce(requires_action, false) then 'requires_action' else 'movement' end),
    title = coalesce(nullif(title, ''), 'Movimentação processual'),
    visibility = coalesce(nullif(visibility, ''), 'internal'),
    raw_payload = coalesce(raw_payload, '{}'::jsonb),
    updated_at = coalesce(updated_at, created_at, now())
where occurred_at is null
   or movement_at is null
   or source is null
   or provider is null
   or movement_type is null
   or title is null
   or visibility is null
   or raw_payload is null
   or updated_at is null;

alter table public.process_movements
  alter column movement_type set default 'movement',
  alter column title set default 'Movimentação processual',
  alter column occurred_at set default now(),
  alter column source set default 'manual',
  alter column visibility set default 'internal',
  alter column updated_at set default now(),
  alter column raw_payload set default '{}'::jsonb;

create unique index if not exists process_movements_external_uidx
  on public.process_movements(organization_id, source, external_id)
  where external_id is not null and archived_at is null;
create index if not exists process_movements_process_date_idx
  on public.process_movements(process_id, occurred_at desc)
  where archived_at is null;
create index if not exists process_movements_legacy_external_idx
  on public.process_movements(organization_id, provider, external_movement_id)
  where external_movement_id is not null and archived_at is null;

commit;
