# Alterações aplicadas — evolução SaaS maduro

Esta versão aplica a evolução técnica solicitada para o Nex Gestão Jurídica.

## Arquitetura

- `App.tsx` deixou de concentrar as funcionalidades.
- As páginas foram movidas para módulos em `client/src/features/*/pages`.
- Componentes compartilhados foram movidos para `client/src/components`.
- Tipos globais foram centralizados em `client/src/types/app.ts`.
- Dados demo/seed visual ficaram em `client/src/data/defaultState.ts`.
- Estado e sincronização ficaram no hook `client/src/hooks/useNexState.ts`.
- Persistência por tabela normalizada ficou em `client/src/services/normalizedRepository.ts`.

## Persistência

Os módulos agora tentam gravar diretamente em tabelas normalizadas do Supabase, com fallback local seguro:

- clientes → `clients`
- leads → `leads`
- processos → `processes`
- tarefas → `tasks`
- financeiro → `financial_entries`
- precificação → `pricing_proposals`
- ponto → `time_records`
- documentos → `documents` + Storage `documentos`
- automações → `automation_rules` e `automation_runs`

## UX/UI

- Microinterações corporativas em botões, cards e telas.
- Transição suave entre páginas.
- Toasts de sucesso/erro/informação.
- Cards com hover discreto e sombra premium.
- Formulários mais organizados.
- Tabelas com rolagem horizontal segura.
- Layout responsivo melhorado para desktop, tablet e celular.

## Funcionalidades reforçadas

- Scanner de documentos com câmera/upload, tratamento por canvas, hash SHA-256, PDF e Storage.
- Portal do cliente com envio real de documento e criação de tarefa de conferência.
- Ponto eletrônico com sequência correta, PIN, justificativa e auditoria.
- Precificação jurídica completa integrada ao módulo financeiro.
- Automações internas com criação, ativação/pausa, teste e logs.
- Financeiro com baixa de pagamentos e exportação CSV.
- Relatórios com base nos dados dos módulos.

## Segurança

- IDs novos gerados como UUID para compatibilidade com Supabase/PostgreSQL.
- PIN tratado por verificação/hash no frontend demo; produção deve usar hash seguro server-side.
- Auditoria acionada nas principais operações.
- `npm audit --audit-level=high` validado com 0 vulnerabilidades.

## Validação

Executado com sucesso:

```bash
npm run check
npm run build
npm audit --audit-level=high
```
