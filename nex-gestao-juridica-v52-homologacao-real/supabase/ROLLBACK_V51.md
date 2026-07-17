# Rollback controlado da v5.1

A v5.1 preserva dados e não deve ser revertida apagando tabelas. Para rollback funcional:

1. publique novamente o frontend v5.0;
2. revogue `execute` das RPCs `nex_v51_*` para `authenticated`;
3. mantenha as novas tabelas e colunas para preservar os registros;
4. desative automações v5.1 e investigue os dados antes de qualquer remoção;
5. restaure o backup somente em incidente grave e em janela de manutenção.

As tabelas novas podem permanecer sem afetar a v5.0. Não execute `drop` em produção.
