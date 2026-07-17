begin;

-- Adiciona organização nas tabelas novas caso esteja faltando

alter table if exists public.operation_idempotency
add column if not exists organization_id uuid;


alter table if exists public.workflow_runs
add column if not exists organization_id uuid;


alter table if exists public.workflow_run_steps
add column if not exists organization_id uuid;


alter table if exists public.process_movements
add column if not exists organization_id uuid;


alter table if exists public.process_phase_history
add column if not exists organization_id uuid;


alter table if exists public.contract_installments
add column if not exists organization_id uuid;


alter table if exists public.financial_payments
add column if not exists organization_id uuid;


commit;