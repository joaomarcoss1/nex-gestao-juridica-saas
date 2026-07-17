# Ordem de migrations para a v5.0

## Banco já na v4.9

Execute somente:

```text
20260713_v50_producao_segura_mobile.sql
```

## Banco vazio

Execute todos os arquivos de `supabase/migrations` em ordem alfabética/crescente pelo timestamp.

## Regras

- Não edite migrations já executadas em produção.
- Não use `drop table` para “corrigir” conflito.
- Faça backup antes de aplicar.
- Valide a execução em homologação.
- Depois da v5.0, teste RLS, portal, Storage, agenda e financeiro.
- Use `ROLLBACK_V50.md` para reversão operacional não destrutiva.
