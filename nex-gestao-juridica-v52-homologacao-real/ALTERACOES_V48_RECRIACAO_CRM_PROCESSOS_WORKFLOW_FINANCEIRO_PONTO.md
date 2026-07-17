# Nex Gestão Jurídica v4.8 — Recriação Operacional Robusta

Esta versão reposiciona o sistema para ser mais focado em **CRM jurídico**, **acompanhamento de processos local e integrado ao Judiciário**, **workflow completo da equipe**, **financeiro em dois ramos** e **ponto rápido sem login**.

## 1. CRM como centro do sistema

O módulo CRM foi reestruturado para funcionar como entrada principal do negócio jurídico:

- Funil jurídico por etapas.
- Triagem comercial com checklist operacional.
- Follow-ups vencidos e criação rápida de tarefa.
- Conversão de lead em cliente, processo local e tarefas iniciais.
- Criação automática de tarefas de triagem e precificação/contrato.
- Métricas de conversão, leads quentes e pipeline financeiro.

## 2. Processos: local + integração judicial

O módulo de processos agora foi preparado para atuar em dois modos:

- **Controle local**: processos sem CNJ, consultivos, administrativos, extrajudiciais, contratos e serviços avulsos.
- **Controle judicial integrado**: processos com CNJ preparados para PJe, e-SAJ, Projudi, TRT/TRF, publicações e APIs externas.

Incluído no front:

- Abas para Todos, Controle local, Com CNJ e Risco/Parados.
- Barramento visual de integração judiciária.
- Botão de sincronização de movimentação.
- Simulação operacional que cria histórico, prazo e tarefa de análise.
- Timeline resumida em cada processo.
- Campos de resumo ao cliente e estratégia interna.

Incluído no Supabase:

- Colunas de integração judicial na tabela `processes`.
- Tabela `process_movements`.
- Tabela `judiciary_integrations`.
- Índices por organização, CNJ e integração.

## 3. Workflow completo da equipe

O módulo Tarefas foi transformado em command center operacional:

- Criação de tarefas com responsável, delegador e revisor.
- Etapas: Triagem, Execução, Revisão, Protocolo, Cliente e Concluído.
- SLA interno, horas estimadas, horas gastas e nota de qualidade.
- Kanban operacional.
- Aplicação de workflow padrão por processo.
- Criação automática de tarefas encadeadas.
- Comunicação interna vinculada à tarefa e ao processo.
- Painel de desempenho individual.
- Painel de riscos operacionais.

Incluído no Supabase:

- Campos extras em `tasks`.
- Tabelas `workflow_templates`, `workflow_steps` e `workflow_messages`.

## 4. Financeiro em dois ramos

O financeiro foi reorganizado em duas frentes principais:

### Ramo 1 — Precificação e cobranças dos processos

- Contratos de honorários.
- Honorários contratuais.
- Entrada.
- Parcelas.
- Êxito.
- Sucumbência.
- Cobranças por processo.
- Baixa e recibo.

### Ramo 2 — Folha, despesas e acompanhamento gerencial

- Folha de pagamento por funcionário.
- Benefícios, descontos, comissões, faltas e atrasos.
- Lançamento automático de folha como despesa.
- Custas, guias, diligências, correspondentes e despesas internas.
- DRE gerencial simplificada.
- Exportação CSV.

Incluído no Supabase:

- Tabela `fee_contracts`.
- Tabela `cost_entries`.
- Tabela `payrolls`.
- Campos extras em `financial_entries`.

## 5. Ponto rápido antes do login

A tela inicial agora abre primeiro no **Ponto rápido**.

O funcionário pode:

- Informar a matrícula da empresa.
- Selecionar o colaborador.
- Digitar PIN.
- Registrar entrada, saída intervalo, retorno e saída final.
- Registrar justificativa quando estiver fora da tolerância.
- Usar sem entrar no painel administrativo.

Em ambiente demo/local, o ponto grava no estado local. Em Supabase configurado, a tela está preparada para usar as RPCs:

- `public_point_employees`
- `public_point_punch`

Estas funções foram adicionadas na migration v4.8.

## 6. Mobile e performance

Foram aplicados ajustes para reduzir travamentos em botões e rolagem:

- Remoção/redução de animações pesadas.
- `touch-action: manipulation` para botões e inputs.
- `content-visibility` em cards e painéis.
- Bottom navigation fixa no mobile.
- Kanban com scroll horizontal mais leve.
- Tabelas com rolagem horizontal no mobile.
- Menos transformações em hover.
- Suporte a `prefers-reduced-motion`.

## 7. Arquivos alterados

- `client/src/features/auth/pages/LoginPage.tsx`
- `client/src/features/crm/pages/CRMPage.tsx`
- `client/src/features/processos/pages/ProcessosPage.tsx`
- `client/src/features/tarefas/pages/TarefasPage.tsx`
- `client/src/features/financeiro/pages/FinanceiroPage.tsx`
- `client/src/index.css`
- `package.json`
- `package-lock.json`
- `supabase/migrations/20260713_v48_crm_processos_workflow_financeiro_ponto_mobile.sql`

## 8. Validação executada

```bash
npm run check
npm run build
npm audit --audit-level=high --omit=dev
```

Resultado:

- TypeScript sem erros.
- Build Vite concluído.
- 0 vulnerabilidades altas.

## 9. Observação importante

A integração judicial real depende de APIs/conectores oficiais ou serviços intermediários para cada tribunal. Nesta versão, a estrutura de banco, telas, workflow e simulação operacional estão prontas para receber esses conectores, mas a conexão real com PJe/e-SAJ/Projudi precisa das credenciais, endpoint e backend específico de cada provedor.
