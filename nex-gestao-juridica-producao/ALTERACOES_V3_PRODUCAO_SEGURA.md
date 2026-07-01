# Nex Gestão Jurídica v3 — Produção Segura

Esta versão aplica uma camada real de produção segura sobre a base do SaaS jurídico.

## Melhorias aplicadas

- Autenticação com Supabase Auth: login, cadastro, recuperação, sessão persistente e perfil em `users_profiles`.
- `AuthProvider`, `ProtectedRoute`, `useAuth`, `useCurrentProfile` e `usePermissions`.
- Remoção do `ORG_ID` fixo como fonte de produção: o `organization_id` passa a vir do perfil autenticado.
- Permissões por perfil no frontend e menu filtrado por função.
- Página de detalhe do cliente com abas operacionais: processos, documentos, financeiro, propostas, mensagens, tarefas e LGPD.
- Página de detalhe do processo com resumo, prazos, tarefas, documentos, financeiro, estratégia interna e relatório.
- Página de auditoria para Admin/Sócio.
- Storage service com upload privado, URL assinada e auditoria.
- RLS corrigido: sem `create policy if not exists` e usando `public.users_profiles`.
- Funções SQL: `current_profile_org`, `current_profile_role`, `current_profile_id`, `is_admin_or_partner`, `can_access_financial`, `can_access_hr`, `can_access_process`, `can_access_client`.
- Complementos no schema: `legal_holidays`, `pricing_templates`, `pricing_oab_references`, `pricing_versions` e campos de segurança.
- Cálculo de prazos com dias úteis, feriados nacionais fixos e feriados configuráveis.
- Componentes comuns de UX: ErrorBoundary, EmptyState, Skeleton, ConfirmDialog e DataTable.
- Hooks de debounce e paginação.
- Validações básicas para clientes, processos, prazos, tarefas, financeiro, documentos e funcionários.
- Vercel Cron com validação por `CRON_SECRET`.
- Auditoria com `organization_id`, `user_id`, ação, módulo, entidade, dispositivo e data.

## Validações executadas

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run check
npm run build
npm audit --audit-level=high
```

Resultado: TypeScript OK, build OK e 0 vulnerabilidades altas.

## Observação importante

Integrações como PIX, boleto, WhatsApp, tribunais e ICP-Brasil continuam como integrações preparadas. Para ativação real exigem backend seguro, credenciais, webhooks, homologação e logs.
