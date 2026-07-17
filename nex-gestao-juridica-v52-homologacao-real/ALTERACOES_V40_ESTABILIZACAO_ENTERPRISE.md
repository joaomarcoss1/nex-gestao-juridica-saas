# Nex Gestão Jurídica v4.0 — Estabilização Enterprise

Esta versão aplica o prompt de estabilização enterprise: Supabase como fonte única da verdade, autenticação real, portal por nome completo, UX mobile em formato de app, auditoria e RPCs de operação segura.

## Corrigido estruturalmente
- O app não entra em demo na Vercel/produção. Demo só funciona localmente com `VITE_ENABLE_DEMO=true`.
- `supabase.ts` agora expõe `isProductionSupabaseEnabled()` e valida URL/chave pública.
- `authContext` não retorna mais perfil demo como fallback em produção.
- `Criar primeiro acesso` cria o usuário no Supabase Auth e chama `ensure_current_user_profile` para vincular/criar `users_profiles`.
- `Equipe` ganhou botão explícito **Novo funcionário**. Ao salvar colaborador com e-mail, o app chama `upsert_staff_profile_from_employee`, preparando o perfil real em `users_profiles`.
- Em produção, falha de persistência desfaz a alteração na tela e mostra erro. Não há mensagem de “salvo localmente” em produção.
- O portal do cliente usa nome completo e carrega payload filtrado por RPC, sem expor painel interno.
- Mensagens e documentos enviados pelo portal usam RPCs no Supabase e geram tarefas/auditoria.
- Mobile recebeu camada app-like: navegação inferior, cards, botões/inputs grandes, header compacto e layout sem tabelas espremidas.

## Migration v4.0
Execute depois das migrations anteriores:

`supabase/migrations/20260704_v40_estabilizacao_enterprise.sql`

Inclui/atualiza:
- `ensure_current_user_profile`
- `upsert_staff_profile_from_employee`
- `client_portal_by_full_name`
- `portal_send_message`
- `portal_upload_document`
- aliases de compatibilidade do portal v39
- `convert_lead_to_client_case`
- `move_process_workflow_stage`
- `create_task_with_audit`
- `create_financial_entry_with_audit`
- `approve_point_adjustment`
- índices e colunas para client_name, client_visible, access_level, profile_id e auditoria.

## Ordem recomendada no Supabase
1. `supabase/schema.sql`
2. migrations v36/v37/v38/v39, se ainda não aplicadas
3. `supabase/migrations/20260704_v40_estabilizacao_enterprise.sql`
4. `supabase/rls.sql`, se estiver usando o arquivo consolidado

## Vercel
Variáveis obrigatórias:
- `VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co`
- `VITE_SUPABASE_ANON_KEY=anon public legacy ou sb_publishable`

Depois faça **Redeploy sem cache**.

## Como criar Admin Master
1. Crie o usuário no login em “Criar primeiro acesso”.
2. Se for o primeiro perfil, a RPC cria `admin_master` automaticamente.
3. Se já existir perfil com o mesmo e-mail em `users_profiles`, ele será vinculado ao `auth.users`.

## Como criar funcionário
1. Entre como Admin Master.
2. Vá em **Equipe > Novo funcionário**.
3. Preencha nome e e-mail.
4. Salve. O Supabase cria/atualiza `employees` e prepara `users_profiles`.
5. O funcionário usa “Criar primeiro acesso” com o mesmo e-mail.

## Portal por nome completo
1. Selecione “Cliente”.
2. Informe o nome completo cadastrado em `clients.name`.
3. O portal carrega somente processos, documentos visíveis, mensagens, propostas e financeiro daquele cliente.

## Validação
- `npm run check`
- `npm run build`
- `npm run audit`

## Limitações restantes
- Envio de convite por e-mail depende de backend/transacional configurado.
- Upload de arquivo binário do portal registra metadados via RPC; Storage pode exigir bucket/policy `documentos`.
- Integrações externas, assinatura eletrônica, tribunais e pagamentos ainda precisam credenciais/backends próprios.
