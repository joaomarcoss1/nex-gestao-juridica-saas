-- Nex Gestão Jurídica — seed inicial de demonstração
insert into organizations (id, name, trade_name, city, state)
values ('00000000-0000-0000-0000-000000000001', 'NexLabs Demo', 'Nex Gestão Jurídica', 'Codó', 'MA')
on conflict (id) do nothing;

insert into users_profiles (id, organization_id, name, email, role, sector, active)
values
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'João Marcos Gomes Pereira', 'joaomarcosgpp@hotmail.com', 'admin', 'Sócios', true),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Dra. Larissa Almeida', 'larissa@nexlabs.com.br', 'advogado', 'Advocacia', true)
on conflict (id) do nothing;

insert into automation_rules (organization_id, name, module, trigger_event, actions, status, executions, success_rate)
values
('00000000-0000-0000-0000-000000000001', 'Novo processo gera operação inicial', 'Processos', 'process.created', '["Criar checklist documental","Gerar tarefa para advogado","Criar cobrança de entrada"]', 'ativa', 28, 98),
('00000000-0000-0000-0000-000000000001', 'Cobrança automática de honorários', 'Financeiro', 'financial_entry.due_soon', '["Notificar financeiro","Criar mensagem ao cliente","Registrar log"]', 'ativa', 41, 94),
('00000000-0000-0000-0000-000000000001', 'Ponto com atraso abre justificativa', 'Ponto', 'time_record.delay_30min', '["Solicitar justificativa","Notificar RH","Criar pendência de aprovação"]', 'ativa', 9, 100);

insert into app_state_snapshots (id, company_id, state)
values ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000001', '{}')
on conflict (id) do nothing;
