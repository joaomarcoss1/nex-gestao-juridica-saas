# Alterações — Nex Gestão Jurídica v5.2

## Banco e migrations

- Criadas 9 migrations incrementais posteriores à v5.1.
- Compatibilidade de `process_movements` com formatos v4.8/v5.1.
- Backfill não destrutivo de datas, origem e IDs externos.
- Novos campos de workflow, SLA, agenda, sincronização e reconciliação.
- Contador transacional por organização para recibos.
- Nenhuma migration v5.2 usa `DROP TABLE`.

## Mapeamento e persistência

- Mapeadores explícitos para workflow, etapas, movimentações, histórico de fases, parcelas, pagamentos, eventos, fontes de leads e financeiro.
- Compatibilidade entre snake_case do banco e camelCase do domínio.
- Leitura de movimentações legadas sem perder dados.
- Campos de origem financeira preservados após reload.
- `paid_amount` nulo corrigido para zero.

## Segurança

- Policies genéricas da v5.1 substituídas por policies de equipe que excluem `cliente`.
- Policies específicas para movimentações, parcelas e pagamentos do próprio cliente.
- Helpers de autorização e referência multiempresa.
- RPCs privilegiadas exigem sessão, papel permitido e referências da organização atual.
- `SECURITY DEFINER` com `search_path=public,pg_temp`.
- Revogação de execução para `public` e `anon` nas RPCs v5.2.

## Workflow e processos

- Execuções e etapas persistentes continuam sendo a fonte oficial.
- Tarefas agora recebem `workflow_run_step_id` corretamente.
- Suporte estrutural a grupos paralelos, condições, aprovador e documento obrigatório.
- SLA iniciado e vencimento persistido.
- Mudança de fase e encerramento usam versão esperada e validações de pendências.
- Progresso recalculado com base nas etapas concluídas.

## CRM

- Conversão exige consentimento quando configurado.
- Duplicidades exigem decisão explícita.
- Follow-up cria tarefa, atualiza o lead e audita em uma única RPC.
- Apenas uma fonte ativa pode ser padrão por organização.
- Lead perdido exige motivo e observação no banco.

## Financeiro

- Máquina de estados canônica no PostgreSQL.
- Pagamento com lock, idempotência, saldo e contador transacional.
- Cancelamento preserva pagamento e invalida recibo, sem apagar histórico.
- Reconciliação entre soma dos pagamentos e lançamento.
- Cancelados, renegociados, estornados e arquivados não entram nos totais operacionais.

## Agenda

- Timezone configurável por organização.
- Duração configurável de reunião.
- Campos para recorrência e sincronização externa.
- Validação de conflito para responsável.
- Cancelamento sincroniza evento e tarefa vinculada por meio das RPCs existentes.

## Performance e mobile

- Repositório server-side paginado criado para módulos prioritários.
- Carregamento modular legado limitado a 500 registros por entidade, evitando 20 mil por padrão.
- Layouts móveis de Workflow, Financeiro, CRM e Agenda preservados.
- Novo E2E cria lead no mobile e confirma permanência ao navegar entre módulos.
