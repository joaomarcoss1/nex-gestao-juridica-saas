# Supabase Setup — Nex Gestão Jurídica v3

1. Crie o projeto no Supabase.
2. Configure `.env.local` com:

```env
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_ANON_PUBLIC_KEY"
SUPABASE_SERVICE_ROLE_KEY="SOMENTE_BACKEND"
DATABASE_URL="postgresql://postgres:SENHA@db.SEU-PROJETO.supabase.co:5432/postgres"
CRON_SECRET="chave-aleatoria"
```

3. Rode no SQL Editor:

```text
supabase/schema.sql
supabase/rls.sql
supabase/seed.sql opcional
```

4. Crie usuário em Authentication > Users.
5. Pegue o ID do usuário Auth e cadastre em `public.users_profiles.auth_user_id`.
6. O `organization_id` deve apontar para a organização do escritório.
7. Rode os testes de `supabase/RLS_TEST_GUIDE.md`.

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
