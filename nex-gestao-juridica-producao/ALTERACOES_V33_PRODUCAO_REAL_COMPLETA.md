# Nex Gestão Jurídica v3.3 — Produção Real Completa por Módulo

Esta versão aprofunda a v3.2, removendo pontos superficiais e endurecendo o app para piloto real com Supabase/Vercel.

## Melhorias aplicadas

- Supabase em produção agora é fonte principal: `loadNormalizedState()` inicia com estado vazio e não mistura dados demo/local quando as tabelas retornam vazias por RLS.
- `defaultState` fica restrito ao modo demo/offline, evitando vazamento de dados demonstrativos em usuários reais.
- Relacionamentos persistidos preferem `clientId`/UUID em vez do nome do cliente.
- Mapeamento Supabase -> frontend preserva `clientId` em processos, prazos, tarefas, financeiro, documentos, mensagens, propostas e audiências.
- Upload do portal agora salva em caminho privado com organização, cliente, processo, documento e hash.
- Convite real de usuário criado em `api/users/invite.ts`, usando Supabase Auth Admin com `SUPABASE_SERVICE_ROLE_KEY` somente no backend.
- `users.service.ts` passa a tentar convite real via serverless e usa pré-cadastro por RLS apenas como fallback.
- Usuário inativo é bloqueado no carregamento do perfil.
- `last_login_at` e `invitation_status` são atualizados no perfil.
- Automações cron agora têm idempotência básica para não duplicar tarefas abertas a cada execução.
- Regras de negócio do frontend evitam duplicar tarefa de cobrança vencida e relatório final de processo.
- Prazos usam `deadlineCalculator.service.ts` diretamente, com caminho para feriados configuráveis.
- Integrações agora têm endpoint `/api/integrations/test` para validar variáveis de ambiente no backend sem expor credenciais.
- Webhook financeiro `/api/payments/webhook` preparado para baixa real de cobranças por provedor externo com segredo e auditoria.
- Schema recebeu índices reais para portal, relacionamento, deduplicação, convites, logs de integração e eventos de pagamento.
- RLS recebeu policies complementares com `WITH CHECK` por `client_id` para documentos, mensagens e propostas.

## Validação executada

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm audit --audit-level=high
```

Resultado:

- TypeScript: OK
- Build Vite: OK
- Auditoria npm: 0 vulnerabilidades altas

## Limites honestos

As integrações externas continuam dependendo de credenciais reais, homologação e webhooks de cada provedor. A versão não inventa funcionamento falso para PIX, boleto, WhatsApp, tribunais ou ICP-Brasil.

Para ativar produção real, configure na Vercel/Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `PAYMENTS_WEBHOOK_SECRET`
- variáveis específicas de integração, como `ASAAS_API_KEY`, `WHATSAPP_TOKEN`, `EVOLUTION_API_KEY`, etc.
