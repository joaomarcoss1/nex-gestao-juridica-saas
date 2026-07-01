# Nex Gestão Jurídica v3.2 — Produção Real por Módulo

Versão evoluída com portal por `client_id`, permissões de ação, rotas protegidas, financeiro com recibo, relatórios com exportação, documentos com aprovação/recusa, convites de usuários e RLS reforçado para uso piloto seguro.

# Nex Gestão Jurídica v3 — Produção Segura

SaaS jurídico premium desenvolvido pela **NexLabs** para gestão de escritórios de advocacia.

## Principais módulos

- Dashboard executivo
- Clientes e CRM
- Processos e controladoria
- Prazos jurídicos gerenciais
- Tarefas e workflows
- Financeiro jurídico
- Precificação de honorários
- Documentos, scanner e Storage privado
- Portal do cliente
- Ponto eletrônico
- Folha gerencial
- Automações internas e cron
- Relatórios e BI
- Integrações preparadas
- Auditoria e LGPD

## Melhorias v3

- Supabase Auth com login, cadastro, recuperação e sessão.
- Perfil em `users_profiles`.
- `organization_id` derivado do usuário autenticado.
- RLS corrigido e sem `create policy if not exists`.
- Permissões por perfil no frontend.
- Páginas profundas de detalhe de cliente e processo.
- Auditoria para ações sensíveis.
- Storage privado com URLs assinadas.
- Vercel Cron protegido por `CRON_SECRET`.
- Validações, componentes comuns e documentação de produção.

## Como rodar no VS Code

```bash
npm install --legacy-peer-deps
npm run dev
```

Abra:

```text
http://127.0.0.1:3000
```

## Validação

```bash
npm run check
npm run build
npm audit --audit-level=high
```

## Variáveis de ambiente

Crie `.env.local` baseado em `.env.example`.

A URL correta do Supabase deve ser assim:

```env
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
```

Não use `/rest/v1` e não coloque `sb_secret` no campo de URL.

## Supabase

Rode no SQL Editor, nesta ordem:

1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. `supabase/seed.sql` opcional

Depois teste usando `supabase/RLS_TEST_GUIDE.md`.

## Vercel

Configuração:

```text
Framework Preset: Vite
Root Directory: nex-gestao-juridica-producao
Install Command: npm install --legacy-peer-deps
Build Command: npm run build
Output Directory: dist/public
```

## Aviso jurídico

O módulo de prazos é uma ferramenta de apoio gerencial. O advogado responsável deve validar os prazos conforme legislação aplicável, tribunal competente e regras processuais vigentes.

## Segurança

Nunca envie `.env.local` para o GitHub. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador.

## Atualização v3.1 — Funcionalidades reais

Esta versão adiciona validações reais por módulo, camada central de regras de negócio, side effects operacionais, financeiro com detalhe/baixa/recibo/DRE/fluxo de caixa, relatórios imprimíveis, Storage com SHA-256 e URL assinada, cron serverless com execução real via service role, schema/RLS complementares e documentação de validação.

Validação local realizada:

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm audit --audit-level=high
```

Para produção, configure Supabase, rode `supabase/schema.sql`, `supabase/rls.sql`, `supabase/seed.sql`, crie usuários por perfil e teste o roteiro de `supabase/RLS_TEST_GUIDE.md`.

## Versão v3.3 — Produção Real Completa

A versão v3.3 adiciona endurecimento de produção: Supabase como fonte principal sem vazamento de demo, convites via backend serverless, idempotência no cron, relações por UUID/client_id, webhook financeiro, teste seguro de integrações e RLS complementar por client_id.

Leia também: `ALTERACOES_V33_PRODUCAO_REAL_COMPLETA.md`.
