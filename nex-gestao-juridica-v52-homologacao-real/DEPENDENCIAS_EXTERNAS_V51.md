# Dependências externas — v5.1

## Obrigatórias para produção

- Supabase Auth, PostgreSQL e Storage.
- Vercel ou infraestrutura equivalente para frontend e APIs.
- Domínio HTTPS válido.

## Opcionais por módulo

- Stripe: assinatura, Checkout, Billing Portal e webhook.
- Google Calendar: sincronização externa de eventos.
- Google Leads: entrada de leads por webhook.
- SMTP/provedor transacional: link mágico e comunicações.
- API de tribunais: monitoramento processual real.
- WhatsApp/Evolution API: mensagens e automações.

## Pontos que exigem homologação externa

- Aplicação das migrations v5.1.
- Policies RLS com duas organizações.
- RPCs transacionais com usuários e perfis reais.
- Links mágicos e redirecionamento do portal.
- Webhooks, idempotência e assinatura Stripe.
- Timezone e sincronização Google Calendar.
- Entrega de e-mail e WhatsApp.

A ausência de uma integração deve gerar estado “não configurado”, nunca sucesso simulado.
