# Deploy — Nex Gestão Jurídica v5.2

## VS Code

```bash
npm ci
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, copie manualmente `.env.example` para `.env.local`.

## GitHub

```bash
git init
git add .
git commit -m "Nex Gestão Jurídica v5.2"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## Vercel

- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist/public`.
- Configure apenas chaves públicas com prefixo `VITE_`.
- Chaves privadas devem existir somente nas variáveis server-side da Vercel.
- Defina `VITE_ENABLE_DEMO=false` em produção.

## Supabase

Siga `GUIA_HOMOLOGACAO_SUPABASE_V52.md` e `supabase/MIGRATION_ORDER_V52.md` antes de apontar o frontend de produção para a base atualizada.
