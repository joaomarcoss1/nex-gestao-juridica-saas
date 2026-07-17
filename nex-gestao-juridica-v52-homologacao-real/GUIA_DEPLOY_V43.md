# Guia de deploy — Nex Gestão Jurídica v4.3

## GitHub

Se o repositório já existe, copie ou extraia o conteúdo do projeto e rode:

```bash
git status
git add .
git commit -m "Atualiza Nex Gestão Jurídica v4.3 login design mobile"
git push origin main
```

Se o histórico remoto estiver diferente e a intenção for substituir o conteúdo pelo pacote atual:

```bash
git push origin main --force-with-lease
```

## Vercel

### Se o repositório tiver a pasta do projeto na raiz
Use as configurações do `vercel.json`:

- Framework: Vite
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

### Se o repositório tiver uma pasta externa e o projeto dentro de `nex-gestao-juridica-producao`
Na Vercel, configure:

- Root Directory: `nex-gestao-juridica-producao`
- Framework: Vite
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

## Variáveis de ambiente

Configure na Vercel:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

## Supabase

A v4.3 não exige nova migration obrigatória para o redesign visual. Continue usando as migrations v4.2 para multiempresa, matrícula e RLS.

Migration principal:

```text
supabase/migrations/20260704_v42_redesign_multiempresa_matricula.sql
```
