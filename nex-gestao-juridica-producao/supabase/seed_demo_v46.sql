-- Nex Gestão Jurídica v4.6 — seed demo opcional para apresentações comerciais.
-- Execute somente em ambiente de demonstração ou banco recém-criado.

insert into public.organizations (id, registration_code, name, trade_name, document, email, phone, responsible_name, responsible_email, city, state, address, plan, status, access_blocked, commercial_readiness_score)
values
('00000000-0000-4000-8000-000000000101','5012026','Almeida & Costa Advocacia','Almeida Costa','11.111.111/0001-11','contato@almeidacosta.demo','(99) 99999-1001','Dra. Marina Almeida','marina@almeidacosta.demo','Codó','MA','Av. Central, 100','Pro','Ativa',false,90),
('00000000-0000-4000-8000-000000000102','5022026','Santos Jurídico Empresarial','Santos Jurídico','22.222.222/0001-22','gestao@santosjuridico.demo','(99) 99999-1002','Dr. Henrique Santos','henrique@santosjuridico.demo','São Luís','MA','Rua Premium, 200','Starter','Ativa',false,70)
on conflict (id) do nothing;

insert into public.billing_subscriptions (organization_id, provider, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
values
('00000000-0000-4000-8000-000000000101','stripe','cus_demo_almeida','sub_demo_almeida','pro','active',now() + interval '30 days'),
('00000000-0000-4000-8000-000000000102','stripe','cus_demo_santos','sub_demo_santos','starter','trialing',now() + interval '14 days')
on conflict do nothing;
