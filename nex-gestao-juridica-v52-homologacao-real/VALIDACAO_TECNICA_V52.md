# Validação técnica — Nex Gestão Jurídica v5.2

Data da validação local: 13 de julho de 2026.

## Aprovado localmente

- TypeScript sem erros.
- Verificações estáticas críticas aprovadas.
- 31 testes unitários aprovados.
- 26 testes de contrato/estrutura aprovados.
- 9 migrations v5.2 aceitas pelo parser PostgreSQL `pglast`.
- Build Vite concluído com 2.330 módulos processados.
- `npm audit --audit-level=high`: zero vulnerabilidades encontradas.
- Instalação limpa aprovada com `npm ci` a partir de uma cópia sem `node_modules` e `dist`.
- 4 testes E2E aprovados usando Chromium do sistema.
- Viewports exercitados: 320, 360, 390, 414, 768 e 1440 px.
- CRM mobile: criação de lead e permanência após troca de módulo.
- Ausência de overflow horizontal global nos módulos críticos testados.

## Particularidade do sandbox

O ambiente bloqueou `page.goto(http://127.0.0.1)` com `ERR_BLOCKED_BY_ADMINISTRATOR`. A suíte possui um modo alternativo que busca o HTML pelo processo de teste e o injeta com `setContent`. Os mesmos testes executam por navegação normal no GitHub Actions e em uma máquina comum.

## Não validado contra Supabase real nesta entrega

Não havia URL, chaves e usuários de um projeto Supabase de homologação, nem Supabase CLI/Docker/PostgreSQL disponíveis no ambiente. Portanto, os seguintes scripts foram executados e corretamente marcados como `SKIPPED`:

- `npm run test:migrations`
- `npm run test:integration`
- `npm run test:rls`
- `npm run test:concurrency`

Isso significa que a sintaxe externa, contratos e regras locais foram validados, mas a execução real das migrations, RLS e concorrência deve ocorrer em um projeto de homologação antes da produção.

## Critérios que exigem serviço externo

- Aplicação completa das migrations no PostgreSQL/Supabase.
- RLS com duas organizações e dois clientes reais de teste.
- Concorrência real de pagamentos e recibos.
- Stripe, Google Calendar, Google Leads e webhooks.
- Storage e e-mail de link mágico.

## Comandos

```bash
npm ci
npm run validate:local
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium PLAYWRIGHT_NO_NAVIGATION=1 npm run test:e2e
```
