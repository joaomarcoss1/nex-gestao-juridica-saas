# Nex Gestão Jurídica v4.4 — Correção Topbar e Supabase

## Correções aplicadas

### Barra superior
- Corrigido desalinhamento da topbar em telas desktop.
- Impedida quebra dos botões para uma segunda linha.
- Campo de pesquisa agora se adapta ao espaço disponível.
- Nome do usuário e perfil passam a usar reticências quando não couberem.
- Botão "Nova ação" é ocultado em larguras intermediárias para preservar alinhamento.
- Admin Master Global não exibe mais matrícula da empresa no topo quando o perfil é global.

### Supabase
- Adicionada migration `20260705_v44_topbar_supabase_resilience.sql`.
- Criados aliases de funções antigas usadas por policies de versões anteriores:
  - `current_profile_id()`
  - `current_profile_org()`
  - `current_profile_role()`
  - `current_profile_client_id()`
  - `is_admin_master()`
  - `is_admin_or_partner()`
  - `can_access_financial()`
  - `can_access_hr()`
- Corrigida compatibilidade entre roles antigas e novas:
  - `admin_master` → `admin_master_global`
  - `admin` → `admin_empresa`
- Criadas tabelas opcionais/fallback para evitar erro de relation/schema cache quando alguma migration enterprise antiga não foi aplicada integralmente.
- O carregamento do frontend agora não derruba o sistema inteiro quando uma tabela opcional ainda não existe; ele ignora a tabela afetada, mantém o Supabase online e registra aviso no console.

## O que fazer no Supabase

Execute no SQL Editor do Supabase:

```sql
supabase/migrations/20260705_v44_topbar_supabase_resilience.sql
```

Depois faça redeploy na Vercel com cache limpo.

## Validação executada

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm run audit
```

Resultado:

- TypeScript sem erros.
- Build concluído com sucesso.
- 0 vulnerabilidades altas.
