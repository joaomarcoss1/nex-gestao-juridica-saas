# Supabase — Nex Gestão Jurídica v5.1

## Base existente

Para uma instalação já atualizada até a v5.0, aplique os arquivos listados em `MIGRATION_ORDER_V51.md` na ordem indicada.

## Base nova

Execute as migrations cronologicamente. Os arquivos `schema.sql` e `seed.sql` permanecem como referência histórica, mas a fonte de evolução do banco são as migrations.

## Procedimento seguro

1. Faça backup.
2. Use um projeto de homologação.
3. Aplique as migrations.
4. Teste duas organizações e perfis diferentes.
5. Teste CRM, processos, workflow, financeiro e agenda.
6. Somente depois aplique em produção.

Leia `ROLLBACK_V51.md` e `RLS_TEST_GUIDE.md`.
