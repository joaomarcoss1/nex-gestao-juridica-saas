# Checklist de Validação v4.5 — Cliente Real e Primeiras Vendas

## 1. Ambiente

- [ ] `npm install --legacy-peer-deps` executado.
- [ ] `npm run check` sem erros.
- [ ] `npm run build` concluído.
- [ ] `npm run audit` sem vulnerabilidades altas.
- [ ] Vercel com `Root Directory = nex-gestao-juridica-producao`.
- [ ] Vercel com `Output Directory = dist/public`.
- [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas.

## 2. Supabase

- [ ] Migration `20260705_v45_estabilizacao_comercial_10_10.sql` executada.
- [ ] Helpers `nex_current_org_id()` e `nex_is_global_master()` funcionando.
- [ ] Tabela `organizations` com matrícula única.
- [ ] Tabela `users_profiles` vinculada ao Auth.
- [ ] RLS habilitada.
- [ ] RPC `create_company_with_admin` validada.
- [ ] RPC `client_portal_by_name_cpf` validada.
- [ ] Bucket `documentos` criado como privado.

## 3. Login

- [ ] Admin Master entra sem matrícula.
- [ ] Admin Master não mostra matrícula na topbar.
- [ ] Admin/funcionário entra com matrícula da empresa.
- [ ] Matrícula errada bloqueia acesso.
- [ ] Empresa bloqueada bloqueia acesso.
- [ ] Cliente acessa portal por nome completo e CPF.
- [ ] Erro de login aparece com mensagem amigável.

## 4. Multiempresa/RLS

- [ ] Empresa A não vê clientes da Empresa B.
- [ ] Empresa A não vê processos da Empresa B.
- [ ] Funcionário não acessa aba Empresas.
- [ ] Cliente não acessa painel interno.
- [ ] Admin Master vê painel global.
- [ ] Admin da empresa vê apenas sua organization.

## 5. CRUD essencial

- [ ] Criar empresa.
- [ ] Criar admin da empresa.
- [ ] Criar funcionário.
- [ ] Criar cliente.
- [ ] Criar processo.
- [ ] Criar tarefa.
- [ ] Criar lançamento financeiro.
- [ ] Arquivar/restaurar registro.
- [ ] Auditoria registra ações críticas.

## 6. Relatórios

- [ ] Relatório de clientes filtra corretamente.
- [ ] Relatório financeiro mostra valores em BRL.
- [ ] Exportação PDF funciona.
- [ ] Exportação Excel/CSV funciona.
- [ ] Relatório global de empresas visível só ao Admin Master.

## 7. Mobile/PWA

- [ ] Login em celular real.
- [ ] Dashboard em uma coluna.
- [ ] Navegação inferior funcionando.
- [ ] Menu completo no drawer.
- [ ] Formulários com campos grandes.
- [ ] Modais utilizáveis.
- [ ] Sem scroll horizontal.
- [ ] PWA instala no celular.

## 8. Pronto para piloto pago

- [ ] Termos de uso e privacidade publicados.
- [ ] Backup do Supabase ativo.
- [ ] Cliente piloto informado que é implantação assistida.
- [ ] Canal de suporte definido.
- [ ] Checklist de onboarding concluído.
