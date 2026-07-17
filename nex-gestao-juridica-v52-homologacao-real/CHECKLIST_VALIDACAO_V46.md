# Checklist v4.6 — Validação Comercial Real

## Supabase

- [ ] Executar `20260706_v46_validacao_comercial_stripe.sql`.
- [ ] Confirmar tabelas `billing_subscriptions`, `billing_invoices` e `payment_events`.
- [ ] Confirmar `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
- [ ] Criar Admin Master real.
- [ ] Criar duas empresas de teste.
- [ ] Confirmar isolamento multiempresa.

## Stripe

- [ ] Criar produtos e preços no Stripe.
- [ ] Configurar `STRIPE_SECRET_KEY`.
- [ ] Configurar `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`.
- [ ] Criar webhook no Stripe.
- [ ] Configurar `STRIPE_WEBHOOK_SECRET`.
- [ ] Testar checkout.
- [ ] Confirmar atualização no Supabase.
- [ ] Testar portal de cobrança.

## Comercial

- [ ] Abrir Status do Sistema.
- [ ] Concluir Onboarding.
- [ ] Carregar seed demo em ambiente separado.
- [ ] Testar mobile/PWA instalado.
- [ ] Gerar relatório para demonstração.
