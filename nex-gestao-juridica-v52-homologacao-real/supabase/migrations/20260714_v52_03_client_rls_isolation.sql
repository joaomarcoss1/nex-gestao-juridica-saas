-- Nex Gestão Jurídica v5.2 · isolamento explícito entre equipe, clientes e organizações
begin;

-- Remove as políticas v5.1 permissivas que incluíam clientes pelo OR das policies.
do $$
declare t text;
begin
  foreach t in array array['operation_idempotency','workflow_runs','workflow_run_steps','process_movements','process_phase_history','contract_installments','financial_payments'] loop
    execute format('drop policy if exists %I on public.%I','v51_org_select_'||t,t);
    execute format('drop policy if exists %I on public.%I','v52_staff_select_'||t,t);
    execute format('create policy %I on public.%I for select to authenticated using (organization_id=public.nex_current_org_id() and lower(coalesce(public.nex_current_role(),''''))<>''cliente'')','v52_staff_select_'||t,t);
  end loop;
end $$;

-- Movimentações: cliente somente lê movimentos explicitamente visíveis do próprio processo.
drop policy if exists v51_client_process_movements on public.process_movements;
drop policy if exists v52_client_process_movements on public.process_movements;
create policy v52_client_process_movements on public.process_movements
for select to authenticated using (
  lower(coalesce(public.nex_current_role(),''))='cliente'
  and organization_id=public.nex_current_org_id()
  and visibility='client'
  and archived_at is null
  and exists(select 1 from public.processes p where p.id=process_id and p.organization_id=organization_id and p.client_id=public.nex_current_client_id())
);

-- Parcelas: cliente somente lê parcelas de contratos vinculados ao seu cadastro.
drop policy if exists v52_client_contract_installments on public.contract_installments;
create policy v52_client_contract_installments on public.contract_installments
for select to authenticated using (
  lower(coalesce(public.nex_current_role(),''))='cliente'
  and organization_id=public.nex_current_org_id()
  and archived_at is null
  and exists(select 1 from public.fee_contracts c where c.id=contract_id and c.organization_id=organization_id and c.client_id=public.nex_current_client_id())
);

-- Pagamentos: cliente somente lê pagamentos de cobranças vinculadas ao próprio cliente.
drop policy if exists v52_client_financial_payments on public.financial_payments;
create policy v52_client_financial_payments on public.financial_payments
for select to authenticated using (
  lower(coalesce(public.nex_current_role(),''))='cliente'
  and organization_id=public.nex_current_org_id()
  and archived_at is null
  and exists(select 1 from public.financial_entries f where f.id=financial_entry_id and f.organization_id=organization_id and f.client_id=public.nex_current_client_id() and lower(coalesce(f.type,'')) in ('receita','revenue'))
);

-- Execuções e histórico interno não são expostos ao perfil cliente.
-- As policies de equipe acima excluem cliente e nenhuma policy de cliente é criada para estas tabelas.

alter table if exists public.organization_counters enable row level security;
alter table if exists public.financial_reconciliation_log enable row level security;
drop policy if exists v52_staff_counters on public.organization_counters;
create policy v52_staff_counters on public.organization_counters for select to authenticated using (
  organization_id=public.nex_current_org_id() and lower(coalesce(public.nex_current_role(),''))<>'cliente'
);
drop policy if exists v52_staff_reconciliation on public.financial_reconciliation_log;
create policy v52_staff_reconciliation on public.financial_reconciliation_log for select to authenticated using (
  organization_id=public.nex_current_org_id() and lower(coalesce(public.nex_current_role(),''))<>'cliente'
);

revoke all on public.organization_counters, public.financial_reconciliation_log from anon, public;
grant select on public.organization_counters, public.financial_reconciliation_log to authenticated;
commit;
