# Entrega v5.2

## Implementado e validado localmente

- Mapeadores explícitos e round trip unitário.
- Compatibilidade SQL não destrutiva para movimentações.
- RLS e RPCs definidas em migrations com contratos automatizados.
- Fluxos locais de CRM, processo, workflow, pagamento e agenda.
- Build, TypeScript, auditoria e E2E responsivo.

## Implementado, dependente de homologação Supabase

- Aplicação real das migrations.
- RLS com JWT e múltiplas organizações.
- RPCs transacionais em PostgreSQL.
- Concorrência real e locks.
- Reconciliação sobre dados existentes.

## Implementado parcialmente

- Repositório server-side paginado existe e o carregamento modular foi limitado, mas nem todas as páginas antigas foram convertidas para controles visuais de paginação.
- Campos estruturais de recorrência e sincronização existem; séries complexas e integração Google ainda dependem de homologação externa.
- Workflow suporta grupos por ordem, condições previstas, aprovador e documento; um editor visual avançado de condições não foi adicionado.

## Dependente de serviço externo

- Stripe, Google Calendar, Google Leads, Storage, e-mail, webhooks e APIs jurídicas.
