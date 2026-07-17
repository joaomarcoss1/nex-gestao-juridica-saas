# Guia de homologação Supabase — v5.2

## 1. Preparação

1. Crie um projeto Supabase exclusivo de homologação ou clone/snapshot sem dados pessoais reais.
2. Faça backup antes das migrations.
3. Configure usuários de teste para:
   - administrador da Organização A;
   - advogado da Organização A;
   - cliente 1 da Organização A;
   - cliente 2 da Organização A;
   - administrador da Organização B.
4. Configure as variáveis `SUPABASE_TEST_*` em um ambiente privado.

## 2. Aplicação

Aplique todas as migrations anteriores e depois as nove migrations listadas em `supabase/MIGRATION_ORDER_V52.md`.

Execute a RPC de saúde como administrador:

```sql
select public.nex_v52_schema_health();
```

O campo `ok` deve ser `true` e a lista de colunas ausentes deve estar vazia.

## 3. Testes obrigatórios

```bash
REQUIRE_SUPABASE_LIVE_TESTS=true npm run test:migrations
REQUIRE_SUPABASE_LIVE_TESTS=true npm run test:integration
REQUIRE_SUPABASE_LIVE_TESTS=true npm run test:rls
REQUIRE_SUPABASE_LIVE_TESTS=true npm run test:concurrency
```

## 4. Cenários manuais

- Criar movimentação no formato antigo antes da v5.2 e confirmar o backfill.
- Criar workflow, concluir etapas paralelas e recarregar.
- Criar lead, dar follow-up, converter e repetir a mesma requisição.
- Registrar duas baixas simultâneas com a mesma chave.
- Confirmar que o cliente 1 não lê registros do cliente 2.
- Confirmar que cliente não lê estratégia, custos, folha ou movimentações internas.
- Criar reunião no timezone da organização e validar conflito.

## 5. Bloqueio de produção

Não publique para clientes reais se qualquer teste live estiver `SKIPPED`, falhando ou se `nex_v52_schema_health()` retornar `ok=false`.
