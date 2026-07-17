-- Nex Gestão Jurídica v4.5 — Dados de demonstração seguros
-- Opcional. Execute apenas em ambiente de testes/demonstração.

insert into public.organizations (id, registration_code, name, trade_name, document, email, phone, responsible_name, responsible_email, city, state, plan, status)
values
  ('00000000-0000-4000-8000-000000000101', '3272026', 'Almeida Advocacia Demo', 'Almeida Advocacia', '00.000.000/0001-01', 'contato@almeidademo.com.br', '(99) 99999-0001', 'Fernando Almeida', 'admin@almeidademo.com.br', 'Codó', 'MA', 'Profissional', 'Ativa'),
  ('00000000-0000-4000-8000-000000000102', '3282026', 'Costa & Lima Jurídico Demo', 'Costa & Lima', '00.000.000/0001-02', 'contato@costalima.demo', '(99) 99999-0002', 'Mariana Costa', 'admin@costalima.demo', 'São Luís', 'MA', 'Enterprise', 'Ativa')
on conflict (id) do update set name = excluded.name, trade_name = excluded.trade_name, registration_code = excluded.registration_code;

insert into public.users_profiles (id, organization_id, name, email, role, active, permissions)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Admin Almeida Demo', 'admin@almeidademo.com.br', 'admin_empresa', true, '{"dashboard.view":true,"clients.view":true,"clients.create":true,"processes.view":true,"processes.create":true,"tasks.view":true,"reports.view":true,"users.view":true}'::jsonb),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Dra. Larissa Demo', 'larissa@almeidademo.com.br', 'advogado', true, '{"dashboard.view":true,"clients.view":true,"processes.view":true,"tasks.view":true,"documents.view":true,"reports.view":true}'::jsonb),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'Admin Costa Demo', 'admin@costalima.demo', 'admin_empresa', true, '{"dashboard.view":true,"clients.view":true,"processes.view":true,"tasks.view":true,"reports.view":true,"users.view":true}'::jsonb)
on conflict (id) do update set name = excluded.name, permissions = excluded.permissions;

-- Insere registros operacionais somente se as tabelas correspondentes existirem.
do $$
begin
  if to_regclass('public.clients') is not null then
    insert into public.clients (id, organization_id, type, name, document, email, phone, origin, status, notes)
    values
      ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'PF', 'Wallace Pereira Demo', '111.111.111-11', 'wallace@demo.com', '(99) 98111-1111', 'Indicação', 'ativo', 'Cliente demo para portal.'),
      ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'PJ', 'Loja Saldão Demo LTDA', '00.000.000/0001-33', 'financeiro@saldão.demo', '(99) 98222-2222', 'Site', 'ativo', 'Cliente PJ demo.'),
      ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000102', 'PF', 'Lorraine Lima Demo', '222.222.222-22', 'lorraine@demo.com', '(99) 98333-3333', 'Instagram', 'ativo', 'Cliente demo da segunda empresa.')
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.processes') is not null then
    insert into public.processes (id, organization_id, client_id, cnj, court, class_processual, area, type, opposite_party, phase, status, risk, success_chance, claim_value, fees_value, progress, notes)
    values
      ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000301', '0000000-00.2026.8.10.0001', 'TJMA', 'Procedimento Comum', 'Cível', 'judicial', 'Banco Exemplo', 'Instrução', 'Ativo', 'Médio', 72, 38000, 8500, 45, 'Processo demo.'),
      ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000303', '0000000-00.2026.8.10.0002', 'TRT16', 'Reclamação Trabalhista', 'Trabalhista', 'judicial', 'Empresa Demo', 'Inicial', 'Ativo', 'Baixo', 64, 22000, 5200, 25, 'Processo demo isolado da segunda empresa.')
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.tasks') is not null then
    insert into public.tasks (id, organization_id, process_id, client_id, title, description, sector, priority, status, due_at, estimated_hours, spent_hours)
    values
      ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', 'Conferir documentos do cliente', 'Validar documentos liberados no portal.', 'Advocacia', 'Alta', 'Pendente', now() + interval '2 days', 2, 0),
      ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000303', 'Preparar audiência inicial', 'Roteiro de perguntas e provas.', 'Advocacia', 'Média', 'Pendente', now() + interval '5 days', 3, 1)
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.financial_entries') is not null then
    insert into public.financial_entries (id, organization_id, client_id, process_id, type, category, amount, due_date, status, method)
    values
      ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', 'receita', 'Honorários contratuais', 3200, current_date, 'pendente', 'PIX'),
      ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000402', 'receita', 'Parcela de contrato', 1800, current_date + 7, 'pendente', 'Boleto')
    on conflict (id) do nothing;
  end if;
end $$;
