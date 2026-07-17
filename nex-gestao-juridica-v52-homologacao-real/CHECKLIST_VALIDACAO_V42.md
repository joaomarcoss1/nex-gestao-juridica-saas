# Checklist de Validação v4.2

## Login

- [ ] Admin Master Global entra com e-mail e senha, sem matrícula.
- [ ] Admin/funcionário de empresa só entra com e-mail, senha e matrícula correta.
- [ ] Matrícula incorreta bloqueia login com mensagem clara.
- [ ] Empresa bloqueada impede acesso dos usuários internos.
- [ ] Cliente acessa o portal com nome completo e CPF.
- [ ] Cliente não visualiza financeiro interno, equipe, auditoria ou configurações.

## Empresas

- [ ] Aba Empresas aparece apenas para Admin Master Global.
- [ ] Nova empresa gera matrícula base automaticamente.
- [ ] A matrícula pode ser copiada.
- [ ] Empresa pode ser editada.
- [ ] Empresa pode ser bloqueada e reativada.
- [ ] Admin de empresa pode ser criado e fica vinculado ao `organizationId` correto.
- [ ] Cards globais mostram empresas ativas, bloqueadas, usuários, clientes, processos e receita.

## Isolamento multiempresa

- [ ] Usuário comum não vê aba Empresas.
- [ ] Admin de empresa visualiza apenas dados da própria empresa.
- [ ] Funcionário visualiza apenas módulos permitidos.
- [ ] RLS no Supabase impede consulta de dados de outra empresa.
- [ ] `organization_id` está presente nas tabelas operacionais existentes.

## Relatórios e auditoria

- [ ] Relatórios exportam PDF/impressão, CSV e Excel.
- [ ] Exportações registram `report_exports`.
- [ ] Ações críticas registram auditoria.
- [ ] Admin Master consegue abrir visão global no Dashboard.

## UI/UX

- [ ] Sidebar alinhada e sem botões tortos.
- [ ] Topbar mostra perfil e matrícula quando aplicável.
- [ ] Cards responsivos em desktop e mobile.
- [ ] Modais não cortam conteúdo.
- [ ] Botões executam ação real, ficam desabilitados quando aplicável ou mostram retorno por toast.

## Build técnico

- [x] `npm install` executado — concluído com 0 vulnerabilidades.
- [x] `npm run check` sem erros TypeScript.
- [x] `npm run build` concluído com sucesso.
- [x] `npm run audit` sem vulnerabilidades altas — 0 vulnerabilidades.
