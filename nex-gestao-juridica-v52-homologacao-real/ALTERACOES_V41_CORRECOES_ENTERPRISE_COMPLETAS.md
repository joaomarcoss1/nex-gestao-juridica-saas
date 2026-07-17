# Nex Gestão Jurídica v4.1 — Correções Enterprise Completas

Esta versão complementa a v4.0 e aplica as correções que ainda estavam pendentes para aproximar o sistema de uma base funcional, segura e estruturada para testes reais.

## Correções estruturais aplicadas

### 1. Portal do cliente
- Mantido acesso por nome completo, sem e-mail e sem senha.
- Criada migration complementar `20260704_v41_correcoes_enterprise_completas.sql`.
- Criada função `portal_public_payload(client_id)` para retornar somente dados liberados ao cliente.
- Reescrita `client_portal_by_full_name(full_name)` com normalização por `unaccent`, tratamento de duplicidade e vínculo automático ao processo quando o cliente ainda não estiver cadastrado.
- Corrigida função `client_portal_update_pricing_status(...)`, incluindo atualização da proposta, geração de financeiro quando aceita e auditoria.
- Corrigidos serviços do frontend para usar RPCs estruturais `portal_send_message` e `portal_upload_document`.
- Corrigido o fluxo do portal para não tentar criar tarefas/financeiro localmente quando o acesso é público por nome. As tarefas e financeiro são gerados pelas RPCs no banco.

### 2. Supabase Storage / GED
- Criado/garantido bucket `documentos` no Supabase Storage.
- Criadas policies para upload pelo portal e leitura/gestão por usuários autenticados.
- O upload passa `storage_path` para a RPC `portal_upload_document`.
- Metadados do documento são gravados em `documents` com `client_visible`, `access_level` e `validation_status`.

### 3. RLS por papel e organização
- Criados helpers seguros:
  - `nex_current_profile_id()`
  - `nex_current_org_id()`
  - `nex_current_role()`
  - `nex_is_admin()`
  - `nex_is_financial_user()`
  - `nex_is_rh_user()`
- Criadas policies RLS para tabelas principais por `organization_id`.
- Financeiro restrito a `admin_master`, `admin`, `socio` e `financeiro`.
- `users_profiles` restrito ao próprio usuário ou gestores autorizados.
- Ponto (`time_records`) restrito ao colaborador vinculado ou RH/Admin.
- Portal público continua sem consultar tabelas diretamente; usa RPC `security definer`.

### 4. Mobile app-like
- Criada navegação inferior real com cinco ações principais e botão Menu.
- Criado drawer mobile para módulos extras.
- A sidebar lateral deixa de ser usada como menu scrollado no mobile.
- Layout mobile recebeu ajustes de safe-area, cards, botões, menu e feedback visual.

### 5. Persistência e produção
- Reforçado comportamento de não salvar localmente em produção.
- Mensagem de erro local foi substituída por feedback de falha de sincronização no ambiente dev/demo.
- Produção continua exigindo Supabase válido como fonte única da verdade.

## Arquivos alterados/criados

- `client/src/components/layout/AppShell.tsx`
- `client/src/features/portal-cliente/pages/PortalClientePage.tsx`
- `client/src/services/portal.service.ts`
- `client/src/hooks/useNexState.ts`
- `client/src/mobile.css`
- `supabase/migrations/20260704_v41_correcoes_enterprise_completas.sql`
- `ALTERACOES_V41_CORRECOES_ENTERPRISE_COMPLETAS.md`
- `CHECKLIST_VALIDACAO_V41.md`

## Ordem correta para aplicar migrations

Execute no Supabase, em ordem:

1. `supabase/schema.sql`, se for banco novo.
2. `supabase/seed.sql`, se quiser dados iniciais.
3. `supabase/migrations/20260702_v36_admin_master_chat_workflow.sql`
4. `supabase/migrations/20260702_v37_enterprise_erp_juridico.sql`
5. `supabase/migrations/20260703_v38_enterprise_completion_structural.sql`
6. `supabase/migrations/20260704_v39_auth_portal_mobile_supabase.sql`
7. `supabase/migrations/20260704_v40_estabilizacao_enterprise.sql`
8. `supabase/migrations/20260704_v41_correcoes_enterprise_completas.sql`

## Validação executada

```bash
npm run check
npm run build
npm run audit
```

Resultado:

- TypeScript sem erros.
- Build Vite concluído.
- 0 vulnerabilidades altas.

## Observação honesta

Esta versão corrige pontos estruturais críticos. Ainda é indispensável testar em um banco Supabase real com usuários reais para validar RLS, Storage, policies e permissões de cada papel no ambiente final.
