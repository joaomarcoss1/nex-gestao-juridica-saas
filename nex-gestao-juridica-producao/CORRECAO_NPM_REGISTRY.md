# Correção npm registry

Este pacote remove o package-lock gerado no ambiente interno e inclui `.npmrc` apontando para o registry público do npm.

Comandos:

```powershell
npm cache clean --force
npm install --registry=https://registry.npmjs.org/ --legacy-peer-deps
npm run dev
```
