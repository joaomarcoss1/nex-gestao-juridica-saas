# Nex Gestão Jurídica v3.4 — Usabilidade Operacional e Mobile

Correções aplicadas nesta versão:

- O sistema não entra mais automaticamente na conta demo quando o Supabase não está configurado.
- O modo demonstração agora exige clique explícito em “Entrar em demonstração para testar”.
- O botão **Sair** agora funciona também no modo demo e retorna para a tela de login.
- Correção do fluxo de commit/edição: o estado é calculado de forma síncrona antes da persistência, reduzindo falhas em botões de criar/editar/excluir.
- Erros de permissão agora aparecem como toast, em vez de parecer que o botão “não fez nada”.
- Correção de navegação interna para compatibilidade mobile usando `Event("popstate")`.
- Mobile refeito com navegação inferior horizontal, tela sem compressão lateral e modais em tela cheia.
- Botões e ações agora quebram linha corretamente em telas pequenas.
- Tabelas ficam roláveis horizontalmente no mobile.
- Modais de edição ficaram mais usáveis no celular, com campos maiores e footer fixo.
- Adicionado alerta claro quando o app está sem Supabase real.

Ainda é obrigatório configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel para sair do modo demonstração e usar autenticação real.
