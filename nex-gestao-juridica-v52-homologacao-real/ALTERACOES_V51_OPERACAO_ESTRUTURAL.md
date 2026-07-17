# Alterações — Nex Gestão Jurídica v5.1

## Integridade e arquitetura

- Criada a camada `atomicOperations.service.ts` para concentrar operações compostas.
- Em modo demo, a operação trabalha sobre uma cópia do estado e só retorna o novo estado quando toda a regra termina; exceções preservam o estado anterior.
- Em produção, as mesmas operações chamam RPCs `nex_v51_*` com validação de organização, perfil e transação PostgreSQL.
- Adicionadas chaves de idempotência e atualização somente das entidades afetadas.
- Carregamento de dados reorganizado por módulo em `moduleData.service.ts`.

## Workflow

- Criadas `workflow_runs` e `workflow_run_steps`.
- Removido o segundo catálogo fixo de workflows da página de tarefas.
- Etapas posteriores ficam pendentes até a conclusão da etapa anterior.
- Checklist e bloqueios impedem conclusão indevida.
- Horas estimadas, trabalhadas e faturáveis foram separadas.
- Reaplicação involuntária do mesmo workflow é bloqueada.

## Processos

- Mapeamento banco/domínio ampliado para os campos completos do formulário.
- Criadas `process_movements` e `process_phase_history`.
- Criação, mudança de fase, encerramento e simulação judicial usam operações estruturais.
- Encerramento valida pendências e exige justificativa.
- A “sincronização judicial” de demonstração passou a ser identificada explicitamente como simulação.

## CRM

- Conversão de lead passou a ser uma operação única.
- Lead convertido registra cliente e processo de destino.
- Repetição da mesma solicitação retorna os registros existentes.
- Detecção de possível cliente existente considera documento, e-mail e telefone.
- Follow-up usa função de dias úteis com feriados e recessos configuráveis.
- Campos de motivo de perda e checklist comercial foram adicionados ao modelo.

## Financeiro

- Criadas `contract_installments` e `financial_payments`.
- Lançamentos registram origem, vínculo e versão.
- Editar contrato, custa ou folha atualiza o lançamento existente.
- Parcelas fecham exatamente o valor total em centavos.
- Vencimentos avançam por mês de calendário.
- Baixa parcial e total valida saldo e impede repetição pela chave idempotente.
- Pagamento e recibo possuem relação explícita.
- Métricas operacionais deixam de somar cancelados e arquivados.

## Agenda

- `finance` e `payment` foram normalizados para `financial_entry`.
- Adicionado índice de unicidade por organização, origem, registro e tipo de evento.
- Despesas internas não são marcadas como visíveis ao cliente.
- Reunião, evento e tarefa de preparação são criados ou atualizados juntos.
- Cancelamento sincroniza evento e tarefa.
- Conflitos por responsável e intervalo são validados.

## Mobile

- Workflow possui lista vertical própria até 640 px.
- Financeiro possui cards móveis próprios, sem tabela comprimida.
- Pagamentos da Agenda possuem cards móveis próprios.
- Navegação e overflow foram testados em 320, 360, 390, 414 e 768 px.
- Capturas E2E aguardam o término real do carregamento do módulo.

## Qualidade

- 27 testes unitários.
- 19 testes de contratos estruturais e segurança.
- 3 testes E2E que percorrem desktop e cinco larguras responsivas.
- Verificação estática ampliada para migrations v5.1.
- GitHub Actions atualizado para a v5.1.
