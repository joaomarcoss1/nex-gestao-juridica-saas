# Nex Gestão Jurídica — versão modular SaaS

Sistema jurídico premium desenvolvido pela NexLabs para gestão de clientes, CRM, processos, tarefas, financeiro, precificação, documentos, ponto, portal do cliente, automações internas e relatórios.

## O que há de novo nesta versão

- Arquitetura modular em `client/src/features/*`.
- `App.tsx` reduzido para roteamento e composição.
- Persistência por tabelas normalizadas do Supabase, com fallback local seguro.
- Scanner funcional de documentos com hash, PDF e upload para Storage quando configurado.
- Microinterações e animações corporativas em botões, cards e troca de tela.
- Automações internas sem IA, com logs e execução de teste.
- Validação de build, TypeScript e auditoria de vulnerabilidades altas.

## Rodar no VS Code

```bash
npm install --legacy-peer-deps
npm run dev
```

Abra: `http://localhost:3000`

## Build para Vercel

```bash
npm run check
npm run build
npm audit --audit-level=high
```

Configuração Vercel:

- Framework: Vite
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

## Supabase

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql`.
3. Execute `supabase/rls.sql`.
4. Execute `supabase/seed.sql`.
5. Configure as variáveis do `.env.example`.

Sem Supabase, o app roda em modo demo/local. Com Supabase configurado, os módulos tentam gravar nas tabelas normalizadas.

---

# Nex Gestão Jurídica — versão produção preparada

Sistema SaaS jurídico premium da **NexLabs** para escritórios de advocacia, com gestão jurídica, financeira, operacional, documental, equipe, ponto eletrônico, portal do cliente, relatórios e automações internas.

## Alterações principais desta versão

- Nome oficial aplicado: **Nex Gestão Jurídica**.
- Branding NexLabs ajustado no layout, sidebar, dashboard e documentação.
- Módulo de IA removido do app e dos arquivos ativos.
- Novo módulo **Automações Internas** com regras, gatilhos, ações, ativação/pausa, execução de teste, logs e exportação.
- Dependências antigas e vulneráveis removidas do pacote ativo.
- `npm audit --audit-level=high` validado com **0 vulnerabilidades**.
- Build Vite simplificado e pronto para Vercel.
- TypeScript validado com `npm run check`.
- Segurança reforçada no protótipo: PIN do ponto não fica mais em campo `pin` de texto puro no estado ativo; em produção o schema usa `pin_hash`.
- Modo produção Supabase preparado com `@supabase/supabase-js`, RLS, Storage, Auth, auditoria e snapshot remoto do estado operacional.
- Modo demonstração/localStorage mantido como fallback para apresentação comercial sem credenciais.
- Supabase atualizado com:
  - `supabase/schema.sql`
  - `supabase/rls.sql`
  - `supabase/seed.sql`
- Estrutura modular criada em `client/src/features/*` para evolução por módulo.
- Documentação de produção adicionada em `CHECKLIST_PRODUCAO.md`.

## Funcionalidades disponíveis no app

- Dashboard executivo com KPIs, prazos críticos, tarefas, financeiro, produtividade, audiências e visão gerencial.
- CRM jurídico com leads, funil, origem, follow-up e conversão comercial.
- Cadastro e visão de clientes PF/PJ.
- Processos com área jurídica, fase, risco, prazo, honorários, progressão e controladoria.
- Agenda com prazos, audiências e alertas.
- Central de comunicação com WhatsApp, e-mail, SMS, chat e modelos.
- Documentos, protocolos, assinaturas, scanner e portal do cliente.
- Tarefas, prazos, workflows e NexScore Jurídico.
- Financeiro jurídico com receitas, despesas, inadimplência, DRE/DFC conceitual e exportação CSV.
- Precificação jurídica completa com custos fixos, custos variáveis, mão de obra, eventos jurídicos, referência OAB, mínimo técnico, recomendado, premium, entrada, parcelas, êxito e alertas técnicos.
- Funcionários, setores, folha gerencial e holerites.
- Ponto eletrônico modelo IPEDE com PIN, entrada, saída de intervalo, retorno, saída final, justificativas e painel administrativo.
- Automações internas auditáveis.
- Configurações, integrações, segurança, LGPD, perfis, permissões e checklist de produção.

## Rodar no VS Code

```bash
npm install --legacy-peer-deps
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Validar antes de subir

```bash
npm run check
npm run build
npm audit --audit-level=high
```

## Deploy na Vercel

Use as configurações:

```text
Framework Preset: Vite
Install Command: npm install --legacy-peer-deps
Build Command: npm run build
Output Directory: dist/public
Root Directory: ./
```

O arquivo `vercel.json` já está configurado.

## Supabase em produção

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Execute `supabase/rls.sql`.
4. Execute `supabase/seed.sql`.
5. Copie `.env.example` para `.env.local`.
6. Preencha:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
VITE_APP_NAME="Nex Gestão Jurídica"
VITE_COMPANY_NAME="NexLabs"
```

7. Cadastre as mesmas variáveis na Vercel.
8. Teste permissões, portal do cliente, documentos e relatórios com dados reais antes de vender.

## Observação honesta de produção

Esta versão está pronta para rodar, demonstrar, subir na Vercel e conectar ao Supabase. O schema/RLS/serviços foram preparados e as vulnerabilidades do pacote ativo foram corrigidas. Antes de colocar clientes reais pagando em operação, valide as regras de negócio específicas do escritório, políticas LGPD, cálculo de prazos processuais, assinatura eletrônica e permissões com dados reais.


## Versão SaaS Completa Final

Esta versão inclui CRUD real por módulo, páginas de prazos, folha gerencial e integrações, services por entidade, schema/RLS atualizados e Vercel Cron preparado para automações internas.

### Rodar no VS Code

```bash
npm install --legacy-peer-deps
npm run dev
```

### Validar produção

```bash
npm run check
npm run build
npm audit --audit-level=high
```

### Vercel

- Framework: Vite
- Root Directory: `nex-gestao-juridica-producao`
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

### Supabase

Execute nesta ordem:

1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. `supabase/seed.sql`

Variáveis públicas do frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=Nex Gestão Jurídica
VITE_COMPANY_NAME=NexLabs
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, tokens de pagamento, WhatsApp ou tribunais no frontend. Use backend/Edge Functions.
