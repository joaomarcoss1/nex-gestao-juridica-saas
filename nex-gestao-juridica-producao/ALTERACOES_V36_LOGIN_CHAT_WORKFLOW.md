# Nex Gestão Jurídica v3.6 — Login Premium, Hierarquia, Chat e Workflow Jurídico

Data: 02/07/2026  
Marca: NexLabs  
Status: validado com `npm run check`, `npm run build` e `npm run audit`.

## O que foi implementado

### 1. Tela inicial de login premium NexLabs
- O app agora inicia obrigatoriamente pela tela de login quando não há sessão ativa.
- Layout premium com estética NexLabs e logo em `client/public/nexlabs-logo.jpeg`.
- Seleção clara por perfil:
  - **Admin Master**: acesso total.
  - **Funcionário**: dashboard, processos, ponto e nova ação/tarefa.
  - **Cliente**: portal do cliente, acompanhamento de processo, documentos e chat.
- No modo demo, cada botão abre um perfil realista com permissões diferentes.
- Em produção, a permissão vem da tabela `users_profiles` no Supabase.

### 2. Hierarquia de acesso sólida
- Criado o papel **admin_master**.
- O Admin Master possui acesso total a:
  - financeiro;
  - precificação;
  - relatórios;
  - configurações;
  - auditoria;
  - integrações;
  - gestão de usuários;
  - promoção de outro usuário para Admin Master.
- Admin e sócio continuam com acesso amplo, mas **não podem promover Admin Master**.
- Funcionário tem acesso operacional restrito.
- Cliente fica isolado por `client_id`.

Arquivos principais:
- `client/src/lib/permissions.ts`
- `client/src/services/accessControl.service.ts`
- `client/src/features/auth/pages/InviteUserPage.tsx`
- `client/src/services/users.service.ts`
- `api/users/invite.ts`

### 3. Portal do cliente com chat jurídico
- O cliente acompanha seus processos dentro do portal.
- O cliente envia mensagem diretamente pelo app.
- A mensagem fica vinculada ao processo e ao advogado responsável.
- Ao enviar mensagem, o sistema cria automaticamente uma tarefa de resposta com SLA.
- O cliente só vê seus próprios dados.

Arquivo principal:
- `client/src/features/portal-cliente/pages/PortalClientePage.tsx`

### 4. Novo módulo Chat Jurídico
- Criado o módulo `/chat`.
- Conversas agrupadas por cliente/processo.
- O advogado responsável e o Admin/Admin Master podem ler e responder.
- Mensagens têm direção:
  - `cliente_para_escritorio`
  - `escritorio_para_cliente`
- Mensagens contam com campos de auditoria: remetente, perfil, responsável, leitura e resposta.

Arquivo criado:
- `client/src/features/chat/pages/ChatJuridicoPage.tsx`

### 5. Workflow jurídico de gestão de tarefas
- O módulo de tarefas foi reestruturado como central de produção jurídica.
- Fluxo adaptado para escritório de advocacia:
  1. Pendente
  2. Triagem
  3. Em produção
  4. Revisão
  5. Aguardando cliente
  6. Concluída
  7. Atrasada
- Campos adicionados:
  - delegado por;
  - responsável;
  - revisor;
  - etapa do workflow;
  - SLA em horas;
  - nota de qualidade;
  - bloqueios;
  - descrição operacional.
- O Admin Master acompanha desempenho individual, tarefas em risco e andamento por etapa.
- O advogado pode acompanhar tarefas delegadas a estagiários/auxiliares quando ele for o delegante, revisor, responsável ou advogado do processo.

Arquivo principal:
- `client/src/features/tarefas/pages/TarefasPage.tsx`

### 6. Banco de dados e RLS Supabase
- Atualização do schema para suportar workflow e chat.
- Novas policies para:
  - Admin Master/Admin/Sócio verem tudo da organização;
  - advogado ver apenas mensagens/tarefas sob sua responsabilidade;
  - cliente ver apenas registros do seu `client_id`;
  - financeiro/RH/controladoria manterem escopos próprios.
- Migração criada para banco já existente:
  - `supabase/migrations/20260702_v36_admin_master_chat_workflow.sql`

### 7. Experiência visual e responsiva
- CSS premium adicionado para:
  - login;
  - cards de perfil;
  - chat jurídico;
  - workflow/KPIs;
  - tabela de usuários.

Arquivo principal:
- `client/src/index.css`

## Como rodar no VS Code

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Como validar antes de subir

```bash
npm run check
npm run build
npm run audit
```

Todos foram executados nesta versão com sucesso.

## Como subir na Vercel

- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Install Command: `npm install`

Configure as variáveis se for usar Supabase real:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Observação jurídica/técnica

O sistema foi estruturado para uma operação jurídica mais segura: segregação de perfis, rastreabilidade de tarefas, controle por processo/cliente e comunicação centralizada no processo. Mesmo assim, em produção real é recomendado revisar as policies no Supabase com dados reais do escritório antes de liberar para clientes externos.
