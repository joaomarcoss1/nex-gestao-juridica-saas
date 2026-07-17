# Nex Gestão Jurídica v3.9 — Supabase real, Portal por Nome e Mobile App

Esta versão corrige problemas operacionais identificados na v3.8 em produção.

## Correções estruturais

- Removido o fallback silencioso para salvamento local em produção.
- Em produção, se o Supabase recusar gravação, a alteração é desfeita e o usuário recebe erro claro.
- O carregamento de dados reais agora usa o Supabase como fonte principal.
- O `localStorage` fica restrito ao modo demo/desenvolvimento.
- Corrigido o contexto de autenticação para não retornar `demoProfile` quando não há perfil real.
- Criada migration `20260704_v39_auth_portal_mobile_supabase.sql` com funções seguras:
  - `ensure_current_user_profile(p_name)`
  - `client_portal_by_full_name(p_full_name)`
  - `client_portal_insert_message(...)`
  - `client_portal_register_document(...)`
  - `client_portal_update_pricing_status(...)`

## Login e usuários

- Admin e funcionários entram por e-mail/senha do Supabase Auth.
- O primeiro usuário real pode ser convertido automaticamente em `admin_master`.
- Usuários posteriores são criados como `funcionario`, podendo ter permissões ajustadas pelo Admin Master.
- O perfil é criado/vinculado automaticamente em `users_profiles` pela função segura do banco.

## Portal do cliente

- O cliente acessa somente com o nome completo cadastrado.
- Se o nome existir em `clients`, o portal carrega processos, documentos, mensagens, financeiro e propostas daquele cliente.
- O cliente não precisa de e-mail, senha ou conta no Supabase Auth.
- Mensagens enviadas pelo cliente são gravadas no banco via RPC e geram tarefa interna para o advogado/responsável.
- Documentos enviados pelo cliente são registrados no banco via RPC e geram tarefa de conferência.
- Aprovação de proposta pelo cliente atualiza o banco e gera lançamento financeiro.

## Mobile

- Criado `client/src/mobile.css`.
- O menu lateral vira navegação inferior estilo aplicativo.
- Cards, formulários, botões, KPIs, painéis e portal foram adaptados para tela pequena.
- Inputs usam tamanho adequado para celular e botões ocupam largura total.
- Melhor experiência de uso como app web/PWA no celular.

## Validação executada

```bash
npm run check
npm run build
npm run audit
```

Resultado: TypeScript sem erros, build Vite concluído e 0 vulnerabilidades altas.

## Observações importantes

Após subir para GitHub/Vercel, rode no Supabase:

```text
supabase/migrations/20260704_v39_auth_portal_mobile_supabase.sql
```

Depois faça Redeploy na Vercel com cache desativado.
