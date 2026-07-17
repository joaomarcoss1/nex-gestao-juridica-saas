-- v5.1 · parcelas, origens financeiras, pagamentos e recibos idempotentes
begin;
alter table if exists public.fee_contracts add column if not exists first_due_date date, add column if not exists due_date_policy text default 'next_business_day', add column if not exists financial_generated_at timestamptz, add column if not exists version integer not null default 0;
alter table if exists public.cost_entries add column if not exists financial_entry_id uuid, add column if not exists version integer not null default 0;
alter table if exists public.payrolls add column if not exists version integer not null default 0;
alter table if exists public.financial_entries add column if not exists source_type text default 'manual', add column if not exists source_id text, add column if not exists source_installment_id uuid,
 add column if not exists contract_id uuid, add column if not exists cost_id uuid, add column if not exists proposal_id uuid, add column if not exists competency_date date,
 add column if not exists version integer not null default 0, add column if not exists updated_at timestamptz default now();
create unique index if not exists financial_entries_source_uidx on public.financial_entries(organization_id,source_type,source_id) where source_id is not null and archived_at is null;

create table if not exists public.contract_installments(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 contract_id uuid not null references public.fee_contracts(id) on delete cascade, installment_number integer not null,
 amount_cents bigint not null check(amount_cents>=0), due_date date not null, status text not null default 'pending', financial_entry_id uuid,
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,contract_id,installment_number)
);
create table if not exists public.financial_payments(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 financial_entry_id uuid not null references public.financial_entries(id), amount_cents bigint not null check(amount_cents>0), payment_date date not null,
 payment_method text not null, reference text, receipt_id uuid, idempotency_key text not null, created_by uuid, cancelled_at timestamptz, cancellation_reason text,
 archived_at timestamptz, created_at timestamptz not null default now(), unique(organization_id,idempotency_key)
);
create unique index if not exists payment_receipts_payment_uidx on public.payment_receipts(organization_id,financial_entry_id,receipt_number);

create or replace function public.nex_v51_save_fee_contract(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_data jsonb:=p_operation->'contract'; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_id uuid:=coalesce((v_data->>'id')::uuid,gen_random_uuid()); v_count int:=greatest(1,coalesce((v_data->>'installments')::int,1)); v_total bigint:=round(coalesce((v_data->>'totalAmount')::numeric,0)*100); v_base bigint; v_rem bigint; v_i int; v_amount bigint; v_due date; v_inst uuid; v_fin uuid; v_client text;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','financeiro']); select * into v_claim from public.nex_v51_claim_idempotency('save_fee_contract',v_key); if v_claim.status='completed' then return v_claim.result; end if;
 insert into public.fee_contracts(id,organization_id,client_id,process_id,title,fee_type,total_amount,entry_amount,installments,success_percent,status,signed_at,first_due_date,due_date_policy,version,updated_at)
 values(v_id,v_org,nullif(v_data->>'clientId','')::uuid,nullif(v_data->>'processId','')::uuid,v_data->>'title',coalesce(v_data->>'feeType','Contratual'),coalesce((v_data->>'totalAmount')::numeric,0),coalesce((v_data->>'entryAmount')::numeric,0),v_count,nullif(v_data->>'successPercent','')::numeric,coalesce(v_data->>'status','Rascunho'),nullif(v_data->>'signedAt','')::date,coalesce(nullif(v_data->>'firstDueDate','')::date,current_date),coalesce(v_data->>'dueDatePolicy','next_business_day'),1,now())
 on conflict(id) do update set title=excluded.title,fee_type=excluded.fee_type,total_amount=excluded.total_amount,entry_amount=excluded.entry_amount,success_percent=excluded.success_percent,status=excluded.status,signed_at=excluded.signed_at,version=public.fee_contracts.version+1,updated_at=now();
 if coalesce(v_data->>'status','') in ('Ativo','Assinado') and not exists(select 1 from public.contract_installments where contract_id=v_id and archived_at is null) then
   v_base:=v_total/v_count; v_rem:=v_total-(v_base*v_count); select name into v_client from public.clients where id=nullif(v_data->>'clientId','')::uuid;
   for v_i in 1..v_count loop v_amount:=v_base+case when v_i>v_count-v_rem then 1 else 0 end; v_due:=(coalesce(nullif(v_data->>'firstDueDate','')::date,current_date)+(make_interval(months=>v_i-1)))::date;
     while extract(isodow from v_due) in (6,7) loop v_due:=v_due+1; end loop;
     insert into public.contract_installments(organization_id,contract_id,installment_number,amount_cents,due_date,status) values(v_org,v_id,v_i,v_amount,v_due,'pending') returning id into v_inst;
     insert into public.financial_entries(organization_id,client_id,process_id,type,category,amount,due_date,status,method,installment,installments,source_type,source_id,source_installment_id,contract_id,paid_amount,version,created_at,updated_at)
     values(v_org,nullif(v_data->>'clientId','')::uuid,nullif(v_data->>'processId','')::uuid,'receita','Parcela de contrato',v_amount/100.0,v_due,'pendente','PIX',v_i,v_count,'contract_installment',v_inst::text,v_inst,v_id,0,1,now(),now()) returning id into v_fin;
     update public.contract_installments set financial_entry_id=v_fin where id=v_inst;
   end loop; update public.fee_contracts set financial_generated_at=now() where id=v_id;
 end if;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_id,jsonb_build_object('id',v_id)); return jsonb_build_object('id',v_id);
end $$;
grant execute on function public.nex_v51_save_fee_contract(jsonb) to authenticated;

create or replace function public.nex_v51_save_cost_entry(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_data jsonb:=p_operation->'cost'; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_id uuid:=coalesce((v_data->>'id')::uuid,gen_random_uuid()); v_fin uuid;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','financeiro']); select * into v_claim from public.nex_v51_claim_idempotency('save_cost_entry',v_key); if v_claim.status='completed' then return v_claim.result; end if;
 insert into public.cost_entries(id,organization_id,client_id,process_id,category,description,amount,due_date,status,responsible_id,version,updated_at) values(v_id,v_org,nullif(v_data->>'clientId','')::uuid,nullif(v_data->>'processId','')::uuid,v_data->>'category',v_data->>'description',coalesce((v_data->>'amount')::numeric,0),nullif(v_data->>'dueDate','')::date,coalesce(v_data->>'status','Pendente'),nullif(v_data->>'responsibleId','')::uuid,1,now()) on conflict(id) do update set category=excluded.category,description=excluded.description,amount=excluded.amount,due_date=excluded.due_date,status=excluded.status,responsible_id=excluded.responsible_id,version=public.cost_entries.version+1,updated_at=now();
 select id into v_fin from public.financial_entries where organization_id=v_org and source_type='cost_entry' and source_id=v_id::text and archived_at is null limit 1;
 if v_fin is null then insert into public.financial_entries(organization_id,client_id,process_id,type,category,amount,due_date,status,method,source_type,source_id,cost_id,paid_amount,version,created_at,updated_at) values(v_org,nullif(v_data->>'clientId','')::uuid,nullif(v_data->>'processId','')::uuid,'despesa',v_data->>'category',coalesce((v_data->>'amount')::numeric,0),nullif(v_data->>'dueDate','')::date,case when v_data->>'status'='Cancelado' then 'cancelado' when v_data->>'status'='Pago' then 'pago' else 'pendente' end,'PIX','cost_entry',v_id::text,v_id,case when v_data->>'status'='Pago' then coalesce((v_data->>'amount')::numeric,0) else 0 end,1,now(),now()) returning id into v_fin; else update public.financial_entries set category=v_data->>'category',amount=coalesce((v_data->>'amount')::numeric,0),due_date=nullif(v_data->>'dueDate','')::date,status=case when v_data->>'status'='Cancelado' then 'cancelado' when v_data->>'status'='Pago' then 'pago' else 'pendente' end,version=version+1,updated_at=now() where id=v_fin; end if;
 update public.cost_entries set financial_entry_id=v_fin where id=v_id; perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_id,jsonb_build_object('id',v_id,'financialEntryId',v_fin)); return jsonb_build_object('id',v_id,'financialEntryId',v_fin);
end $$;
grant execute on function public.nex_v51_save_cost_entry(jsonb) to authenticated;

create or replace function public.nex_v51_save_payroll(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_data jsonb:=p_operation->'payroll'; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_id uuid:=coalesce((v_data->>'id')::uuid,gen_random_uuid()); v_source text; v_fin uuid;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','financeiro','rh']); select * into v_claim from public.nex_v51_claim_idempotency('save_payroll',v_key); if v_claim.status='completed' then return v_claim.result; end if; v_source:=(v_data->>'employeeId')||':'||(v_data->>'year')||'-'||lpad(v_data->>'month',2,'0');
 insert into public.payrolls(id,organization_id,employee_id,employee_name,month,year,base_salary,worked_hours,overtime,absences,delays,benefits,discounts,commissions,gross,net,status,version,updated_at) values(v_id,v_org,(v_data->>'employeeId')::uuid,v_data->>'employeeName',(v_data->>'month')::int,(v_data->>'year')::int,coalesce((v_data->>'baseSalary')::numeric,0),coalesce((v_data->>'workedHours')::numeric,0),coalesce((v_data->>'overtime')::numeric,0),coalesce((v_data->>'absences')::numeric,0),coalesce((v_data->>'delays')::numeric,0),coalesce((v_data->>'benefits')::numeric,0),coalesce((v_data->>'discounts')::numeric,0),coalesce((v_data->>'commissions')::numeric,0),coalesce((v_data->>'gross')::numeric,0),coalesce((v_data->>'net')::numeric,0),coalesce(v_data->>'status','Rascunho'),1,now()) on conflict(id) do update set base_salary=excluded.base_salary,worked_hours=excluded.worked_hours,overtime=excluded.overtime,absences=excluded.absences,delays=excluded.delays,benefits=excluded.benefits,discounts=excluded.discounts,commissions=excluded.commissions,gross=excluded.gross,net=excluded.net,status=excluded.status,version=public.payrolls.version+1,updated_at=now();
 select id into v_fin from public.financial_entries where organization_id=v_org and source_type='payroll' and source_id=v_source and archived_at is null limit 1;
 if v_fin is null then insert into public.financial_entries(organization_id,type,category,amount,due_date,status,method,source_type,source_id,payroll_id,competency_date,paid_amount,version,created_at,updated_at) values(v_org,'despesa','Folha',coalesce((v_data->>'net')::numeric,(v_data->>'gross')::numeric,0),make_date((v_data->>'year')::int,(v_data->>'month')::int,5),case when v_data->>'status'='Paga' then 'pago' else 'pendente' end,'Transferência','payroll',v_source,v_id,make_date((v_data->>'year')::int,(v_data->>'month')::int,1),case when v_data->>'status'='Paga' then coalesce((v_data->>'net')::numeric,0) else 0 end,1,now(),now()) returning id into v_fin; else update public.financial_entries set amount=coalesce((v_data->>'net')::numeric,(v_data->>'gross')::numeric,0),status=case when v_data->>'status'='Paga' then 'pago' else 'pendente' end,version=version+1,updated_at=now() where id=v_fin; end if;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_id,jsonb_build_object('id',v_id,'financialEntryId',v_fin)); return jsonb_build_object('id',v_id,'financialEntryId',v_fin);
end $$;
grant execute on function public.nex_v51_save_payroll(jsonb) to authenticated;

create or replace function public.nex_v51_register_payment(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org uuid:=public.nex_current_org_id(); v_fin uuid:=(p_operation->>'financialEntryId')::uuid; v_cents bigint:=(p_operation->>'amountCents')::bigint; v_key text:=p_operation->>'idempotencyKey'; v_claim public.operation_idempotency%rowtype; v_amount numeric; v_paid numeric; v_payment uuid; v_receipt uuid:=gen_random_uuid(); v_number text;
begin
 perform public.nex_v51_assert_role(array['admin_empresa','admin','socio','financeiro']); select * into v_claim from public.nex_v51_claim_idempotency('register_payment',v_key); if v_claim.status='completed' then return v_claim.result; end if;
 select amount,coalesce(paid_amount,0) into v_amount,v_paid from public.financial_entries where id=v_fin and organization_id=v_org and lower(status) not in ('cancelado','arquivado') for update; if v_amount is null then raise exception 'FINANCIAL_ENTRY_NOT_FOUND'; end if; if v_cents<=0 or v_cents>round((v_amount-v_paid)*100) then raise exception 'INVALID_PAYMENT_AMOUNT'; end if;
 v_number:='REC-'||extract(year from current_date)::int||'-'||lpad((select (count(*)+1)::text from public.payment_receipts where organization_id=v_org and extract(year from issued_at)=extract(year from current_date)),6,'0');
 insert into public.financial_payments(organization_id,financial_entry_id,amount_cents,payment_date,payment_method,receipt_id,idempotency_key,created_by) values(v_org,v_fin,v_cents,(p_operation->>'paymentDate')::date,p_operation->>'paymentMethod',v_receipt,v_key,auth.uid()) returning id into v_payment;
 insert into public.payment_receipts(id,organization_id,financial_entry_id,receipt_number,amount,issued_at,issued_by,payload) values(v_receipt,v_org,v_fin,v_number,v_cents/100.0,(p_operation->>'paymentDate')::date,auth.uid(),jsonb_build_object('paymentId',v_payment));
 update public.financial_entries set paid_amount=v_paid+v_cents/100.0,paid_date=(p_operation->>'paymentDate')::date,receipt_number=v_number,status=case when v_paid+v_cents/100.0>=v_amount then 'pago' else 'parcial' end,version=version+1,updated_at=now() where id=v_fin;
 perform public.nex_v51_finish_idempotency(v_claim.id,'completed',v_payment,jsonb_build_object('id',v_payment,'receiptId',v_receipt)); return jsonb_build_object('id',v_payment,'receiptId',v_receipt);
end $$;
grant execute on function public.nex_v51_register_payment(jsonb) to authenticated;
commit;
