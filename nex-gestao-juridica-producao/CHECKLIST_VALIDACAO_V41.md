# Checklist de Validação — Nex Gestão Jurídica v4.1

## Supabase e Vercel
- [ ] Variável `VITE_SUPABASE_URL` configurada na Vercel.
- [ ] Variável `VITE_SUPABASE_ANON_KEY` configurada na Vercel.
- [ ] Redeploy sem cache executado.
- [ ] Migration v4.1 executada após v4.0.
- [ ] Bucket `documentos` existe no Storage.

## Admin Master
- [ ] Criar usuário em Supabase Auth ou pelo primeiro acesso.
- [ ] Confirmar perfil em `users_profiles` com `role = admin_master`.
- [ ] Login abre dashboard interno.
- [ ] Admin acessa Equipe, Configurações, Auditoria e Financeiro.

## Funcionário
- [ ] Admin cria funcionário na tela Equipe com e-mail.
- [ ] Conferir se `users_profiles` foi criado/preparado.
- [ ] Funcionário cria primeiro acesso com o mesmo e-mail.
- [ ] Login vincula `auth.users.id` em `users_profiles.auth_user_id`.
- [ ] Funcionário não vê financeiro sensível sem permissão.

## Portal do Cliente por Nome
- [ ] Cliente cadastrado em `clients` acessa digitando nome completo.
- [ ] Cliente presente apenas em `processes.client_name` também acessa.
- [ ] Nome duplicado retorna bloqueio de segurança.
- [ ] Cliente vê somente processos, documentos, mensagens, propostas e cobranças próprios.
- [ ] Cliente não vê notas internas, estratégia, tarefas internas ou financeiro do escritório.

## Mensagens do Portal
- [ ] Cliente seleciona processo.
- [ ] Mensagem salva em `messages`.
- [ ] Tarefa automática criada em `tasks`.
- [ ] Auditoria registrada.

## Documentos do Portal
- [ ] Cliente usa câmera/upload.
- [ ] Arquivo sobe para Storage bucket `documentos`.
- [ ] Metadados salvam em `documents`.
- [ ] Tarefa de conferência é criada.
- [ ] Documento aparece como visível ao cliente.

## Propostas
- [ ] Cliente aceita proposta.
- [ ] Status muda para aceita.
- [ ] Financeiro é gerado em `financial_entries`.
- [ ] Auditoria registrada.
- [ ] Cliente recusa proposta e status muda para recusada.

## Mobile
- [ ] Em tela menor que 860px aparece navegação inferior.
- [ ] Botão Menu abre drawer de módulos.
- [ ] Não há sidebar lateral quebrando layout.
- [ ] Portal, Ponto e Tarefas ficam legíveis no celular.
- [ ] Botões e inputs possuem tamanho adequado para toque.

## Persistência
- [ ] Criar cliente salva no Supabase.
- [ ] Criar processo salva no Supabase.
- [ ] Criar tarefa salva no Supabase.
- [ ] Criar financeiro salva no Supabase.
- [ ] Bater ponto salva no Supabase.
- [ ] Se Supabase falhar, a interface desfaz a alteração e exibe erro.
