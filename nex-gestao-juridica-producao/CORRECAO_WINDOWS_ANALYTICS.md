# Correção Windows + Analytics

Esta versão removeu o script de analytics com placeholders `%VITE_ANALYTICS_ENDPOINT%` e `%VITE_ANALYTICS_WEBSITE_ID%`, que causava erro no Express/Vite no Windows:

`Malformed URI sequence in request URL: /%VITE_ANALYTICS_ENDPOINT%/umami`

Também foi ajustado o script `npm run dev` para iniciar o servidor no Windows sem depender de `NODE_ENV=development` no formato Linux/Mac.

## Como rodar

```bash
npm install --legacy-peer-deps
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Observações

- O aviso de vulnerabilidades do `npm audit` deve ser tratado depois, com cuidado. Não rode `npm audit fix --force` antes de confirmar o funcionamento do app.
- O OAuth está desativado no modo demonstração local. Para produção, configure `NEX_DEMO_MODE=false`, `OAUTH_SERVER_URL`, `JWT_SECRET` e demais variáveis necessárias.
