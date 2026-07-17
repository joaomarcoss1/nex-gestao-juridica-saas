# Guia Supabase v4.8

Rode esta migration no Supabase SQL Editor:

```text
supabase/migrations/20260713_v48_crm_processos_workflow_financeiro_ponto_mobile.sql
```

## Teste rápido do ponto público

Depois de rodar a migration, teste:

```sql
select * from public.public_point_employees('3272026');
```

Para registrar ponto via RPC:

```sql
select public.public_point_punch(
  '3272026',
  '<UUID_DO_FUNCIONARIO>',
  '1234',
  'entrada',
  'Presencial',
  null
);
```

## Atenção

A função de ponto público exige que os funcionários tenham:

- `organization_id`
- `pin_hash`
- `name` ou `full_name`
- `status` ativo

Se o funcionário veio apenas do estado demo/local e ainda não está na tabela `employees`, cadastre-o pelo sistema ou insira-o no Supabase antes de testar o ponto público real.
