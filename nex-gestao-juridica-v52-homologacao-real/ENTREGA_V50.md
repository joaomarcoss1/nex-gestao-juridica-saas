# Entrega Nex Gestão Jurídica v5.0

Pacote preparado para VS Code, GitHub e Vercel.

## Inicialização

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## Validação

```bash
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run build
npm run audit
```

## Banco

Aplique `supabase/migrations/20260713_v50_producao_segura_mobile.sql` em uma base v4.9 homologada e siga `GUIA_DEPLOY_V50.md`.
