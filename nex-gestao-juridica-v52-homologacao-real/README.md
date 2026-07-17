# Nex Gestão Jurídica v5.2 — Homologação Real

SaaS jurídico multiempresa da **NexLabs**, construído com React 19, TypeScript, Vite, Supabase/PostgreSQL e funções serverless da Vercel.

A v5.2 preserva a identidade, rotas e módulos da v5.1 e corrige a diferença entre o modo demonstração e os dados retornados pelo Supabase. O foco desta versão é compatibilidade de migrations, mapeamento explícito, isolamento multiempresa, RPCs protegidas, reconciliação financeira e homologação mobile.

## Módulos principais

- Dashboard executivo e busca global
- CRM jurídico, follow-up e conversão de leads
- Clientes, processos e movimentações
- Workflow persistente, tarefas, dependências e SLA
- Agenda unificada, reuniões, audiências e prazos
- Financeiro, honorários, parcelas, pagamentos e recibos
- Documentos com Storage privado
- Portal autenticado do cliente
- Ponto corporativo e folha
- Relatórios, auditoria, notificações e integrações
- Empresas, equipe e permissões multiempresa

## Principais correções da v5.2

- Migration corretiva de `process_movements`, preservando colunas e registros legados.
- Mapeadores explícitos entre camelCase e snake_case para entidades críticas.
- `paid_amount` nulo interpretado como zero, nunca como pagamento integral.
- Reconciliação entre lançamentos e pagamentos.
- Políticas RLS separadas para equipe e cliente.
- RPCs `SECURITY DEFINER` com `search_path` protegido e validação de referências.
- Workflow com tarefas vinculadas às etapas persistentes, grupos paralelos, condições e SLA.
- Controle de versão em processos e mensagens amigáveis para conflito concorrente.
- CRM com consentimento, decisão de duplicidade, follow-up e fonte padrão transacionais.
- Recibos numerados por contador transacional; cancelamento preserva e invalida o recibo.
- Máquina de estados financeiros normalizada e KPIs sem cancelados/arquivados.
- Timezone por organização, duração e campos de sincronização da agenda.
- Repositório paginado server-side e limite seguro no carregamento modular legado.
- Testes separados em unitários, contratos, live Supabase, RLS, concorrência e E2E.

## Requisitos

- Node.js 22 LTS recomendado
- npm 10+
- VS Code ou editor equivalente
- Projeto Supabase para produção/homologação
- Conta Vercel para deploy e APIs serverless
- Chromium para testes E2E

## Rodar no VS Code

```bash
npm ci
```

Copie `.env.example` para `.env.local`.

Para demonstração local sem Supabase:

```env
VITE_ENABLE_DEMO="true"
```

Execute:

```bash
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Validar localmente

```bash
npm run validate:local
```

Para E2E:

```bash
npx playwright install chromium
npm run test:e2e
```

## Atualizar o Supabase da v5.1 para a v5.2

Faça backup e aplique primeiro em um clone de homologação. Siga exatamente:

- `supabase/MIGRATION_ORDER_V52.md`
- `GUIA_HOMOLOGACAO_SUPABASE_V52.md`
- `supabase/ROLLBACK_V52.md`

As migrations v5.2 são incrementais e não usam `DROP TABLE`.

## Testes live do Supabase

Configure as variáveis `SUPABASE_TEST_*` descritas em `.env.example` e execute:

```bash
npm run test:migrations
npm run test:integration
npm run test:rls
npm run test:concurrency
```

Sem credenciais de homologação, esses testes são explicitamente marcados como `SKIPPED`; eles não simulam aprovação.

## GitHub

```bash
git init
git add .
git commit -m "Nex Gestão Jurídica v5.2 — Homologação Real"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Nunca envie `.env.local`, chaves, tokens ou dados reais ao repositório.
