# Nex Gestão Jurídica v4.6 — Validação Comercial, Onboarding e Stripe

Esta versão aplica melhorias estruturais voltadas para uso com clientes reais, primeiras vendas assistidas e preparação de cobrança recorrente via Stripe.

## Principais melhorias

- Nova tela **Status do Sistema**, exclusiva para diagnóstico comercial e produção.
- Novo **Assistente de Primeira Configuração**, com etapas para implantação assistida.
- Nova tela **Assinatura**, com planos e ações de Stripe Checkout/Portal.
- Novos endpoints Vercel em `api/billing/*` para Checkout, Portal, readiness e webhook Stripe.
- Migration `20260706_v46_validacao_comercial_stripe.sql` com tabelas de assinatura, invoices, eventos de pagamento, onboarding e readiness.
- Seed opcional `supabase/seed_demo_v46.sql` para demonstração comercial.
- Configurações de marca do escritório preparadas em Configurações.
- CSS adicional para layout premium, cards de plano, onboarding e diagnóstico.

## Fluxo Stripe

1. O Admin Master ou admin da empresa acessa **Assinatura**.
2. Escolhe um plano.
3. O frontend chama `/api/billing/create-checkout-session`.
4. O backend cria/recupera o Customer no Stripe e cria uma Checkout Session.
5. O cliente paga no Checkout hospedado pelo Stripe.
6. O Stripe envia evento para `/api/billing/stripe-webhook`.
7. O webhook atualiza `organizations`, `billing_subscriptions`, `billing_invoices` e `payment_events` no Supabase.
8. O cliente pode gerenciar cartão e assinatura via `/api/billing/create-portal-session`.

## Variáveis necessárias na Vercel

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ENTERPRISE=
STRIPE_TAX_ENABLED=false
```

## Validação técnica executada

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm run audit
```

Resultado: TypeScript sem erros, build concluído e 0 vulnerabilidades altas.
