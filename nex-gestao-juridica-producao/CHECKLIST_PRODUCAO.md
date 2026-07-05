# Checklist de produção — Nex Gestão Jurídica

## Validação técnica concluída nesta entrega

- [x] Nome do app ajustado para Nex Gestão Jurídica.
- [x] módulo de IA anterior removida do app ativo.
- [x] Módulo Automações Internas criado.
- [x] Dependências antigas e vulneráveis removidas do package ativo.
- [x] `npm run check` validado.
- [x] `npm run build` validado.
- [x] `npm audit --audit-level=high` validado com 0 vulnerabilidades.
- [x] Vercel preparado com `vercel.json`.
- [x] Supabase schema/RLS/seed incluídos.
- [x] Serviços Supabase e auditoria incluídos.
- [x] Estrutura modular `features/` criada.

## Etapas obrigatórias antes da venda com dados reais

- [ ] Criar projeto Supabase definitivo.
- [ ] Executar `supabase/schema.sql`.
- [ ] Executar `supabase/rls.sql`.
- [ ] Executar `supabase/seed.sql`.
- [ ] Criar usuário admin real.
- [ ] Validar RLS com perfil admin, advogado, financeiro, RH, funcionário e cliente.
- [ ] Testar portal do cliente com dados isolados.
- [ ] Testar upload e download de documentos no Storage.
- [ ] Validar assinatura eletrônica com trilha de auditoria.
- [ ] Validar política LGPD, termos de uso e privacidade.
- [ ] Revisar cálculo de prazos processuais com advogado responsável.
- [ ] Testar precificação jurídica com casos reais.
- [ ] Configurar domínio e variáveis na Vercel.
