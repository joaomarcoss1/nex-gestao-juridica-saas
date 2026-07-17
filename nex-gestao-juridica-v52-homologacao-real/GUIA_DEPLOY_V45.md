# Guia de Deploy v4.5 — GitHub + Vercel

## Atualizar Git

Use sempre o repositório já conectado ao GitHub. Copie a pasta `nex-gestao-juridica-producao` desta versão para dentro do repositório existente e rode:

```powershell
git status
git add -A
git commit -m "Atualiza Nex Gestão Jurídica v4.5 estabilização comercial"
git push origin main
```

Se o push for rejeitado por histórico remoto:

```powershell
git push origin main --force-with-lease
```

## Vercel

Configurações recomendadas:

```text
Root Directory: nex-gestao-juridica-producao
Framework: Vite
Install Command: npm install --legacy-peer-deps
Build Command: npm run build
Output Directory: dist/public
```

Variáveis obrigatórias:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Após alterar variáveis ou migrations, faça **Redeploy without cache**.
