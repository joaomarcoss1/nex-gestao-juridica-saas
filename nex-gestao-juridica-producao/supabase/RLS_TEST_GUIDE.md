# Guia de teste RLS — Nex Gestão Jurídica v3

1. Rode `schema.sql` completo.
2. Rode `rls.sql` completo.
3. Crie usuários no Supabase Auth.
4. Cadastre os usuários em `public.users_profiles` com `auth_user_id` igual ao ID do usuário Auth.
5. Teste perfis: admin, socio, advogado, financeiro, rh, controladoria, funcionario e cliente.
6. Valide que uma organização não enxerga registros de outra.
7. Valide que o cliente não acessa estratégia interna, financeiro interno e documentos de outros clientes.
8. Valide que financeiro acessa `financial_entries`, mas não ponto/folha.
9. Valide que RH acessa ponto/folha, mas não financeiro jurídico.
10. Valide Storage: arquivos devem estar em `documentos/<organization_id>/...`.
