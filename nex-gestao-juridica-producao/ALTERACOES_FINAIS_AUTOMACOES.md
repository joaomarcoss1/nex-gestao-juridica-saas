# Alterações finais — Nex Gestão Jurídica

## Identidade
- Nome oficial do app ajustado para **Nex Gestão Jurídica**.
- Marca NexLabs mantida na sidebar, rodapé e documentação.
- Paleta dark premium NexLabs preservada.

## Remoção da módulo de IA anterior
- O módulo módulo de IA anterior foi removido do menu principal.
- A área foi substituída por um módulo operacional de automações internas, mais útil para a rotina real do escritório.

## Novo módulo: Automações
- Regras internas configuráveis por módulo: Processos, Financeiro, Ponto, Documentos, CRM e Relatórios.
- Gatilhos operacionais: processo criado, audiência cadastrada, parcela vencendo, atraso de ponto, documento enviado, lead parado.
- Ações automáticas: criar checklist, gerar tarefa, notificar responsável, criar cobrança, registrar log e abrir pendência.
- Painel com automações ativas, execuções, sucesso médio e pendências.
- Execução de teste das regras.
- Ativar/pausar automação.
- Logs de execução e auditoria.
- Exportação CSV.

## Supabase
- `supabase/schema.sql` atualizado com `automation_rules` e `automation_runs`.
- `supabase/rls.sql` criado com políticas base de isolamento por empresa.
- `supabase/seed.sql` criado com dados iniciais de demonstração.

## Validação
- `npm run check` executado com sucesso.
- `npm run build` executado com sucesso.

## Observação
A versão continua funcionando localmente em modo demonstração/localStorage e está preparada para integração real com Supabase em produção.
