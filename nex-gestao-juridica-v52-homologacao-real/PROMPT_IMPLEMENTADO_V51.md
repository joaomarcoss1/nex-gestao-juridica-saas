# PROMPT MESTRE DE IMPLEMENTAÇÃO — NEX GESTÃO JURÍDICA V5.1

Atue como um engenheiro de software sênior especializado em:

* React;
* TypeScript;
* Supabase;
* PostgreSQL;
* arquitetura SaaS multiempresa;
* sistemas jurídicos;
* CRM;
* workflow;
* gestão financeira;
* agendamento;
* segurança;
* testes automatizados;
* performance;
* UX mobile-first.

Você receberá o código atual do **Nex Gestão Jurídica v5.0**.

Sua tarefa não é apenas analisar o projeto. Você deve implementar de forma real, robusta e estrutural todas as correções e funcionalidades descritas neste documento.

O resultado deve ser uma nova versão completa do sistema, pronta para:

* abrir no VS Code;
* instalar com `npm ci`;
* executar localmente;
* publicar no GitHub;
* implantar na Vercel;
* conectar ao Supabase;
* evoluir sem perda de dados;
* operar de forma segura no desktop e no celular.

---

# 1. OBJETIVO PRINCIPAL

Transformar o Nex Gestão Jurídica v5.0 em uma versão operacionalmente confiável, corrigindo principalmente:

* integridade dos processos;
* motor de workflow;
* conversão do CRM;
* geração e baixa financeira;
* sincronização da agenda;
* duplicidades;
* ações parcialmente concluídas;
* perda de campos após recarregar;
* falta de transações;
* problemas de escalabilidade;
* ausência de testes reais;
* limitações mobile.

A nova versão poderá ser identificada como:

```text
Nex Gestão Jurídica v5.1 — Operação Estrutural
```

Não realizar apenas alterações visuais.

Não considerar a implementação concluída enquanto os fluxos centrais não estiverem persistindo corretamente no banco e protegidos contra duplicidade e falhas intermediárias.

---

# 2. REGRAS INEGOCIÁVEIS

## 2.1 Não reescrever o sistema

Trabalhe sobre a arquitetura atual.

Preserve:

* stack tecnológica;
* identidade visual;
* paleta;
* rotas;
* componentes que já funcionam;
* autenticação;
* estrutura multiempresa;
* modo de demonstração;
* dados existentes;
* migrations anteriores;
* integrações já implementadas;
* compatibilidade com desktop;
* compatibilidade com o Supabase atual.

Não iniciar um projeto novo desconectado do sistema existente.

## 2.2 Não realizar alterações destrutivas

É proibido:

* apagar tabelas de produção;
* apagar migrations antigas;
* executar `drop table`;
* remover colunas utilizadas;
* trocar IDs existentes;
* recriar entidades sem migração;
* limpar dados para fazer os testes passarem;
* desativar RLS;
* utilizar service role no navegador;
* ocultar erros com `try/catch` vazio;
* transformar funções reais em mocks;
* usar `any` indiscriminadamente;
* usar `@ts-ignore` para silenciar problemas;
* desabilitar regras do ESLint para obter build verde.

Todas as mudanças de banco devem ser incrementais.

## 2.3 Compatibilidade e rollback

Cada migration nova deverá:

* verificar a existência de tabelas e colunas;
* preservar registros antigos;
* preencher valores padrão com segurança;
* criar índices sem duplicidade;
* permitir aplicação sobre a versão v5.0;
* possuir instruções de rollback;
* ser testada em banco limpo e banco com dados.

## 2.4 Não confiar no frontend

Regras críticas devem ser executadas ou validadas no backend ou no banco.

Não confiar apenas em:

* botão desabilitado;
* ID enviado pelo navegador;
* filtro do frontend;
* status mantido em estado local;
* verificação visual;
* confirmação do usuário.

Conversões, geração financeira, baixa, workflow, encerramento de processo e ações multiempresa devem ser protegidos no servidor.

---

# 3. ESTRATÉGIA OBRIGATÓRIA DE IMPLEMENTAÇÃO

Execute a implementação em etapas pequenas.

## Etapa 1 — Auditoria e mapa de dependências

Antes de alterar o código:

1. Mapear tabelas, migrations, RPCs e políticas RLS.
2. Identificar componentes, hooks, contextos, services e repositories.
3. Localizar todas as referências a:

   * processos;
   * leads;
   * clientes;
   * tarefas;
   * workflows;
   * contratos;
   * lançamentos;
   * pagamentos;
   * recibos;
   * reuniões;
   * eventos;
   * prazos.
4. Identificar campos existentes na interface que não são salvos no Supabase.
5. Identificar ações compostas que executam múltiplos inserts isolados.
6. Identificar locais com risco de duplicação.
7. Criar uma matriz interna de regressão.

## Etapa 2 — Banco e integridade

Criar migrations incrementais e funções transacionais.

## Etapa 3 — Repositórios e serviços

Centralizar regras de negócio fora dos componentes visuais.

## Etapa 4 — Fluxos funcionais

Corrigir Workflow, Processos, CRM, Financeiro e Agendamento.

## Etapa 5 — Performance e mobile

Corrigir carregamento global e experiência no celular.

## Etapa 6 — Testes e homologação

Validar todos os fluxos em banco real de teste.

Cada etapa deve ser validada antes da próxima.

---

# 4. FUNDAÇÃO DE INTEGRIDADE DE DADOS

## 4.1 Criar padrão para ações compostas

Toda ação que cria ou altera vários registros deve ser atômica.

Utilizar:

* função PostgreSQL transacional;
* RPC segura;
* endpoint backend;
* Edge Function;

conforme a arquitetura atual.

Se uma etapa falhar, toda a operação deve ser revertida.

Aplicar transações principalmente em:

* conversão de lead;
* criação de processo com tarefas;
* aplicação de workflow;
* mudança de fase;
* criação de contrato e parcelas;
* registro de custa;
* geração de folha;
* baixa financeira;
* aprovação de proposta;
* criação de reunião com tarefa;
* cancelamento de reunião.

## 4.2 Idempotência

Criar proteção contra repetição por:

* duplo clique;
* retry de rede;
* atualização da página;
* webhook duplicado;
* edição de registro;
* execução repetida de automação.

Adicionar, quando necessário:

```text
idempotency_key
source_type
source_id
operation_type
created_by
processed_at
```

Criar índices únicos para combinações que não podem se repetir.

Exemplos:

```text
unique organization + lead + conversion
unique contract + installment_number
unique cost + financial_entry
unique payroll + financial_entry
unique workflow_run + workflow_step
unique source_type + source_id + event_type
unique payment_request
```

## 4.3 Concorrência

Proteger atualizações simultâneas.

Implementar uma estratégia como:

* `updated_at` validado;
* versão incremental;
* optimistic concurrency;
* lock transacional;
* status de processamento.

Evitar que dois usuários executem a mesma conversão ou baixa simultaneamente.

## 4.4 Auditoria

Registrar ações críticas em tabela de auditoria:

* usuário;
* organização;
* data;
* ação;
* entidade;
* ID;
* estado anterior;
* estado posterior;
* origem;
* IP quando disponível;
* user agent quando aplicável.

Não registrar segredos ou documentos completos.

---

# 5. IMPLEMENTAÇÃO DO MOTOR DE WORKFLOW

## 5.1 Unificar os sistemas de workflow

Atualmente há templates fixos no frontend e templates persistidos no banco.

Eliminar essa duplicidade estrutural.

Definir `workflow_templates` e `workflow_steps` como a fonte oficial dos workflows.

Templates padrão deverão ser inseridos por seed ou migration, e não permanecer escritos diretamente dentro de páginas React.

O frontend deverá:

* buscar templates do banco;
* permitir visualizar etapas;
* aplicar template;
* acompanhar execução;
* editar templates conforme permissão.

## 5.2 Criar execução real de workflow

Criar tabelas equivalentes a:

```text
workflow_runs
workflow_run_steps
```

### `workflow_runs`

Campos recomendados:

```text
id
organization_id
workflow_template_id
process_id
client_id
lead_id
status
current_step_order
started_at
completed_at
cancelled_at
started_by
idempotency_key
metadata
created_at
updated_at
```

### `workflow_run_steps`

Campos recomendados:

```text
id
organization_id
workflow_run_id
workflow_step_id
task_id
step_order
status
depends_on_step_id
started_at
completed_at
skipped_at
blocked_reason
result
created_at
updated_at
```

## 5.3 Controle de etapas

As etapas precisam suportar:

* pendente;
* disponível;
* em andamento;
* bloqueada;
* aguardando revisão;
* concluída;
* ignorada;
* cancelada;
* falhou.

Não liberar etapa dependente antes da conclusão da anterior.

Permitir workflows:

* sequenciais;
* paralelos;
* condicionais.

## 5.4 Aplicação idempotente

O mesmo workflow não pode ser aplicado repetidamente ao mesmo processo sem uma ação explícita.

Antes de aplicar, verificar:

* execução ativa;
* execução concluída;
* versão do template;
* motivo de nova execução.

Exigir confirmação e justificativa quando for necessário reaplicar.

## 5.5 Checklist e bloqueios

Não permitir conclusão ou avanço quando houver:

* checklist obrigatório incompleto;
* documento obrigatório ausente;
* bloqueio ativo;
* aprovação pendente;
* revisão pendente;
* campo obrigatório vazio.

Criar resposta clara informando o motivo do bloqueio.

## 5.6 Horas trabalhadas

Remover qualquer regra que copie automaticamente as horas estimadas para horas realizadas.

Separar:

```text
estimated_minutes
worked_minutes
billable_minutes
```

Horas realizadas devem ser registradas por:

* timer;
* lançamento manual;
* timesheet;
* histórico de trabalho.

Uma tarefa pode ser concluída com zero horas apenas quando a regra permitir.

## 5.7 Motor de automações

Substituir automações baseadas em comparação de textos por estrutura tipada.

Criar modelos equivalentes a:

```text
automation_rules
automation_conditions
automation_actions
automation_executions
```

Gatilhos devem ser enums ou tipos controlados, por exemplo:

```text
lead_created
lead_stage_changed
process_created
process_phase_changed
task_completed
task_overdue
financial_entry_overdue
meeting_created
meeting_cancelled
document_uploaded
proposal_approved
```

Ações:

```text
create_task
update_field
send_notification
create_financial_entry
create_scheduled_event
assign_user
change_status
start_workflow
```

Não depender de nomes fixos como `"e4"`.

Responsáveis precisam ser validados pelo banco e pela organização.

## 5.8 SLA

Implementar SLA com:

* prazo inicial;
* data limite;
* pausa;
* retomada;
* vencimento;
* justificativa;
* alertas;
* escalonamento;
* histórico.

---

# 6. CORREÇÕES ESTRUTURAIS DE PROCESSOS

## 6.1 Persistência completa

Revisar todos os campos presentes no tipo, formulário e páginas de processo.

Garantir persistência real de:

* número CNJ;
* tribunal;
* vara;
* comarca;
* UF;
* classe;
* assunto;
* área;
* tipo;
* polo ativo;
* polo passivo;
* partes;
* cliente;
* parte contrária;
* responsável;
* equipe;
* fase;
* status;
* risco;
* chance de êxito;
* valor da causa;
* honorários;
* custas;
* data de abertura;
* data prevista;
* data de encerramento;
* resumo para cliente;
* estratégia interna;
* observações;
* progresso;
* origem;
* tags;
* dados administrativos.

Após salvar e recarregar a página, nenhum campo preenchido pode desaparecer.

## 6.2 Atualizar tipos e repositórios

Depois das migrations, atualizar:

* tipos TypeScript;
* mapeadores banco → domínio;
* mapeadores domínio → banco;
* repositories;
* services;
* schemas de validação;
* formulários;
* relatórios;
* filtros;
* exportações.

Criar teste de round trip:

1. criar processo;
2. preencher todos os campos;
3. salvar;
4. consultar novamente;
5. comparar valores.

## 6.3 Normalizar movimentações

Não salvar timeline apenas dentro de arrays de estado ou em campos frágeis.

Criar tabela para movimentações processuais:

```text
process_movements
```

Campos sugeridos:

```text
id
organization_id
process_id
movement_type
title
description
occurred_at
source
external_id
visibility
created_by
created_at
```

Garantir idempotência por `external_id` quando a movimentação vier de integração.

## 6.4 Checklist processual

Criar estrutura persistente para:

```text
process_checklists
process_checklist_items
```

Os itens precisam suportar:

* obrigatório;
* concluído;
* responsável;
* prazo;
* evidência;
* documento vinculado;
* usuário que concluiu;
* data da conclusão.

## 6.5 Mudança de fase

Criar serviço transacional para mudança de fase.

Validar:

* checklist;
* tarefas;
* documentos;
* prazos;
* aprovações;
* regras da área jurídica.

Registrar histórico de fase:

```text
process_phase_history
```

Campos:

```text
process_id
previous_phase
new_phase
changed_by
changed_at
reason
workflow_run_id
```

Não aumentar progresso usando apenas `+12%`.

O progresso deve vir das etapas concluídas ou de regra configurável.

## 6.6 Encerramento

Antes de encerrar, verificar:

* tarefas abertas;
* prazos pendentes;
* audiências futuras;
* cobranças pendentes;
* documentos obrigatórios;
* workflow ativo;
* movimentações não analisadas.

Permitir encerramento excepcional apenas para perfil autorizado e com justificativa.

## 6.7 Integração judicial

Manter claramente separados:

* modo de simulação;
* integração real;
* sincronização manual;
* sincronização automática.

Não informar sincronização real quando nenhuma API externa tiver sido chamada.

---

# 7. CORREÇÕES ESTRUTURAIS DO CRM

## 7.1 Conversão transacional

Criar uma função transacional para converter lead.

Exemplo conceitual:

```text
convert_lead_to_client_and_process
```

A operação deve:

1. bloquear o lead para conversão;
2. validar organização;
3. verificar se já foi convertido;
4. procurar cliente existente;
5. criar ou reutilizar cliente;
6. criar processo;
7. iniciar workflow comercial ou jurídico;
8. criar tarefas necessárias;
9. atualizar o lead;
10. registrar IDs da conversão;
11. registrar auditoria;
12. confirmar tudo apenas ao final.

Se qualquer etapa falhar, nenhuma alteração deve permanecer.

## 7.2 Idempotência da conversão

Usar campos como:

```text
converted_at
converted_by
conversion_client_id
conversion_process_id
conversion_status
conversion_idempotency_key
```

O mesmo lead nunca deve gerar múltiplos clientes e processos por acidente.

Ao clicar novamente, o sistema deverá abrir os registros existentes.

## 7.3 Detecção de duplicidade

Antes de criar um cliente, verificar:

* CPF;
* CNPJ;
* e-mail;
* telefone;
* WhatsApp.

Não bloquear automaticamente com base apenas no nome.

Quando houver possível duplicidade, apresentar ao usuário:

* cliente encontrado;
* nível de correspondência;
* opção de reutilizar;
* opção de criar novo com justificativa.

## 7.4 Dados mínimos para conversão

Definir campos obrigatórios de acordo com o tipo de lead.

Exemplo:

* nome;
* área jurídica;
* canal de contato;
* responsável;
* consentimento;
* documento ou justificativa de ausência;
* telefone ou e-mail.

## 7.5 Follow-up em dias úteis

Implementar cálculo real de dias úteis considerando:

* sábados;
* domingos;
* feriados nacionais;
* feriados cadastrados pela organização;
* recessos;
* timezone da organização.

Não utilizar apenas soma de dias corridos.

## 7.6 Checklist comercial persistente

Criar itens persistentes por lead.

Exemplos:

* contato inicial;
* coleta de documentos;
* análise preliminar;
* reunião;
* proposta;
* contrato;
* pagamento inicial.

## 7.7 Lead perdido

Ao mover para perdido, exigir:

* motivo;
* observação;
* concorrente, quando aplicável;
* valor estimado perdido;
* data;
* usuário responsável.

Criar relatórios por motivo de perda.

## 7.8 Métricas de CRM

Calcular corretamente:

* leads por origem;
* conversão por origem;
* conversão por responsável;
* tempo médio por etapa;
* taxa de perda;
* valor do pipeline;
* valor convertido;
* follow-ups vencidos;
* leads sem interação.

---

# 8. CORREÇÕES ESTRUTURAIS DO FINANCEIRO

## 8.1 Fonte de cada lançamento

Todo lançamento gerado automaticamente precisa identificar sua origem.

Adicionar ou utilizar corretamente:

```text
source_type
source_id
source_installment_id
contract_id
cost_id
payroll_id
proposal_id
organization_id
```

Criar restrições únicas para impedir duplicidade.

## 8.2 Contratos e parcelas

Criar estrutura explícita para parcelas:

```text
contract_installments
```

Campos:

```text
id
organization_id
contract_id
installment_number
amount_cents
due_date
status
financial_entry_id
created_at
updated_at
```

Criar índice único:

```text
contract_id + installment_number
```

Editar contrato não deve gerar parcelas novamente.

Parcelas somente devem ser:

* criadas na ativação;
* recalculadas por ação explícita;
* alteradas mediante confirmação;
* versionadas ou auditadas.

## 8.3 Cálculo monetário

Não utilizar valores monetários com arredondamento inteiro.

Armazenar valores em:

* centavos inteiros; ou
* `numeric` com escala definida.

A soma das parcelas deve ser exatamente igual ao total do contrato.

Distribuir diferença de centavos na última parcela.

## 8.4 Datas de parcelas

Calcular vencimento por mês de calendário.

Exemplo:

* primeira parcela em 31 de janeiro;
* próxima parcela deve seguir regra configurada;
* tratar meses sem dia 31;
* tratar finais de semana;
* tratar feriados.

Permitir configuração:

* manter data;
* antecipar;
* postergar;
* próximo dia útil.

## 8.5 Custas

Criar vínculo único entre a custa e o lançamento.

Editar uma custa deve atualizar o lançamento relacionado, não criar outro.

Ao cancelar a custa:

* cancelar ou estornar o lançamento;
* registrar motivo;
* preservar auditoria.

## 8.6 Folha de pagamento

Aplicar a mesma lógica para folha.

Uma folha deve gerar no máximo um lançamento por competência, funcionário e tipo.

Editar a folha não deve duplicar despesas.

## 8.7 Pagamentos e baixas

Criar estrutura própria de pagamentos:

```text
financial_payments
```

Campos:

```text
id
organization_id
financial_entry_id
amount_cents
payment_date
payment_method
reference
receipt_id
idempotency_key
created_by
created_at
cancelled_at
cancellation_reason
```

A baixa deve:

* validar saldo;
* aceitar parcial;
* impedir valor negativo;
* impedir valor superior ao saldo sem autorização;
* atualizar o lançamento;
* gerar recibo uma única vez;
* registrar auditoria;
* ser idempotente.

## 8.8 Recibos

Cada pagamento deve possuir recibo próprio.

Não permitir dois recibos para a mesma operação sem cancelamento formal.

Criar numeração por organização.

## 8.9 Máquina de estados financeira

Padronizar status.

Exemplo:

```text
draft
pending
partially_paid
paid
overdue
cancelled
renegotiated
refunded
written_off
```

Não transformar automaticamente registros cancelados ou renegociados em atrasados.

Centralizar transições permitidas.

## 8.10 Indicadores financeiros

Separar claramente:

* previsto;
* recebido;
* pago;
* a receber;
* a pagar;
* vencido;
* cancelado;
* renegociado;
* competência;
* caixa.

Todos os indicadores precisam respeitar:

* organização;
* período;
* status;
* tipo;
* cliente;
* processo;
* centro de custo.

Não somar cancelados nos totais operacionais.

## 8.11 DRE e fluxo de caixa

Diferenciar:

* regime de competência;
* regime de caixa.

Não misturar lançamento futuro com valor efetivamente recebido.

## 8.12 Renegociação

Implementar fluxo seguro:

1. registrar renegociação;
2. cancelar ou substituir parcelas antigas;
3. criar novas parcelas;
4. preservar histórico;
5. não apagar lançamentos anteriores.

---

# 9. CORREÇÕES ESTRUTURAIS DE AGENDAMENTO

## 9.1 Normalizar origem dos eventos

Definir enums únicos para `source_type`.

Exemplo:

```text
manual
meeting
hearing
task
deadline
financial_entry
process
google_calendar
```

Eliminar divergência entre:

```text
finance
financial_entry
```

Criar migration de normalização dos valores antigos.

## 9.2 Deduplicação

Criar restrição única adequada, por exemplo:

```text
organization_id + source_type + source_id + event_type
```

O mesmo lançamento ou tarefa não pode aparecer duas vezes na agenda.

## 9.3 Visibilidade

Separar eventos:

* internos;
* equipe;
* cliente;
* públicos.

Lançamentos financeiros internos nunca devem ser marcados automaticamente como visíveis ao cliente.

Somente cobranças vinculadas ao próprio cliente poderão ser exibidas no portal.

Despesas, folha e custos internos devem permanecer invisíveis.

## 9.4 Status

Padronizar os status de eventos:

```text
scheduled
confirmed
in_progress
completed
cancelled
no_show
rescheduled
```

Traduzir somente na interface.

Não armazenar mistura de português e inglês.

## 9.5 Conflitos de agenda

Antes de salvar, verificar conflitos por:

* responsável;
* equipe;
* sala;
* endereço;
* recurso;
* audiência;
* duração;
* intervalo entre compromissos.

Permitir conflito apenas mediante confirmação e permissão.

Mostrar compromissos conflitantes.

## 9.6 Reunião e tarefa de preparação

Criar vínculo explícito entre a reunião e a tarefa.

Ao alterar:

* data;
* responsável;
* cliente;
* processo;
* status;

atualizar a tarefa vinculada.

Ao cancelar a reunião:

* cancelar ou reavaliar a tarefa;
* registrar motivo;
* preservar histórico.

## 9.7 Timezone

Armazenar datas em UTC.

Cada organização deve possuir timezone configurável.

Exibir datas no timezone da organização ou do usuário.

Tratar corretamente:

* `datetime-local`;
* conversão para UTC;
* exibição;
* horário de verão;
* integração com Google Calendar.

Não depender do timezone do servidor da Vercel.

## 9.8 Recorrência

Implementar recorrência com regra estruturada:

* diária;
* semanal;
* mensal;
* anual;
* dias específicos;
* fim por data;
* fim por quantidade.

Permitir editar:

* somente este evento;
* este e os próximos;
* toda a série.

## 9.9 Visualizações

Adicionar ou concluir:

* agenda diária;
* semanal;
* mensal;
* lista;
* próximos eventos;
* agrupamento por dia;
* filtros;
* paginação;
* busca por período;
* busca por cliente;
* busca por processo;
* busca por responsável.

## 9.10 Integração com Google Calendar

Manter clara a diferença entre:

* evento local;
* sincronizado;
* aguardando sincronização;
* erro;
* conflito;
* removido externamente.

Registrar `external_event_id`.

Garantir idempotência.

---

# 10. PERFORMANCE E ESCALABILIDADE

## 10.1 Remover carregamento global massivo

O sistema não pode carregar todas as tabelas no login.

Refatorar para carregamento por módulo.

Exemplos:

* abrir CRM → carregar leads e fontes;
* abrir Processos → carregar processos paginados;
* abrir Financeiro → carregar lançamentos do período;
* abrir Agenda → carregar eventos do intervalo;
* abrir Workflow → carregar tarefas e execuções necessárias.

## 10.2 Paginação server-side

Implementar paginação real.

Cada módulo deverá possuir:

* página;
* quantidade por página;
* total;
* ordenação;
* filtros;
* busca;
* loading;
* erro;
* estado vazio.

Não carregar 20 mil registros no navegador.

## 10.3 Busca e filtros no banco

Executar filtros no Supabase sempre que possível.

Não buscar todos os dados para depois filtrar em memória.

## 10.4 Cache

Utilizar estratégia compatível com a arquitetura atual:

* cache por query;
* invalidação por entidade;
* stale time;
* deduplicação;
* cancelamento de requisições;
* retry controlado.

## 10.5 Bundle

Manter lazy loading já existente e ampliar quando necessário.

Carregar sob demanda:

* gráficos;
* PDF;
* Excel;
* editores;
* calendários complexos;
* bibliotecas pesadas.

---

# 11. MOBILE-FIRST

## 11.1 Workflow mobile

O workflow não pode depender apenas de Kanban horizontal.

Criar no mobile:

* seletor de status;
* uma etapa por vez;
* lista vertical;
* filtros recolhíveis;
* ações em menu;
* alternativa ao drag-and-drop.

## 11.2 Processos mobile

Organizar detalhes do processo em:

* resumo;
* partes;
* tarefas;
* prazos;
* documentos;
* movimentações;
* financeiro;
* histórico.

Usar tabs, accordions ou navegação interna.

Evitar páginas excessivamente longas.

## 11.3 Financeiro mobile

Utilizar cards com:

* descrição;
* cliente;
* vencimento;
* valor;
* status;
* ação principal;
* menu secundário.

Não comprimir tabelas complexas.

## 11.4 Agenda mobile

Priorizar:

* hoje;
* próximos;
* atrasados;
* lista diária;
* filtros rápidos.

## 11.5 Formulários

Testar em:

* 320px;
* 360px;
* 375px;
* 390px;
* 414px;
* 768px;
* 1024px;
* desktop.

Validar:

* teclado virtual;
* campos de data;
* selects;
* modais;
* drawers;
* botões fixos;
* rolagem;
* safe area;
* mensagens de erro.

Nenhum botão deve ficar escondido.

Nenhum formulário pode perder dados ao trocar de aba ou fechar acidentalmente.

---

# 12. VALIDAÇÃO E FEEDBACK DE AÇÕES

Toda operação precisa ter estado explícito:

```text
idle
validating
processing
success
error
```

Durante ações críticas:

* bloquear clique duplicado;
* exibir processamento;
* não fechar modal antes da resposta;
* não exibir sucesso antecipado;
* manter os dados preenchidos em caso de erro;
* permitir tentar novamente;
* informar código ou referência do erro sem expor stack trace.

---

# 13. TESTES AUTOMATIZADOS REAIS

## 13.1 Testes unitários

Criar testes para:

* cálculo de parcelas;
* distribuição de centavos;
* dias úteis;
* regras de status;
* permissões;
* transições de workflow;
* progresso;
* saldo financeiro;
* pagamento parcial;
* conflitos de agenda;
* timezone;
* validações de processo;
* duplicidade de CRM.

## 13.2 Testes de integração com banco

Não limitar testes de integração a buscar textos no código.

Executar testes reais em ambiente Supabase de teste ou banco local.

Testar:

### CRM

* conversão completa;
* rollback em falha;
* duplo clique;
* cliente existente;
* lead já convertido.

### Workflow

* aplicação única;
* dependência;
* bloqueio;
* conclusão;
* reaplicação autorizada;
* falha intermediária.

### Processos

* persistência de todos os campos;
* mudança de fase;
* movimentação;
* encerramento bloqueado;
* isolamento multiempresa.

### Financeiro

* contrato com parcelas;
* edição sem duplicação;
* custa sem duplicação;
* folha sem duplicação;
* baixa parcial;
* baixa total;
* repetição da baixa;
* recibo único;
* cancelamento;
* renegociação.

### Agenda

* criação;
* deduplicação;
* conflito;
* cancelamento;
* alteração de reunião;
* sincronização da tarefa;
* timezone.

## 13.3 Testes E2E

Criar fluxos E2E em desktop e mobile:

1. autenticar;
2. cadastrar lead;
3. converter lead;
4. abrir cliente criado;
5. abrir processo criado;
6. iniciar workflow;
7. concluir etapa;
8. avançar processo;
9. criar contrato;
10. gerar parcelas;
11. registrar pagamento;
12. confirmar recibo;
13. criar reunião;
14. alterar reunião;
15. confirmar atualização da tarefa;
16. validar agenda;
17. recarregar o navegador;
18. confirmar persistência.

## 13.4 Teste multiempresa

Criar Organização A e Organização B.

Confirmar que o usuário da Organização A não consegue:

* ver leads da B;
* converter leads da B;
* abrir processos da B;
* aplicar workflows da B;
* consultar finanças da B;
* baixar documentos da B;
* consultar eventos da B;
* acessar IDs diretamente pela URL.

## 13.5 Testes mobile

Executar Playwright pelo menos em:

* 320 × 700;
* 360 × 800;
* 390 × 844;
* 414 × 896;
* 768 × 1024;
* desktop.

Validar ausência de scroll horizontal global.

---

# 14. MIGRATIONS E RLS

Criar novas migrations numeradas após a v5.0.

Organização recomendada:

```text
v51_core_integrity.sql
v51_workflow_engine.sql
v51_process_persistence.sql
v51_crm_conversion.sql
v51_financial_integrity.sql
v51_scheduling_normalization.sql
v51_indexes_performance.sql
v51_rls_security.sql
```

As migrations devem:

* funcionar em ordem;
* não depender de execução manual;
* possuir comentários;
* criar índices;
* configurar RLS;
* configurar grants;
* proteger funções `security definer`;
* definir `search_path`;
* revogar execução pública indevida;
* validar `organization_id`;
* impedir acesso cruzado.

---

# 15. SEGURANÇA

Preservar e testar as correções da v5.0:

* autenticação das APIs financeiras;
* autorização por organização;
* Billing Portal protegido;
* webhooks com segredo obrigatório;
* idempotência;
* portal do cliente autenticado;
* Storage isolado;
* RPCs anônimas revogadas;
* service role somente no backend.

Adicionar testes de regressão para impedir que essas proteções sejam removidas.

---

# 16. CI/CD

Atualizar o workflow do GitHub Actions para executar:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run build
npm audit
```

O pipeline deverá falhar quando houver:

* erro TypeScript;
* teste falhando;
* migration inválida;
* segredo exposto;
* service role no frontend;
* vulnerabilidade crítica;
* build quebrado.

---

# 17. COMANDOS OBRIGATÓRIOS DE VALIDAÇÃO

Executar ao final:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run build
npm audit
```

Também executar buscas por:

```text
window.prompt
window.confirm
window.alert
service_role
@ts-ignore
eslint-disable
TODO
FIXME
organizationId vindo do frontend
customerId arbitrário
limites fixos altos
consultas globais
any
```

Não considerar o trabalho concluído com comandos falhando.

---

# 18. CRITÉRIOS DE ACEITAÇÃO

## Workflow

* Existe uma única fonte de templates.
* Existe execução persistida.
* Etapas respeitam dependências.
* Não há aplicação duplicada.
* Checklists bloqueiam avanço.
* Horas realizadas não são inventadas.
* Automações são tipadas e executáveis.

## Processos

* Todos os campos são persistidos.
* Dados continuam após reload.
* Movimentações possuem tabela própria.
* Mudança de fase é validada.
* Encerramento verifica pendências.
* Histórico é auditável.

## CRM

* Conversão é transacional.
* Duplo clique não duplica registros.
* Cliente existente pode ser reutilizado.
* Lead convertido aponta para cliente e processo.
* Follow-up usa dias úteis.
* Perda exige motivo.

## Financeiro

* Editar contrato não duplica parcelas.
* Editar custa não duplica despesa.
* Editar folha não duplica lançamento.
* Baixa repetida não duplica pagamento.
* Recibo é único.
* Pagamento parcial funciona.
* KPIs respeitam período e status.
* Cancelados não entram nos totais.
* Valores fecham exatamente em centavos.

## Agenda

* Origens estão normalizadas.
* Eventos não são duplicados.
* Despesas internas não aparecem para clientes.
* Conflitos são detectados.
* Reunião e tarefa permanecem sincronizadas.
* Timezone é tratado corretamente.
* Cancelados não aparecem como pendentes.

## Performance

* Login não carrega todas as tabelas.
* Dados são carregados por módulo.
* Paginação é server-side.
* Filtros são aplicados no banco.

## Mobile

* Sistema funciona em 320px.
* Workflow possui alternativa ao Kanban.
* Formulários funcionam com teclado aberto.
* Não existe rolagem horizontal global.
* Nenhuma ação fica fora do viewport.

---

# 19. ENTREGÁVEIS

Entregar:

1. Projeto completo atualizado.
2. ZIP limpo sem `node_modules`.
3. `package-lock.json` atualizado.
4. Migrations v5.1.
5. Testes unitários.
6. Testes de integração reais.
7. Testes E2E.
8. Workflow do GitHub Actions.
9. `.env.example`.
10. Guia de instalação.
11. Guia de migrations.
12. Guia de rollback.
13. Guia de deploy.
14. Relatório de arquivos alterados.
15. Relatório de riscos corrigidos.
16. Lista de dependências externas.
17. Resultados dos comandos de validação.
18. Capturas desktop e mobile.
19. Checksum SHA-256 do ZIP.

Não incluir:

* `.env.local`;
* chaves reais;
* tokens;
* credenciais;
* `node_modules`;
* `dist`;
* arquivos temporários;
* dados pessoais reais.

---

# 20. RELATÓRIO FINAL

Para cada requisito, classificar como:

* implementado e validado;
* implementado parcialmente;
* dependente de serviço externo;
* não implementado;
* não aplicável.

Não declarar uma funcionalidade como concluída apenas porque existe um botão ou componente.

Uma funcionalidade somente pode ser marcada como implementada quando:

* persiste no banco;
* respeita RLS;
* funciona após reload;
* trata erros;
* não duplica registros;
* possui teste;
* funciona no mobile;
* não quebra fluxos anteriores.

---

# RESULTADO FINAL ESPERADO

A nova versão deve ser segura para operação jurídica e financeira, com:

* dados consistentes;
* conversões atômicas;
* workflow real;
* processos completos;
* financeiro confiável;
* agenda sem duplicidades;
* isolamento multiempresa;
* carregamento escalável;
* mobile utilizável;
* testes automatizados;
* migrations seguras;
* documentação completa.

Não interrompa a implementação após corrigir apenas os pontos mais simples.

Não entregue somente recomendações.

Aplique as correções no código, no banco, nos testes e na interface, preservando o sistema atual e produzindo uma versão completa, estável e pronta para homologação real.
