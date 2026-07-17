-- Nex Gestão Jurídica v5.2 · máquina de estados, recibos concorrentes e pagamentos reconciliados
begin;

create or replace function public.nex_v52_normalize_financial_status(p_status text)
returns text language sql immutable set search_path=public,pg_temp as $$
 select case lower(coalesce(p_status,''))
  when 'rascunho' then 'draft' when 'draft' then 'draft'
  when 'pendente' then 'pending' when 'pending' then 'pending'
  when 'parcial' then 'partially_paid' when 'partially_paid' then 'partially_paid'
  when 'pago' then 'paid' when 'paid' then 'paid'
  when 'atrasado' then 'overdue' when 'overdue' then 'overdue'
  when 'cancelado' then 'cancelled' when 'cancelled' then 'cancelled'
  when 'renegociado' then 'renegotiated' when 'renegotiated' then 'renegotiated'
  when 'estornado' then 'refunded' when 'refunded' then 'refunded'
  when 'baixado como perda' then 'written_off' when 'written_off' then 'written_off'
  else 'pending' end
$$;

update public.financial_entries set status=public.nex_v52_normalize_financial_status(status),paid_amount=coalesce(paid_amount,0) where status is distinct from public.nex_v52_normalize_financial_status(status) or paid_amount is null;

create or replace function public.nex_v52_register_payment(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_org uuid:=public.nex_current_org_id(); v_fin uuid:=(p_operation->>'financialEntryId')::uuid; v_key text:=p_operation->>'idempotencyKey';
  v_cents bigint:=(p_operation->>'amountCents')::bigint; v_entry public.financial_entries%rowtype; v_existing uuid; v_payment uuid:=gen_random_uuid(); v_receipt uuid:=gen_random_uuid();
  v_paid numeric(14,2); v_amount numeric(14,2); v_total numeric(14,2); v_seq bigint; v_number text; v_year integer:=extract(year from (p_operation->>'paymentDate')::date)::integer;
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','financeiro']);
  perform public.nex_v52_assert_reference('financial_entry',v_fin,true);
  if v_cents<=0 then raise exception 'PAYMENT_AMOUNT_INVALID'; end if;
  select id into v_existing from public.financial_payments where organization_id=v_org and idempotency_key=v_key;
  if v_existing is not null then return jsonb_build_object('id',v_existing,'existing',true); end if;
  select * into v_entry from public.financial_entries where id=v_fin and organization_id=v_org for update;
  if public.nex_v52_normalize_financial_status(v_entry.status) not in ('pending','partially_paid','overdue') then raise exception 'FINANCIAL_STATUS_NOT_PAYABLE'; end if;
  v_paid:=coalesce(v_entry.paid_amount,0); v_amount:=coalesce(v_entry.amount,0);
  if round(v_cents::numeric/100,2)>round(v_amount-v_paid,2) then raise exception 'PAYMENT_EXCEEDS_BALANCE'; end if;
  v_seq:=public.nex_v52_next_counter('receipt',v_year);
  v_number:='REC-'||v_year::text||'-'||lpad(v_seq::text,6,'0');
  insert into public.financial_payments(id,organization_id,financial_entry_id,amount_cents,payment_date,payment_method,reference,receipt_id,idempotency_key,created_by)
  values(v_payment,v_org,v_fin,v_cents,(p_operation->>'paymentDate')::date,coalesce(p_operation->>'paymentMethod','PIX'),nullif(p_operation->>'reference',''),v_receipt,v_key,public.nex_current_profile_id());
  insert into public.payment_receipts(id,organization_id,financial_entry_id,receipt_number,amount,issued_at,issued_by,payload)
  values(v_receipt,v_org,v_fin,v_number,v_cents::numeric/100,(p_operation->>'paymentDate')::date,public.nex_current_profile_id(),jsonb_build_object('paymentId',v_payment,'idempotencyKey',v_key));
  v_total:=round(v_paid+v_cents::numeric/100,2);
  update public.financial_entries set paid_amount=v_total,payment_date=(p_operation->>'paymentDate')::date,paid_date=(p_operation->>'paymentDate')::date,receipt_number=v_number,status=case when v_total>=v_amount then 'paid' else 'partially_paid' end,version=version+1,updated_at=now() where id=v_fin;
  perform public.nex_v52_record_audit('finance','register_payment',v_fin::text,jsonb_build_object('paidAmount',v_paid),jsonb_build_object('paymentId',v_payment,'paidAmount',v_total));
  return jsonb_build_object('id',v_payment,'receiptId',v_receipt,'receiptNumber',v_number);
end $$;

create or replace function public.nex_v52_cancel_payment(p_payment_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_org uuid:=public.nex_current_org_id(); v_payment public.financial_payments%rowtype; v_total numeric(14,2); v_amount numeric(14,2);
begin
  perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','financeiro']);
  if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
  select * into v_payment from public.financial_payments where id=p_payment_id and organization_id=v_org for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.cancelled_at is not null then return jsonb_build_object('id',p_payment_id,'existing',true); end if;
  update public.financial_payments set cancelled_at=now(),cancellation_reason=p_reason where id=p_payment_id;
  update public.payment_receipts set status='cancelled',cancelled_at=now(),cancellation_reason=p_reason,reversed_by=public.nex_current_profile_id()
   where id=v_payment.receipt_id and organization_id=v_org and cancelled_at is null;
  select coalesce(sum(amount_cents),0)::numeric/100 into v_total from public.financial_payments where financial_entry_id=v_payment.financial_entry_id and organization_id=v_org and cancelled_at is null and archived_at is null;
  select amount into v_amount from public.financial_entries where id=v_payment.financial_entry_id and organization_id=v_org for update;
  update public.financial_entries set paid_amount=v_total,status=case when v_total<=0 then case when due_date<current_date then 'overdue' else 'pending' end when v_total>=v_amount then 'paid' else 'partially_paid' end,version=version+1,updated_at=now() where id=v_payment.financial_entry_id;
  perform public.nex_v52_record_audit('finance','cancel_payment',p_payment_id::text,null,jsonb_build_object('reason',p_reason));
  return jsonb_build_object('id',p_payment_id,'financialEntryId',v_payment.financial_entry_id);
end $$;

create or replace function public.nex_v52_save_fee_contract(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_data jsonb:=p_operation->'contract';
begin
 perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','financeiro']);
 perform public.nex_v52_assert_reference('client',nullif(v_data->>'clientId','')::uuid,true);
 perform public.nex_v52_assert_reference('process',nullif(v_data->>'processId','')::uuid,false);
 return public.nex_v51_save_fee_contract(p_operation);
end $$;
create or replace function public.nex_v52_save_cost_entry(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_data jsonb:=p_operation->'cost';
begin
 perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','financeiro']);
 perform public.nex_v52_assert_reference('client',nullif(v_data->>'clientId','')::uuid,false);
 perform public.nex_v52_assert_reference('process',nullif(v_data->>'processId','')::uuid,false);
 return public.nex_v51_save_cost_entry(p_operation);
end $$;
create or replace function public.nex_v52_save_payroll(p_operation jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.nex_v52_assert_role(array['admin_empresa','admin','socio','financeiro','rh']);
 perform public.nex_v52_assert_reference('employee',nullif((p_operation->'payroll')->>'employeeId','')::uuid,true);
 return public.nex_v51_save_payroll(p_operation);
end $$;

create or replace function public.nex_v52_mark_overdue_entries()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
 update public.financial_entries set status='overdue',version=version+1,updated_at=now()
 where organization_id=public.nex_current_org_id() and archived_at is null and cancelled_at is null
   and public.nex_v52_normalize_financial_status(status) in ('pending','partially_paid')
   and due_date<current_date and amount>coalesce(paid_amount,0);
 get diagnostics v_count=row_count; return v_count;
end $$;

revoke all on function public.nex_v52_register_payment(jsonb),public.nex_v52_cancel_payment(uuid,text),public.nex_v52_save_fee_contract(jsonb),public.nex_v52_save_cost_entry(jsonb),public.nex_v52_save_payroll(jsonb),public.nex_v52_mark_overdue_entries() from public,anon;
grant execute on function public.nex_v52_register_payment(jsonb),public.nex_v52_cancel_payment(uuid,text),public.nex_v52_save_fee_contract(jsonb),public.nex_v52_save_cost_entry(jsonb),public.nex_v52_save_payroll(jsonb),public.nex_v52_mark_overdue_entries() to authenticated;
commit;
