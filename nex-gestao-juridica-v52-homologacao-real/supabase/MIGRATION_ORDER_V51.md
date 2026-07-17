# Ordem de migrations v5.1

Aplique após a migration v5.0, nesta ordem:

1. `20260714_v51_core_integrity.sql`
2. `20260714_v51_workflow_engine.sql`
3. `20260714_v51_process_persistence.sql`
4. `20260714_v51_crm_conversion.sql`
5. `20260714_v51_financial_integrity.sql`
6. `20260714_v51_scheduling_normalization.sql`
7. `20260714_v51_indexes_rls.sql`

Faça backup, aplique primeiro em homologação e execute os testes de duas organizações descritos no guia. As migrations são incrementais e não usam `drop table`.
