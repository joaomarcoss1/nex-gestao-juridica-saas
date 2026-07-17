# Validação Técnica v4.5

Executado no pacote final antes da compactação:

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm run audit
```

Resultado:

```text
TypeScript sem erros
Build Vite concluído com sucesso
0 vulnerabilidades altas
```

Observação: `node_modules` e `dist` não são enviados no ZIP para manter o projeto correto para GitHub/Vercel. A Vercel executará install/build automaticamente.
