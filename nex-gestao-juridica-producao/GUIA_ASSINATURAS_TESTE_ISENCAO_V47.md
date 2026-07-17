# Guia — Assinatura Teste e Isenção Permanente v4.7

## Objetivo

Este guia explica como usar as novas funções comerciais do Nex Gestão Jurídica.

## Função 1 — Assinatura Teste

Use quando você quiser permitir que uma empresa experimente o sistema sem cobrança, por tempo indeterminado.

### Como ativar

1. Entrar como **Admin Master Global**.
2. Acessar **Assinatura**.
3. Selecionar a empresa.
4. Clicar em **Ativar teste grátis**.
5. Informar o motivo/observação.

### Como desativar

1. Entrar como **Admin Master Global**.
2. Acessar **Assinatura**.
3. Selecionar a empresa em teste.
4. Clicar em **Desativar teste grátis**.
5. Informar o motivo.

Enquanto o teste estiver ativo, a empresa não será enviada ao checkout Stripe.

## Função 2 — Abolir cobranças para sempre

Use quando você quiser liberar uma empresa permanentemente de qualquer cobrança.

### Como conceder

1. Entrar como **Admin Master Global**.
2. Acessar **Assinatura**.
3. Selecionar a empresa.
4. Clicar em **Conceder isenção permanente**.
5. Informar o motivo.

### Como remover

1. Entrar como **Admin Master Global**.
2. Acessar **Assinatura**.
3. Selecionar a empresa isenta.
4. Clicar em **Remover isenção**.

## Campos adicionados no Supabase

A migration v4.7 adiciona à tabela `organizations`:

- `billing_mode`
- `manual_trial_enabled`
- `manual_trial_started_at`
- `manual_trial_disabled_at`
- `manual_trial_disabled_by`
- `manual_trial_reason`
- `billing_exempt_forever`
- `billing_exempt_reason`
- `billing_exempt_granted_at`
- `billing_exempt_granted_by`
- `billing_notes`

## Migration obrigatória

Execute no Supabase:

```sql
supabase/migrations/20260706_v47_assinaturas_teste_isencao_admin_master.sql
```

## Observação comercial

- Teste grátis: uso temporário e manual, mas sem data automática.
- Isenção permanente: uso vitalício sem cobrança.
- Ambas as funções são exclusivas do Admin Master Global.
