# Alterações v4.2 — Redesign Premium e Multiempresa com Matrícula

Esta versão transforma o Nex Gestão Jurídica em uma base mais preparada para SaaS jurídico multiempresa, com administração global, matrícula por empresa, portal do cliente por nome + CPF e estrutura de persistência real no Supabase.

## Principais melhorias aplicadas

- Nova aba **Empresas**, visível apenas para Admin Master Global.
- Cadastro estrutural de empresas com geração de **matrícula base** no formato sequencial + ano, como `3272026`.
- Ações reais na tela Empresas: criar, editar, bloquear, reativar, copiar matrícula, criar admin da empresa e registrar suporte.
- Login redesenhado em três fluxos:
  - Admin Master Global: e-mail + senha, sem matrícula.
  - Admin/funcionário: e-mail + senha + matrícula da empresa.
  - Cliente: nome completo + CPF.
- Novos papéis compatíveis:
  - `admin_master_global`
  - `admin_empresa`
  - `advogado`
  - `funcionario`
  - `financeiro`
  - `rh`
  - `cliente`
- Dashboard Global do Admin Master com visão consolidada de empresas, usuários, processos, receita e auditoria.
- Dashboard da empresa segue limitado ao escopo da organização pelo estado, permissões e RLS.
- Tipagem ampliada para `Organization`, `AuthProfile`, permissões e página `empresas`.
- Persistência de organizações ajustada no `normalizedRepository`, deixando de salvar empresa apenas como payload genérico.
- `employees` criados pela tela Empresas já recebem `organizationId` da empresa correta.
- Layout premium reforçado com tokens globais de cor solicitados no prompt v4.2.
- Topbar passa a exibir papel do usuário e matrícula da empresa quando aplicável.
- Migration Supabase v4.2 criada com helpers, RPCs, sequência de matrícula e RLS multiempresa.

## Arquivos principais alterados/adicionados

- `client/src/types/app.ts`
- `client/src/data/defaultState.ts`
- `client/src/App.tsx`
- `client/src/components/layout/AppShell.tsx`
- `client/src/features/auth/AuthProvider.tsx`
- `client/src/features/auth/pages/LoginPage.tsx`
- `client/src/features/dashboard/pages/DashboardPage.tsx`
- `client/src/features/empresas/pages/EmpresasPage.tsx`
- `client/src/lib/permissions.ts`
- `client/src/services/accessControl.service.ts`
- `client/src/services/normalizedRepository.ts`
- `client/src/index.css`
- `supabase/migrations/20260704_v42_redesign_multiempresa_matricula.sql`

## Observação importante

O app continua compatível com as versões anteriores. Para produção real, rode a migration v4.2 no Supabase antes de publicar a nova versão na Vercel.
