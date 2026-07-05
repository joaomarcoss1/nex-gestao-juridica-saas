# Nex Gestão Jurídica v3.2 — Produção Real por Módulo

Esta versão aplica as pendências identificadas na v3.1, priorizando funcionalidades reais, isolamento do portal por `client_id`, permissões práticas, relacionamentos por UUID, financeiro auditável, relatórios com exportação e documentos com fluxo de aprovação.

## Melhorias aplicadas

- Portal do cliente sem seleção manual quando o usuário tem role `cliente`.
- Vínculo real do portal por `users_profiles.client_id`.
- Filtro de estado por perfil no frontend, reduzindo exposição de dados fora do escopo do usuário.
- Bloqueio de ações por permissão em `useNexState` antes de persistir/criar/excluir registros.
- Bloqueio de rotas por permissão em `App.tsx`.
- Novo serviço `accessControl.service.ts` para rotas, ações e escopo por perfil.
- Novo serviço `portal.service.ts` para resolver dados do portal com base no cliente logado.
- Tipos com `clientId` e campos operacionais para relações por UUID.
- Hydratação de relações por UUID/nome em `normalizedRepository` para reduzir dependência de nome de cliente.
- Novas entidades de apoio: `hearings`, `clientConsents`, `paymentReceipts` e `reportExports`.
- Financeiro com recibo numerado, pagamentos parciais e persistência em `payment_receipts`.
- Relatórios com filtros por período/módulo, exportação CSV, exportação Excel `.xls`, PDF via impressão e registro de exportação.
- Documentos com aprovação, recusa com motivo, viewer integrado e logs de URL assinada.
- Convite de usuário cria pré-cadastro em `users_profiles` com role, `client_id` para clientes e auditoria.
- `rls.sql` atualizado com políticas específicas para cliente acessar apenas dados do próprio `client_id`.
- `seed.sql` inclui cliente demo e perfil `cliente` vinculado para teste de portal/RLS.

## Validação executada

```bash
npm run check
npm run build
npm audit --audit-level=high
```

Resultado validado nesta entrega:

- TypeScript: OK
- Build Vite: OK
- Auditoria npm: 0 vulnerabilidades altas

## Limites honestos

As integrações externas com PIX, boleto, cartão, WhatsApp, tribunais, ICP-Brasil e e-mail transacional permanecem preparadas de forma segura, mas dependem de credenciais reais, webhooks, homologação e backend seguro para funcionar de ponta a ponta.

O cálculo de prazos continua como ferramenta gerencial e deve ser validado pelo advogado responsável.
