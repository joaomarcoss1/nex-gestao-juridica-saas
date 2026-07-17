# Nex Gestão Jurídica v3.5 — Operação Real, Botões e Mobile

Esta versão corrige pontos práticos identificados após uso no navegador e no celular.

## Correções principais

- Botões agora possuem feedback de processamento (`Processando...`) e evitam múltiplos cliques duplicados.
- Erros de ações assíncronas aparecem como toast global, evitando sensação de botão travado.
- Modais de formulário agora exibem erros retornados pelo `commit`/Supabase dentro do próprio modal.
- Ficha do cliente ganhou ações reais para criar e editar:
  - processo;
  - tarefa;
  - cobrança/financeiro;
  - documento;
  - mensagem;
  - dados cadastrais.
- Detalhe do processo ganhou ações reais para criar e editar:
  - processo;
  - prazo;
  - tarefa;
  - financeiro;
  - documento;
  - encerramento do processo.
- Relações das novas ações usam `clientId` e `processId`, reduzindo dependência de nome do cliente.
- Layout mobile recebeu refinamento adicional:
  - botões em grade no celular;
  - tabs horizontais roláveis;
  - timeline com botões em largura total;
  - tabelas com rolagem horizontal mais consistente;
  - modais em tela cheia no mobile;
  - menu inferior mais compacto.

## Observações de produção

- Sem variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o app continua mostrando modo demonstração somente por escolha manual.
- Para sair definitivamente do modo demo, configure Supabase e Vercel com as variáveis documentadas em `SUPABASE_SETUP.md` e `VERCEL_DEPLOY.md`.
- Integrações externas seguem preparadas, mas exigem credenciais, webhooks e homologação real.

## Validação executada

- `npm run check`: OK
- `npm run build`: OK
- `npm audit --audit-level=high`: 0 vulnerabilidades altas
