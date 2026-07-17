# Rollback operacional v5.2

A v5.2 preserva colunas e dados anteriores. O rollback recomendado é lógico, não destrutivo:

1. Redirecione temporariamente o frontend para as RPCs v5.1 somente se a equipe confirmar compatibilidade.
2. Revogue execução das RPCs `nex_v52_*`.
3. Reaplique as policies v5.1 apenas em ambiente isolado; não restaure a policy genérica de leitura para clientes em produção.
4. Não remova colunas, movimentações, pagamentos ou logs de reconciliação.
5. Restaure o snapshot do banco caso a homologação encontre incompatibilidade estrutural.

Nunca faça rollback com `DROP TABLE` em uma base com dados reais.
