# Guia de Deploy v4.2 — GitHub, Supabase e Vercel

## 1. Rodar localmente

```bash
npm install
npm run check
npm run build
npm run dev
```

## 2. Aplicar migration no Supabase

No SQL Editor do Supabase, rode:

```sql
-- arquivo:
-- supabase/migrations/20260704_v42_redesign_multiempresa_matricula.sql
```

A migration cria/ajusta:

- `company_registration_sequence`
- `organizations.registration_code`
- campos completos de empresa
- helpers `nex_current_profile_id`, `nex_current_org_id`, `nex_current_role`, `nex_is_global_master`, `nex_is_company_admin`, `nex_has_permission`, `nex_can_access_org`
- RPC `create_company_with_admin(...)`
- RPC `client_portal_by_name_cpf(...)`
- RLS multiempresa por `organization_id`

## 3. Criar ou validar Admin Master Global

A migration tenta garantir um perfil inicial para:

- Nome: João Marcos Gomes Pereira
- E-mail: `joaomarcosgpp@hotmail.com`
- Role: `admin_master_global`

Depois de criar o usuário no Supabase Auth, vincule o `auth_user_id` ao registro correspondente em `users_profiles`.

Exemplo:

```sql
update public.users_profiles
set auth_user_id = 'UUID_DO_USUARIO_AUTH', role = 'admin_master_global', active = true
where email = 'joaomarcosgpp@hotmail.com';
```

## 4. Cadastrar uma empresa

Entre como Admin Master Global e acesse:

```text
Empresas > Nova empresa
```

Preencha razão social, nome fantasia, documento, contato, endereço e admin responsável. Ao salvar, o sistema mostrará a matrícula base da empresa.

## 5. Login por matrícula

Admin/funcionário deve entrar com:

```text
E-mail
Senha
Matrícula da empresa
```

O sistema valida:

- autenticação do Supabase
- vínculo do usuário com `organization_id`
- matrícula `registration_code`
- status ativo da empresa
- status ativo do usuário

## 6. Acesso do cliente

Cliente acessa pelo painel de login selecionando **Cliente** e informando:

```text
Nome completo
CPF
```

A RPC `client_portal_by_name_cpf` normaliza nome e CPF, valida correspondência única e retorna apenas o payload seguro do portal.

## 7. Subir para GitHub

```bash
git init
git add .
git commit -m "Nex Gestão Jurídica v4.2 multiempresa premium"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## 8. Publicar na Vercel

Configure no projeto Vercel:

```env
VITE_SUPABASE_URL=URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=ANON_KEY_DO_SUPABASE
VITE_DATABASE_MODE=production
```

Root Directory: deixe vazio se o `package.json` estiver na raiz do projeto.

Build Command:

```bash
npm run build
```

Output Directory:

```bash
dist
```
