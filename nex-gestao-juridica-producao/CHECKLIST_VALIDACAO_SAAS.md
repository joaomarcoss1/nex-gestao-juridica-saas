# Checklist de Validação SaaS - Nex Gestão Jurídica

## Validação local
- [ ] `npm install --legacy-peer-deps`
- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm audit --audit-level=high`
- [ ] Abrir `http://127.0.0.1:3000`

## Supabase real
- [ ] Criar projeto Supabase
- [ ] Executar `supabase/schema.sql`
- [ ] Executar `supabase/rls.sql`
- [ ] Executar `supabase/seed.sql`
- [ ] Criar bucket privado `documentos`
- [ ] Configurar `VITE_SUPABASE_URL`
- [ ] Configurar `VITE_SUPABASE_ANON_KEY`
- [ ] Testar CRUD por módulo

## Módulos com CRUD
- [ ] Clientes: criar, editar, arquivar, restaurar e excluir
- [ ] Leads: criar, editar, mover funil, converter em cliente
- [ ] Processos: criar, editar, avançar fase, encerrar, arquivar
- [ ] Prazos: criar, calcular, baixar, editar, relatório
- [ ] Tarefas: criar, editar, concluir, reabrir, arquivar
- [ ] Financeiro: criar, editar, baixa parcial, recorrência, exportar
- [ ] Precificação: calcular, salvar, editar, aceitar, gerar cobrança
- [ ] Documentos: digitalizar, gerar PDF, upload Storage, status e versão
- [ ] Ponto: validar PIN/hash, sequência, justificativa, espelho mensal
- [ ] Folha gerencial: gerar cálculo, editar e exportar
- [ ] Automações: simular, executar, cron e logs
- [ ] Relatórios: filtros, CSV, PDF via impressão e auditoria
- [ ] Integrações: configurar status, testar conexão e manter chaves fora do front

## Segurança/RLS
- [ ] Admin vê tudo da empresa
- [ ] Cliente só vê dados próprios
- [ ] Financeiro só vê financeiro
- [ ] RH só vê ponto e folha
- [ ] Usuário de uma empresa não vê outra empresa
- [ ] Documentos salvos em Storage privado
- [ ] Chaves sensíveis nunca usam prefixo `VITE_`

## Vercel
- [ ] Root Directory: `nex-gestao-juridica-producao`
- [ ] Install Command: `npm install --legacy-peer-deps`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist/public`
- [ ] Variáveis públicas configuradas
- [ ] Cron `/api/cron/automations` configurado
