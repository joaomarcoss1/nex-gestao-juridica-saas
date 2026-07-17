# Guia Supabase v4.5

## Ordem recomendada

1. Abra o Supabase.
2. Vá em SQL Editor.
3. Execute as migrations anteriores que ainda não foram aplicadas.
4. Execute:

```text
supabase/migrations/20260705_v45_estabilizacao_comercial_10_10.sql
```

5. Confirme se as funções existem:

```sql
select public.nex_current_profile_id();
select public.nex_current_org_id();
select public.nex_current_role();
select public.nex_is_global_master();
```

## Criar Admin Master Global

Após criar o usuário no Supabase Auth, vincule-o em `users_profiles`:

```sql
insert into public.users_profiles (auth_user_id, name, email, role, active, permissions)
values ('UUID_DO_AUTH_USER', 'João Marcos Gomes Pereira', 'joaomarcosgpp@hotmail.com', 'admin_master_global', true, '{"dashboard.view":true,"companies.view":true,"companies.create":true,"companies.update":true,"companies.block":true,"users.view":true,"reports.view":true,"audit.view":true,"settings.view":true}'::jsonb);
```

## Criar empresa com admin

Use a RPC `create_company_with_admin` pelo SQL Editor ou pelo app.

## Portal do cliente

A RPC `client_portal_by_name_cpf` valida nome completo e CPF, registra log de acesso e retorna apenas dados seguros.

## Segurança

Não use `service_role` no frontend. Na Vercel, use apenas anon/publishable key.
