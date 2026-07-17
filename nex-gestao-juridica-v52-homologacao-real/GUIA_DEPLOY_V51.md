# Guia de instalação e deploy — v5.1

## 1. Instalação local

```bash
npm ci
```

Copie `.env.example` para `.env.local` e configure as variáveis. Para demonstração local:

```env
VITE_ENABLE_DEMO="true"
```

```bash
npm run dev
```

## 2. Validação

```bash
npm run validate
npx playwright install chromium
npm run test:e2e
```

## 3. Banco de homologação

1. Faça backup da base atual.
2. Duplique o projeto ou use um projeto Supabase exclusivo de homologação.
3. Confirme que a base está atualizada até a v5.0.
4. Aplique os arquivos de `supabase/MIGRATION_ORDER_V51.md` na ordem.
5. Teste usuários de duas organizações distintas.
6. Teste conversão de lead, workflow, processo, contrato, pagamento e reunião.
7. Confira logs e somente depois programe a produção.

Não edite migrations antigas já aplicadas.

## 4. Vercel

- Root Directory: raiz do projeto
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Framework: Vite

Cadastre todas as variáveis necessárias no painel. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` e segredos de webhook são exclusivos do backend e nunca podem usar prefixo `VITE_`.

## 5. GitHub

```bash
git init
git add .
git commit -m "Nex Gestão Jurídica v5.1"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## 6. Rollback

Siga `supabase/ROLLBACK_V51.md`. O rollback recomendado é funcional: republicar o frontend anterior e revogar as RPCs v5.1, preservando tabelas e dados para investigação. Não remova dados estruturais sem backup e janela de manutenção.
