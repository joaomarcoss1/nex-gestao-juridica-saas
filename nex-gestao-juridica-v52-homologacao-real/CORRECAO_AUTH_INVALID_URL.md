# Correção: TypeError Invalid URL no login local

## Problema
O erro ocorria no arquivo `client/src/const.ts`, porque a função `getLoginUrl()` tentava montar uma URL OAuth mesmo sem as variáveis `VITE_OAUTH_PORTAL_URL` e `VITE_APP_ID` configuradas.

No modo local/VS Code, o sistema deve abrir direto em demonstração, sem depender de OAuth externo.

## Correção aplicada
- `client/src/const.ts` agora valida a URL antes de usar `new URL()`.
- Quando não existir OAuth configurado, o app retorna `/dashboard` e abre em modo demonstração.
- `client/src/_core/hooks/useAuth.ts` não chama mais `getLoginUrl()` automaticamente durante o render inicial.
- O app não quebra mais com `TypeError: Invalid URL`.

## Como rodar
Use uma pasta limpa, extraia o ZIP novo e rode:

```bash
npm install --legacy-peer-deps
npm run dev
```

Abra exatamente o endereço exibido no terminal, por exemplo:

```text
http://localhost:3000/
```

ou:

```text
http://localhost:3001/
```

## Importante
Não rode `npm audit fix --force` neste momento. Esse comando atualiza dependências com mudanças grandes e pode quebrar o projeto.
