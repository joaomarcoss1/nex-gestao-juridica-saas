# Guia de deploy — Nex Gestão Jurídica v5.0

## 1. Preparação local

```bash
npm ci
cp .env.example .env.local
npm run validate
npm run test:e2e
```

## 2. Supabase

1. Crie um backup da base atual.
2. Crie ou use um projeto de homologação.
3. Se a base já está na v4.9, execute somente:
   `supabase/migrations/20260713_v50_producao_segura_mobile.sql`.
4. Em base vazia, execute todas as migrations em ordem pelo timestamp.
5. Configure o provedor de e-mail/link mágico no Supabase Auth.
6. Confirme que o bucket `documentos` existe e é privado.
7. Teste usuário da Empresa A contra registros da Empresa B.
8. Teste cliente apenas contra o próprio `client_id`.

Não reabra grants anônimos antigos do portal.

## 3. Vercel

Importe o repositório e use:

```text
Framework Preset: Vite
Root Directory: ./
Install Command: npm ci
Build Command: npm run build
Output Directory: dist/public
```

Cadastre todas as variáveis necessárias de `.env.example`.

Obrigatórias para produção básica:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
PUBLIC_APP_URL
CRON_SECRET
```

Obrigatórias quando os módulos forem ativados:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER
STRIPE_PRICE_PRO
STRIPE_PRICE_ENTERPRISE
PAYMENTS_WEBHOOK_SECRET
GOOGLE_LEADS_WEBHOOK_SECRET
```

## 4. Webhooks

- Stripe: aponte para `/api/billing/stripe-webhook` e configure `STRIPE_WEBHOOK_SECRET`.
- Pagamentos: aponte para `/api/payments/webhook` e envie o segredo em `x-nex-webhook-secret`.
- Google Leads: aponte para `/api/integrations/google-leads-webhook` e envie o segredo em `x-nex-webhook-secret`.
- Cron: a Vercel chama `/api/cron/automations` com `Authorization: Bearer CRON_SECRET`.

Cada provedor deve usar um segredo diferente.

## 5. Homologação obrigatória

- Cadastro e login de admin.
- Login de funcionário com matrícula.
- Link mágico do portal.
- Isolamento entre duas empresas.
- Upload/download de documento.
- Lead real por webhook.
- Checkout, pagamento aprovado, falha e cancelamento.
- Evento duplicado sem duplicar registros.
- Navegação em 320, 360, 390, 414 e 768 px.
- Teste de backup e rollback.

## 6. Rollback

Siga `supabase/ROLLBACK_V50.md`. A migration foi desenhada para manter colunas e dados compatíveis com a v4.9.
