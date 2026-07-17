# Nex Gestão Jurídica v4.7 — Assinaturas Teste e Isenção Permanente

Esta versão adiciona duas regras comerciais solicitadas para o módulo **Assinatura**:

## 1. Assinatura Teste

Permite que o **Admin Master Global** libere uma empresa para usar o sistema em teste gratuito por tempo indeterminado.

- O teste não possui data de expiração automática.
- A empresa continua liberada até o Admin Master Global desativar manualmente.
- Enquanto o teste estiver ativo, o checkout Stripe fica bloqueado para evitar cobrança indevida.
- A ação registra motivo/observação e prepara auditoria no Supabase.

## 2. Abolir cobranças para sempre

Permite que o **Admin Master Global** marque uma empresa como permanentemente isenta de cobrança.

- A empresa não precisa assinar plano Stripe.
- O checkout e o portal Stripe ficam bloqueados para essa empresa.
- Webhooks Stripe não devem bloquear empresas com isenção permanente.
- A isenção pode ser removida pelo Admin Master Global caso necessário.

## Restrições de segurança

As ações aparecem somente para os perfis:

- `admin_master`
- `admin_master_global`

Admins de empresa, funcionários e clientes não veem os botões de teste gratuito, desativação de teste ou isenção permanente.

## Arquivos alterados

- `client/src/features/assinatura/pages/AssinaturaPage.tsx`
- `client/src/types/app.ts`
- `client/src/services/normalizedRepository.ts`
- `client/src/index.css`
- `api/billing/create-checkout-session.ts`
- `api/billing/stripe-webhook.ts`
- `supabase/migrations/20260706_v47_assinaturas_teste_isencao_admin_master.sql`

## Validação técnica

Executado com sucesso:

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm run audit
```

Resultado: TypeScript sem erros, build concluído e 0 vulnerabilidades altas.
