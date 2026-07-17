# Nex Gestão Jurídica v4.9 — Operação limpa, CRM, agenda e Google Leads

## Objetivo

Esta versão remove da experiência visível das empresas qualquer linguagem técnica de código, ambiente, Supabase, modo demo e integrações internas. A interface passa a apresentar apenas termos operacionais do escritório jurídico.

## O que foi ajustado

### 1. Tela inicial e login
- Ponto rápido permanece como primeira tela.
- Acesso do Admin Master deixou de aparecer como opção evidente.
- O Admin Master agora fica em um pequeno link discreto chamado **acesso interno**.
- O login da equipe usa a linguagem **Código do escritório** em vez de textos técnicos.

### 2. Remoção de informações técnicas para empresas
- Menu lateral não exibe Status do Sistema, Onboarding técnico e Integrações para usuários comuns.
- Indicadores como Supabase, demo, código, produção, migration e variáveis foram removidos da experiência comum.
- Configurações internas ficam restritas ao Admin Master.

### 3. Design e layout
- Tema geral migrado para fundo claro profissional.
- Paleta NexLabs mantida: azul institucional, navy escuro, dourado discreto e branco.
- Cards, botões, tabelas, modais e campos foram ajustados para uma aparência mais corporativa.
- Mobile recebeu redução de animações pesadas, rolagem mais leve, touch-action nos botões e navegação inferior mais limpa.

### 4. CRM jurídico
- CRM permanece como centro de captação, triagem, proposta, contrato e conversão.
- Origem **Google Leads** adicionada ao CRM.
- Card operacional de captação automática com teste rápido de entrada de lead.
- Endpoint preparado: `/api/integrations/google-leads-webhook`.

### 5. Workflow da equipe
- Mantido e refinado como central de tarefas da equipe:
  - responsável direto;
  - delegado por;
  - revisor;
  - SLA;
  - prioridade;
  - etapa operacional;
  - comunicação interna vinculada à tarefa;
  - aplicação de workflow padrão por processo;
  - desempenho individual e riscos operacionais.

### 6. Financeiro reorganizado
O módulo Financeiro agora possui exatamente as abas solicitadas:
- **Precificação**
- **Folha de pagamento**
- **Folha de despesas**

A expressão “financeiro em dois ramos” foi removida.

### 7. Agenda integrada
Nova estrutura de agenda:
- reuniões da equipe;
- reuniões com clientes;
- audiências;
- tarefas;
- prazos;
- agendamento de pagamentos;
- agendamento de salários e despesas.

Ao criar reunião com responsável, o sistema também cria uma tarefa de preparação.

### 8. Processos local e judicial
A tela foi ajustada para linguagem operacional:
- acompanhamento local;
- acompanhamento judicial;
- CNJ;
- movimentações;
- prazos;
- publicações;
- tarefas automáticas.

## Banco de dados

Nova migration:

`supabase/migrations/20260713_v49_operacao_limpa_crm_agenda_google_leads.sql`

Inclui:
- campos extras em leads;
- tabela `crm_lead_sources`;
- tabela `scheduled_events`;
- campos extras para agenda, finanças e workflow;
- RLS básico para as novas tabelas.

## Variáveis novas para Google Leads

Opcional:

```env
GOOGLE_LEADS_WEBHOOK_SECRET=
GOOGLE_LEADS_DEFAULT_ORG_CODE=
```

O webhook pode receber dados do formulário do Google e transformar automaticamente em lead do CRM.

## Validação executada

```bash
npm install --legacy-peer-deps --no-audit --no-fund
npm run check
npm run build
npm audit --audit-level=high --omit=dev
```

Resultado:
- TypeScript sem erros.
- Build concluído com sucesso.
- 0 vulnerabilidades altas em dependências de produção.
