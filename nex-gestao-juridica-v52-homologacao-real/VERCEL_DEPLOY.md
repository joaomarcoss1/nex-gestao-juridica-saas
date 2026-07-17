# Deploy Vercel — Nex Gestão Jurídica v3

Configurações:

```text
Framework Preset: Vite
Root Directory: nex-gestao-juridica-producao
Install Command: npm install --legacy-peer-deps
Build Command: npm run build
Output Directory: dist/public
```

Variáveis:

```env
VITE_APP_NAME="Nex Gestão Jurídica"
VITE_COMPANY_NAME="NexLabs"
VITE_APP_MODE="production"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="SUA_ANON_PUBLIC_KEY"
SUPABASE_SERVICE_ROLE_KEY="SOMENTE_BACKEND"
DATABASE_URL="postgresql://postgres:SENHA@db.SEU-PROJETO.supabase.co:5432/postgres"
JWT_SECRET="chave-grande"
CRON_SECRET="chave-grande"
```

O cron `/api/cron/automations` exige `CRON_SECRET` via Bearer token ou query param `?secret=`.
