# Ordem de migrations v5.2

Aplique as migrations existentes até a v5.1 e, depois, exatamente nesta ordem:

1. `20260714_v52_01_process_movements_compatibility.sql`
2. `20260714_v52_02_entity_mapping_financial_support.sql`
3. `20260714_v52_03_client_rls_isolation.sql`
4. `20260714_v52_04_security_definer_validation.sql`
5. `20260714_v52_05_workflow_process_integrity.sql`
6. `20260714_v52_06_crm_integrity.sql`
7. `20260714_v52_07_financial_state_reconciliation.sql`
8. `20260714_v52_08_scheduling_timezone_recurrence.sql`
9. `20260714_v52_09_pagination_indexes.sql`

Faça backup e aplique primeiro em um clone de homologação. As migrations são incrementais e não usam `DROP TABLE`, mas as RPCs e policies precisam ser validadas com os papéis reais do projeto.
