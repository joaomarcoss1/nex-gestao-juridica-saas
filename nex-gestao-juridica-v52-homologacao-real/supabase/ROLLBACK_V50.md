# Rollback controlado da v5.0

A migration v5.0 é incremental e não remove dados. Para rollback emergencial:

1. Desative os triggers `trg_v50_sync_hearing_event`, `trg_v50_sync_task_event` e `trg_v50_sync_finance_event`.
2. Restaure temporariamente a aplicação v4.9.
3. Não apague as colunas adicionadas; elas são compatíveis com a versão anterior.
4. Reavalie as policies antes de reabrir acesso anônimo. Não restaure RPCs públicas por nome/CPF.
5. As tabelas `api_rate_limits` e os registros de `scheduled_events` podem permanecer sem afetar a v4.9.

Comandos destrutivos (`drop table`, remoção de colunas ou limpeza de dados) não são recomendados.
