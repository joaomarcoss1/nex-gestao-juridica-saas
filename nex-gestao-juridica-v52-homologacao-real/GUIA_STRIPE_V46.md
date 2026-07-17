# Guia Stripe v4.6 — Nex Gestão Jurídica

## 1. Criar produtos no Stripe

No painel Stripe, crie produtos para os planos:

- Starter
- Pro
- Enterprise

Em cada produto, crie um preço recorrente mensal e copie o `price_...`.

## 2. Configurar variáveis na Vercel

Adicione em **Project Settings > Environment Variables**:

```env
STRIPE_SECRET_KEY=sk_live_ou_sk_test
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
APP_URL=https://seu-projeto.vercel.app
```

Também configure:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Configurar webhook no Stripe

Crie um endpoint de webhook apontando para:

```text
https://seu-projeto.vercel.app/api/billing/stripe-webhook
```

Eventos recomendados:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copie o `Signing secret` e coloque em `STRIPE_WEBHOOK_SECRET`.

## 4. Como funciona para venda

- Cliente escolhe um plano no sistema.
- Stripe abre checkout seguro e hospedado.
- Após pagamento, o webhook sincroniza a assinatura no Supabase.
- A empresa ganha status ativo e plano atualizado.
- Pelo portal Stripe, o cliente troca cartão, baixa faturas ou cancela.

## 5. Homologação

Use modo teste do Stripe antes de produção. Cartão de teste comum:

```text
4242 4242 4242 4242
```

Depois de validar o fluxo completo, troque para chaves live.
