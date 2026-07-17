# Deploy v4.6 — GitHub, Vercel, Supabase e Stripe

## Vercel

- Root Directory: `nex-gestao-juridica-producao`
- Framework: `Vite`
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

## Supabase

Execute:

```text
supabase/migrations/20260706_v46_validacao_comercial_stripe.sql
```

Opcional para demonstração:

```text
supabase/seed_demo_v46.sql
```

## Stripe

Configure webhook:

```text
/api/billing/stripe-webhook
```

Depois faça Redeploy without cache na Vercel.
