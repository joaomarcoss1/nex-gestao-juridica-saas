# Guia rápido — corrigir Supabase v4.4

1. Acesse o projeto no Supabase.
2. Vá em **SQL Editor**.
3. Abra o arquivo:
   `supabase/migrations/20260705_v44_topbar_supabase_resilience.sql`.
4. Cole o SQL inteiro e execute.
5. Na Vercel, faça **Redeploy without cache**.

Essa migration corrige policies antigas que chamavam funções como `current_profile_id()` e `current_profile_org()`, além de criar fallbacks para tabelas opcionais usadas pelo painel enterprise.
