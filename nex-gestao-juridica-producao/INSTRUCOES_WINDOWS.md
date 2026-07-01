# Instruções para rodar no Windows

Este projeto foi ajustado para rodar corretamente no Windows, PowerShell e CMD.

## Rodar em modo desenvolvimento

```bash
npm install --legacy-peer-deps
npm run dev
```

Depois acesse o endereço exibido no terminal, geralmente:

```text
http://localhost:3000
```

## Erro corrigido

Antes o script usava:

```bash
NODE_ENV=development tsx watch server/_core/index.ts
```

Esse formato funciona em Linux/Mac, mas não no Windows. Agora o projeto usa scripts Node em `scripts/dev.mjs` e `scripts/start.mjs`, que definem o ambiente de forma compatível com Windows.

## Sobre npm audit

Não rode `npm audit fix --force` antes de testar o sistema, porque isso pode atualizar dependências com breaking changes e quebrar o app. Primeiro rode o sistema; depois, em uma etapa separada, trate as vulnerabilidades com cuidado.
