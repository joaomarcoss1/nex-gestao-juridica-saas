# PROMPT MESTRE DE CORREÇÃO E HOMOLOGAÇÃO REAL — NEX GESTÃO JURÍDICA V5.2

Atue como um engenheiro de software sênior especializado em React, TypeScript, Supabase, PostgreSQL, arquitetura SaaS multiempresa, segurança, sistemas jurídicos, CRM, workflow, financeiro, agenda, testes automatizados e UX mobile-first.

Você receberá o projeto atual do **Nex Gestão Jurídica v5.1 — Operação Estrutural**.

Sua tarefa é corrigir de forma real, incremental e robusta todos os problemas identificados na análise técnica da versão atual.

A nova versão deverá ser identificada como:

```text
Nex Gestão Jurídica v5.2 — Homologação Real
```

O objetivo principal é eliminar a diferença entre:

* o comportamento do modo demonstração;
* o comportamento com Supabase real;
* o que os testes estruturais afirmam;
* o que realmente acontece no PostgreSQL após migrations, reload e concorrência.

Não entregue somente recomendações.

Aplique as correções no código, migrations, RPCs, RLS, mapeadores, testes, interface, documentação e pipeline de CI.

---

# 1. REGRAS INEGOCIÁVEIS

## 1.1 Não reescrever o sistema

Trabalhe sobre o projeto atual.

Preserve:

* stack React e TypeScript;
* Supabase;
* estrutura visual;
* identidade da NexLabs;
* rotas;
* autenticação;
* portal do cliente;
* funcionamento desktop;
* funcionamento mobile;
* modo de demonstração;
* migrations anteriores;
* dados existentes;
* compatibilidade com a v5.1.

Não crie um projeto paralelo ou desconectado.

## 1.2 Não editar migrations já executadas

Não altere migrations anteriores como se nunca tivessem sido utilizadas.

Crie migrations corretivas posteriores à v5.1.

Todas as mudanças devem ser incrementais, compatíveis e não destrutivas.

É proibido:

* apagar tabelas;
* apagar dados;
* usar `DROP TABLE`;
* desabilitar RLS;
* liberar acesso para `anon`;
* colocar service role no frontend;
* remover campos existentes;
* limpar dados para fazer testes passarem;
* usar `@ts-ignore`;
* silenciar erros com `any`;
* ocultar falhas com `try/catch` vazio.

## 1.3 Não confiar apenas no modo demonstração

Toda regra crítica precisa ser validada com:

* PostgreSQL real;
* Supabase local ou ambiente de homologação;
* migrations aplicadas em ordem;
* reload da página;
* dados carregados novamente do banco;
* dois usuários e duas organizações;
* perfil cliente;
* concorrência e repetição de requisição.

## 1.4 Não afirmar que algo está pronto sem validação real

Uma correção somente poderá ser considerada concluída quando:

* a migration executar;
* a operação persistir;
* o reload manter os dados;
* o RLS funcionar;
* a RPC rejeitar referências inválidas;
* o teste automatizado executar o comportamento real;
* o frontend tratar corretamente o retorno do banco;
* o mobile continuar funcionando.

---

# 2. PRIMEIRA ETAPA — AUDITORIA OBRIGATÓRIA

Antes de modificar o código:

1. Mapear todas as migrations da v4.8, v4.9, v5.0 e v5.1.
2. Identificar tabelas recriadas com `CREATE TABLE IF NOT EXISTS`.
3. Comparar colunas esperadas pela v5.1 com colunas realmente existentes nas versões anteriores.
4. Mapear todas as RPCs `SECURITY DEFINER`.
5. Mapear todas as políticas RLS.
6. Identificar políticas permissivas sobrepostas.
7. Localizar mapeadores banco → domínio.
8. Localizar mapeadores domínio → banco.
9. Comparar camelCase do frontend com snake_case do Supabase.
10. Identificar status em português e inglês.
11. Identificar regras que alteram status automaticamente.
12. Identificar consultas que carregam centenas ou milhares de registros.
13. Identificar testes que apenas procuram textos no código.
14. Criar uma matriz interna de riscos e regressões.

---

# 3. PRIORIDADE P0 — CORRIGIR MIGRATION DE `process_movements`

## 3.1 Problema atual

A tabela `process_movements` já foi criada em uma migration anterior com colunas como:

```text
provider
external_movement_id
movement_at
requires_action
raw_payload
```

A v5.1 espera colunas diferentes:

```text
movement_type
occurred_at
source
external_id
visibility
created_by
archived_at
```

A migration atual usa:

```sql
CREATE TABLE IF NOT EXISTS public.process_movements
```

Isso não adiciona colunas ausentes quando a tabela já existe.

Depois, índices, RPCs e consultas utilizam colunas que podem não existir.

## 3.2 Correção obrigatória

Criar uma nova migration corretiva, por exemplo:

```text
v52_process_movements_compatibility.sql
```

Ela deve:

* verificar se a tabela existe;
* adicionar somente colunas ausentes;
* preservar as colunas antigas;
* migrar dados antigos para os novos campos;
* não apagar registros;
* não renomear de forma destrutiva;
* criar índices somente após garantir as colunas;
* preencher valores padrão seguros;
* preservar compatibilidade com integrações antigas.

Exemplos de migração de dados:

```text
occurred_at <- movement_at
external_id <- external_movement_id
source <- provider
```

Definir regras claras para `movement_type` e `visibility`.

## 3.3 Compatibilidade temporária

Durante a transição:

* o mapper deve entender colunas antigas e novas;
* a escrita deve utilizar preferencialmente o novo padrão;
* a leitura não pode falhar caso registros antigos não possuam todos os campos.

## 3.4 Testes

Criar testes reais para:

1. aplicar migrations antigas;
2. inserir movimentação no formato antigo;
3. aplicar a migration v5.2;
4. consultar o registro;
5. confirmar que os dados foram preservados;
6. criar movimentação nova;
7. confirmar que índices e RPCs funcionam.

---

# 4. PRIORIDADE P0 — MAPEADORES EXPLÍCITOS

## 4.1 Problema atual

As novas entidades da v5.1 utilizam campos camelCase no frontend e snake_case no Supabase.

Exemplos:

```text
workflowRunId ↔ workflow_run_id
processId ↔ process_id
financialEntryId ↔ financial_entry_id
amountCents ↔ amount_cents
```

O uso de mapeadores genéricos pode fazer o modo demo funcionar e o Supabase real falhar após reload.

## 4.2 Criar mapeadores dedicados

Criar mapeadores explícitos para:

* `workflow_runs`;
* `workflow_run_steps`;
* `process_movements`;
* `process_phase_history`;
* `contract_installments`;
* `financial_payments`;
* `scheduled_events`;
* `crm_lead_sources`;
* `financial_entries`;
* demais entidades criadas na v5.1.

Cada entidade deve possuir funções equivalentes a:

```typescript
mapWorkflowRunFromDatabase()
mapWorkflowRunToDatabase()

mapFinancialPaymentFromDatabase()
mapFinancialPaymentToDatabase()
```

## 4.3 Campos obrigatórios

Os mapeadores devem tratar:

* UUIDs;
* datas;
* valores nulos;
* JSON;
* arrays;
* enums;
* valores monetários;
* versões;
* campos antigos;
* valores padrão;
* propriedades opcionais.

## 4.4 Proibição

Não utilizar conversão genérica automática como fonte principal para entidades críticas.

Não depender de substituir `_` por camelCase sem validar tipos.

## 4.5 Testes de round trip

Para cada entidade:

1. criar objeto de domínio;
2. converter para banco;
3. simular retorno do Supabase;
4. converter para domínio;
5. comparar os campos;
6. serializar;
7. recarregar;
8. confirmar equivalência.

---

# 5. PRIORIDADE P0 — COMPLETAR O MAPPER FINANCEIRO

## 5.1 Campos que precisam ser persistidos e recuperados

Garantir suporte completo a:

```text
source_type
source_id
source_installment_id
contract_id
cost_id
payroll_id
proposal_id
competency_date
version
paid_amount
payment_date
archived_at
cancelled_at
renegotiation_id
```

Atualizar:

* tipos;
* schemas;
* mapeadores;
* repositories;
* serviços;
* formulários;
* filtros;
* relatórios;
* agenda;
* exportações.

## 5.2 Corrigir `paidAmount`

Não usar o valor total do lançamento como valor pago quando `paid_amount` estiver nulo.

A regra correta deve ser:

```text
paid_amount nulo = zero
```

Somente considerar valor integralmente pago quando:

* existir pagamento correspondente;
* status for `paid`;
* valor pago for igual ao total.

## 5.3 Reconciliação

Criar função de reconciliação que compare:

* `financial_entries.paid_amount`;
* soma de `financial_payments`;
* status do lançamento;
* saldo restante.

Detectar e registrar inconsistências.

---

# 6. PRIORIDADE P0 — CORRIGIR RLS DE PERFIL CLIENTE

## 6.1 Problema atual

Políticas permissivas do PostgreSQL são combinadas com OR.

Uma política genérica como:

```text
organization_id = current_organization_id()
```

pode permitir que o perfil cliente leia registros internos da organização, mesmo existindo outra política mais restritiva.

## 6.2 Estratégia obrigatória

As políticas genéricas de colaboradores devem excluir explicitamente o perfil cliente.

Exemplo conceitual:

```sql
organization_id = current_organization_id()
and current_profile_role() <> 'cliente'
```

Clientes devem possuir políticas separadas por entidade.

## 6.3 Regras do cliente

O perfil cliente somente poderá acessar registros:

* vinculados ao próprio `client_id`;
* pertencentes à própria organização;
* marcados como visíveis ao cliente;
* não arquivados;
* não internos;
* não financeiros administrativos.

Aplicar a:

* processos;
* movimentações;
* documentos;
* mensagens;
* eventos;
* propostas;
* cobranças;
* parcelas;
* pagamentos;
* recibos;
* tarefas eventualmente visíveis.

## 6.4 Dados proibidos para cliente

Nunca expor:

* estratégia interna;
* observações administrativas;
* folha;
* despesas;
* custos internos;
* pagamentos de outros clientes;
* movimentações privadas;
* auditoria;
* automações;
* tarefas internas;
* documentos não autorizados.

## 6.5 Testes reais de RLS

Criar no banco:

* Organização A;
* Organização B;
* advogado da A;
* cliente 1 da A;
* cliente 2 da A;
* advogado da B.

Confirmar que:

* cliente 1 não acessa registros do cliente 2;
* cliente 1 não acessa internos da A;
* cliente 1 não acessa a B;
* advogado da A não acessa a B;
* acesso direto por UUID é bloqueado;
* RPCs não contornam essas restrições.

---

# 7. PRIORIDADE P0 — ENDURECER RPCs `SECURITY DEFINER`

## 7.1 Validar todas as referências

Dentro de cada RPC, validar que IDs recebidos pertencem à organização atual.

Validar explicitamente:

* cliente;
* processo;
* responsável;
* funcionário;
* template;
* workflow;
* contrato;
* parcela;
* custa;
* folha;
* proposta;
* reunião;
* tarefa;
* documento;
* evento.

Não confiar na existência do UUID.

## 7.2 Regras obrigatórias

Toda RPC privilegiada deve:

1. exigir sessão autenticada;
2. resolver o perfil atual;
3. resolver a organização atual;
4. validar função e permissão;
5. validar referências;
6. executar transação;
7. registrar auditoria;
8. retornar resposta tipada;
9. não retornar detalhes internos de erro.

## 7.3 Segurança SQL

Todas as funções `SECURITY DEFINER` devem possuir:

```sql
SET search_path = public, pg_temp
```

ou um `search_path` ainda mais restrito, conforme necessário.

Usar nomes de tabela qualificados:

```sql
public.clients
public.processes
```

Revogar execução de:

```text
public
anon
```

Conceder somente aos perfis necessários.

## 7.4 Concorrência

Aplicar:

* `SELECT ... FOR UPDATE`;
* chave de idempotência;
* índice único;
* controle por versão;

nas operações de:

* conversão;
* baixa;
* geração de parcelas;
* aplicação de workflow;
* mudança de fase;
* cancelamento;
* renegociação.

---

# 8. WORKFLOW — COMPLETAR A IMPLEMENTAÇÃO

## 8.1 Autorização de etapas

A conclusão de uma etapa deve validar:

* responsável;
* revisor;
* perfil autorizado;
* organização;
* status atual;
* dependências;
* checklist;
* bloqueios;
* documentos;
* aprovação.

## 8.2 Etapas paralelas

Implementar suporte real a etapas:

* sequenciais;
* paralelas;
* condicionais.

Adicionar campos equivalentes a:

```text
execution_group
condition_type
condition_payload
required_approver_role
required_document_type
```

## 8.3 Máquina de estados

Centralizar as transições permitidas:

```text
pending
available
in_progress
blocked
waiting_review
completed
skipped
cancelled
failed
```

Não permitir alteração arbitrária de status pelo frontend.

## 8.4 SLA

Completar:

* início;
* prazo;
* pausa;
* retomada;
* vencimento;
* justificativa;
* escalonamento;
* alerta;
* histórico.

## 8.5 Consistência demo versus produção

O modo demo e o Supabase devem executar as mesmas regras de negócio.

Evitar possuir uma regra local mais completa que a RPC real.

---

# 9. PROCESSOS — CORREÇÕES PENDENTES

## 9.1 Workflow inicial

A criação do processo em produção deve ter o mesmo comportamento do modo local.

Quando configurado, a RPC deve:

* criar processo;
* criar movimentação inicial;
* iniciar workflow;
* criar tarefas;
* registrar auditoria;

dentro da mesma transação.

## 9.2 Mudança de fase

Validar:

* tarefas obrigatórias;
* checklist;
* documentos;
* prazos;
* audiências;
* aprovação;
* workflow atual;
* bloqueios.

Recalcular progresso pela execução real, não por incremento fixo.

## 9.3 Encerramento

Antes de encerrar, validar:

* tarefas abertas;
* prazos pendentes;
* audiências futuras;
* cobranças;
* documentos;
* workflow;
* movimentações não tratadas;
* pagamentos;
* propostas.

Encerramento excepcional deve exigir:

* perfil autorizado;
* motivo;
* registro de auditoria.

## 9.4 Controle de concorrência

Utilizar a coluna `version` nas edições.

O update deve falhar de forma amigável quando outro usuário tiver alterado o processo.

Exibir:

```text
Este processo foi atualizado por outro usuário. Recarregue os dados antes de salvar novamente.
```

---

# 10. CRM — CORREÇÕES PENDENTES

## 10.1 Consentimento

A conversão deve exigir consentimento quando aplicável.

Não aceitar `consentAccepted` apenas como campo informativo.

## 10.2 Reutilização de cliente

Não reutilizar automaticamente um cliente encontrado por e-mail ou telefone sem confirmação quando houver ambiguidade.

A RPC deve poder receber:

```text
existing_client_id
duplicate_override_reason
```

e validar a escolha.

## 10.3 Follow-up transacional

Criar uma RPC para:

* atualizar próxima ação;
* criar tarefa;
* registrar interação;
* registrar auditoria;

na mesma transação.

## 10.4 Fonte padrão

Garantir apenas uma fonte padrão por organização.

Criar índice parcial equivalente a:

```sql
unique organization_id where is_default = true
```

A alteração da fonte padrão deve ser transacional.

## 10.5 Lead perdido

Exigir no banco:

* motivo;
* observação;
* usuário;
* data;
* valor perdido;
* concorrente, quando aplicável.

Não depender somente da interface.

---

# 11. FINANCEIRO — CORREÇÕES PRIORITÁRIAS

## 11.1 Máquina de estados centralizada

Padronizar:

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

Não armazenar status em português.

A tradução deve existir apenas na interface.

## 11.2 Regras de vencimento

Somente converter para `overdue` registros:

* pendentes;
* parcialmente pagos;
* vencidos;
* não cancelados;
* não renegociados;
* não arquivados;
* com saldo positivo.

Nunca transformar em atrasado:

* cancelado;
* pago;
* renegociado;
* estornado;
* arquivado;
* baixado como perda.

## 11.3 Recibos concorrentes

Não gerar número com:

```text
count(*) + 1
```

Criar sequência ou tabela de numeração por organização com lock transacional.

Garantir número único mesmo com duas baixas simultâneas.

## 11.4 Cancelamento e estorno

Implementar:

* cancelamento de pagamento;
* estorno;
* reembolso;
* reversão de recibo;
* motivo;
* autorização;
* auditoria;
* recálculo de saldo.

Não apagar pagamento.

## 11.5 Renegociação

Criar fluxo real para:

1. selecionar parcelas;
2. registrar acordo;
3. marcar parcelas antigas como renegociadas;
4. criar novas parcelas;
5. preservar histórico;
6. recalcular saldos;
7. atualizar agenda.

## 11.6 Relatórios e KPIs

Separar:

* previsto;
* realizado;
* recebido;
* pago;
* a receber;
* a pagar;
* vencido;
* cancelado;
* renegociado;
* caixa;
* competência.

Todos os cálculos devem respeitar:

* período;
* organização;
* status;
* cliente;
* processo;
* centro de custo.

Excluir cancelados e arquivados dos totais operacionais.

## 11.7 DRE e fluxo de caixa

Implementar separação real:

* DRE por competência;
* fluxo de caixa por pagamento.

Não considerar lançamento futuro como caixa realizado.

## 11.8 Testes de concorrência

Testar:

* duas baixas simultâneas;
* dois recibos;
* duas ativações do contrato;
* dois usuários editando o mesmo lançamento;
* retry da mesma requisição;
* webhook repetido.

---

# 12. AGENDA — CORREÇÕES PENDENTES

## 12.1 Timezone por organização

Adicionar configuração de timezone em `organizations`.

Não fixar `America/Fortaleza` no código como regra universal.

Armazenar em UTC e exibir no timezone configurado.

## 12.2 Duração

Permitir duração configurável.

Não assumir duração fixa para toda reunião.

## 12.3 Conflitos

Todas as criações e edições devem passar pela mesma validação de conflito:

* reunião;
* audiência;
* evento manual;
* tarefa com horário;
* evento do Google.

## 12.4 Recorrência real

Implementar:

* diária;
* semanal;
* mensal;
* anual;
* dias específicos;
* fim por data;
* fim por quantidade.

Permitir editar:

* esta ocorrência;
* esta e as próximas;
* toda a série.

## 12.5 Google Calendar

Registrar:

```text
external_event_id
sync_status
last_sync_at
sync_error
external_updated_at
```

Tratar:

* conflito;
* evento removido externamente;
* alteração simultânea;
* repetição de webhook;
* erro temporário.

---

# 13. PAGINAÇÃO SERVER-SIDE REAL

## 13.1 Problema atual

O sistema pagina internamente para carregar até milhares de registros, mas depois filtra no navegador.

Isso não é paginação real orientada pela interface.

## 13.2 Implementação

Criar repositories ou hooks que recebam:

```text
page
pageSize
search
filters
sort
dateFrom
dateTo
status
responsibleId
clientId
processId
```

Executar no banco:

* `range`;
* ordenação;
* filtros;
* contagem exata ou estimada;
* busca indexada.

## 13.3 Módulos prioritários

Aplicar primeiro a:

* CRM;
* processos;
* tarefas;
* financeiro;
* agenda;
* documentos;
* auditoria.

## 13.4 Interface

Exibir:

* total;
* página;
* tamanho;
* filtros ativos;
* loading;
* erro;
* vazio;
* botão de tentar novamente.

Não carregar 20 mil registros para exibir 20.

---

# 14. TESTES REAIS COM SUPABASE

## 14.1 Substituir testes superficiais

Os testes estruturais podem continuar existindo, mas não podem ser chamados de integração real quando apenas leem arquivos.

Criar scripts separados:

```text
test:contracts
test:integration
test:rls
test:migrations
test:concurrency
```

## 14.2 Banco de teste

Utilizar:

* Supabase CLI local; ou
* projeto de homologação isolado.

Os testes devem:

1. subir banco;
2. aplicar migrations;
3. criar usuários;
4. criar organizações;
5. executar RPCs;
6. validar RLS;
7. limpar o ambiente.

## 14.3 Testes de migrations

Executar:

### Cenário A

Banco limpo, todas as migrations em ordem.

### Cenário B

Banco na v4.8, depois atualizar até v5.2.

### Cenário C

Banco na v5.0, depois atualizar.

### Cenário D

Banco na v5.1 com dados existentes.

### Cenário E

Banco com registros antigos de `process_movements`.

## 14.4 Testes de reload

Para todas as entidades novas:

1. criar pela interface ou RPC;
2. recarregar do Supabase;
3. mapear;
4. comparar;
5. confirmar vínculos.

## 14.5 Testes de concorrência

Simular chamadas simultâneas para:

* conversão de lead;
* aplicação de workflow;
* baixa;
* recibo;
* ativação de contrato;
* mudança de fase.

---

# 15. TESTES E2E MOBILE

Executar em:

```text
320 × 700
360 × 800
390 × 844
414 × 896
768 × 1024
1440 × 960
```

Os testes não devem apenas abrir páginas.

Devem:

* preencher formulários;
* abrir selects;
* usar datas;
* salvar;
* recarregar;
* confirmar persistência;
* testar erro;
* testar loading;
* testar teclado virtual quando possível;
* validar que nenhum botão ficou inacessível;
* validar ausência de overflow.

Fluxos obrigatórios:

1. criar lead;
2. fazer follow-up;
3. converter;
4. abrir processo;
5. iniciar workflow;
6. concluir etapa;
7. mudar fase;
8. criar contrato;
9. registrar pagamento;
10. gerar recibo;
11. criar reunião;
12. editar reunião;
13. abrir agenda;
14. recarregar;
15. confirmar dados.

---

# 16. ACESSIBILIDADE E UX

Corrigir:

* foco em modais;
* navegação por teclado;
* labels;
* mensagens de erro;
* contraste;
* áreas de toque;
* botões apenas com ícones;
* `aria-label`;
* leitura por screen reader;
* fechamento acidental de formulários.

Formulários longos devem preservar rascunho local quando houver perda de conexão ou fechamento não intencional.

---

# 17. OBSERVABILIDADE

Implementar logs estruturados para:

* falha de RPC;
* falha de webhook;
* conflito de versão;
* inconsistência financeira;
* falha de sincronização;
* migration;
* erro de mapeamento;
* acesso negado.

Nunca registrar:

* token;
* segredo;
* senha;
* CPF completo;
* documento completo;
* dados bancários;
* corpo integral de arquivos.

Criar IDs de correlação para operações críticas.

---

# 18. CI/CD

Atualizar o GitHub Actions para executar:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run test:contracts
npm run test:migrations
npm run test:integration
npm run test:rls
npm run build
npm audit
```

Os testes E2E completos podem utilizar job separado com Playwright.

O pipeline deve falhar quando:

* migration não aplicar;
* RLS permitir acesso indevido;
* mapeador perder campos;
* RPC aceitar ID de outra organização;
* TypeScript falhar;
* build falhar;
* teste falhar;
* segredo for encontrado;
* service role aparecer no frontend.

---

# 19. MIGRATIONS RECOMENDADAS

Criar migrations como:

```text
v52_process_movements_compatibility.sql
v52_entity_mapping_support.sql
v52_financial_mapping_and_reconciliation.sql
v52_client_rls_isolation.sql
v52_security_definer_validation.sql
v52_workflow_permissions_and_sla.sql
v52_process_integrity.sql
v52_crm_integrity.sql
v52_financial_state_machine.sql
v52_scheduling_timezone_and_recurrence.sql
v52_pagination_indexes.sql
```

Todas devem:

* possuir comentários;
* usar nomes qualificados;
* configurar RLS;
* proteger `search_path`;
* possuir rollback documentado;
* preservar dados;
* não realizar drops destrutivos;
* executar na ordem definida.

---

# 20. CRITÉRIOS DE ACEITAÇÃO

## Banco

* Todas as migrations executam em banco limpo e banco atualizado.
* `process_movements` mantém dados antigos.
* Nenhuma coluna esperada fica ausente.
* Não existe `DROP TABLE`.

## Mapeamento

* Todas as entidades v5.1 possuem mapeadores explícitos.
* Dados permanecem após reload.
* Snake_case e camelCase são tratados corretamente.
* Campos financeiros de origem não desaparecem.

## RLS

* Cliente acessa somente os próprios registros.
* Cliente não acessa dados internos.
* Organização A não acessa B.
* Acesso direto por UUID é bloqueado.
* RPC não ignora organização.

## Workflow

* Usuário não autorizado não conclui etapa.
* Dependências são respeitadas.
* SLA é persistido.
* Demo e Supabase possuem o mesmo comportamento.

## Processos

* Criação inicia workflow quando configurado.
* Mudança de fase valida pendências.
* Progresso é recalculado.
* Encerramento é protegido.
* Concorrência é detectada.

## CRM

* Consentimento é validado.
* Cliente duplicado exige decisão adequada.
* Follow-up é transacional.
* Existe apenas uma fonte padrão.
* Perda exige motivo no banco.

## Financeiro

* Nulo em `paid_amount` equivale a zero.
* Pagamentos reconciliam com lançamentos.
* Cancelados não viram atrasados.
* Recibo é único.
* Duas baixas simultâneas não duplicam pagamento.
* DRE e caixa são separados.
* KPIs excluem cancelados.

## Agenda

* Timezone é configurável.
* Eventos manuais também validam conflitos.
* Recorrência funciona.
* Google Calendar possui status de sincronização.
* Eventos não são duplicados.

## Performance

* A interface solicita somente a página necessária.
* Filtros são aplicados no banco.
* Nenhum módulo carrega 20 mil registros por padrão.

## Testes

* Integração executa PostgreSQL real.
* Migrations são aplicadas nos testes.
* RLS é testada com usuários reais de teste.
* Concorrência é simulada.
* Mobile salva e recarrega dados.

---

# 21. ENTREGÁVEIS

Entregar:

1. Projeto completo v5.2.
2. ZIP limpo.
3. Migrations corretivas.
4. Mapeadores explícitos.
5. Testes unitários.
6. Testes de contrato.
7. Testes de migrations.
8. Testes de integração reais.
9. Testes de RLS.
10. Testes de concorrência.
11. Testes E2E.
12. Workflow do GitHub Actions.
13. Guia de instalação.
14. Guia de homologação Supabase.
15. Guia de migrations.
16. Guia de rollback.
17. Guia de deploy.
18. Relatório de arquivos alterados.
19. Relatório de riscos corrigidos.
20. Resultado de todos os comandos.
21. Capturas desktop e mobile.
22. Checksum SHA-256.

Não incluir:

* `.env.local`;
* tokens;
* credenciais;
* chaves;
* dados pessoais;
* `node_modules`;
* `dist`;
* caches;
* arquivos temporários.

---

# 22. RELATÓRIO FINAL OBRIGATÓRIO

Classificar cada requisito como:

* implementado e validado em Supabase real/local;
* implementado e validado somente localmente;
* implementado parcialmente;
* dependente de serviço externo;
* não implementado;
* não aplicável.

Não afirmar que RLS está segura sem executar testes reais.

Não afirmar que migrations estão corretas sem aplicá-las.

Não afirmar que uma operação é transacional sem simular falha intermediária.

Não afirmar que o mobile está correto somente por não possuir overflow.

---

# RESULTADO FINAL ESPERADO

A v5.2 deve eliminar os principais riscos da v5.1 e possuir:

* migrations compatíveis;
* dados antigos preservados;
* mapeadores corretos;
* igualdade entre demo e Supabase;
* RLS segura;
* RPCs que validam referências;
* financeiro reconciliado;
* workflow autorizado;
* processos protegidos;
* CRM transacional;
* agenda com timezone;
* paginação real;
* testes executando PostgreSQL;
* homologação mobile funcional.

A implementação só poderá ser considerada concluída quando o sistema passar por homologação real em banco Supabase de teste, com duas organizações, múltiplos usuários, perfil cliente, reload, concorrência e migrations incrementais.
