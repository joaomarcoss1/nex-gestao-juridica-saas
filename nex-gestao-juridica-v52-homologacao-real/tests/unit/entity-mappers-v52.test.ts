import { describe, expect, it } from "vitest";
import {
  mapContractInstallmentFromDatabase, mapContractInstallmentToDatabase,
  mapFinanceEntryFromDatabase, mapFinanceEntryToDatabase,
  mapFinancialPaymentFromDatabase, mapFinancialPaymentToDatabase,
  mapProcessMovementFromDatabase, mapProcessMovementToDatabase,
  mapScheduledEventFromDatabase, mapScheduledEventToDatabase,
  mapWorkflowRunFromDatabase, mapWorkflowRunToDatabase,
  mapWorkflowRunStepFromDatabase, mapWorkflowRunStepToDatabase,
} from "@/services/entityMappers.v52";
import type { ContractInstallment, FinanceEntry, FinancialPayment, ProcessMovement, ScheduledEvent, WorkflowRun, WorkflowRunStep } from "@/types/app";

const org = "00000000-0000-4000-8000-000000000001";

describe("mapeadores explícitos v5.2", () => {
  it("mantém workflow e etapas após round trip snake_case", () => {
    const run: WorkflowRun = { id:"run-1", organizationId:org, workflowTemplateId:"tpl-1", processId:"proc-1", status:"active", currentStepOrder:2, startedAt:"2026-07-15T10:00:00Z", startedBy:"user-1", idempotencyKey:"wf-1", metadata:{source:"test"} };
    expect(mapWorkflowRunFromDatabase(mapWorkflowRunToDatabase(run,org))).toMatchObject(run);
    const step: WorkflowRunStep = { id:"step-1", organizationId:org, workflowRunId:"run-1", workflowStepId:"template-step", stepOrder:2, status:"available", executionGroup:"parallel-a", conditionType:"always", conditionPayload:{ok:true}, requiredApproverRole:"advogado", slaDueAt:"2026-07-16T10:00:00Z", version:3 };
    expect(mapWorkflowRunStepFromDatabase(mapWorkflowRunStepToDatabase(step,org))).toMatchObject(step);
  });

  it("lê movimentação legada e escreve o formato novo sem perder identificadores", () => {
    const mapped = mapProcessMovementFromDatabase({ id:"m1", organization_id:org, process_id:"p1", provider:"tribunal", external_movement_id:"ext-1", movement_at:"2026-07-14T10:00:00Z", requires_action:true, raw_payload:{legacy:true}, created_at:"2026-07-14T10:00:00Z" });
    expect(mapped.source).toBe("court_integration");
    expect(mapped.legacyProvider).toBe("tribunal");
    expect(mapped.externalId).toBe("ext-1");
    expect(mapped.occurredAt).toBe("2026-07-14T10:00:00Z");
    const back = mapProcessMovementToDatabase(mapped,org);
    expect(back.external_id).toBe("ext-1");
    expect(back.external_movement_id).toBe("ext-1");
  });

  it("paid_amount nulo é zero e vínculos financeiros sobrevivem ao round trip", () => {
    const fromNull = mapFinanceEntryFromDatabase({ id:"f0", type:"receita", category:"Teste", amount:100, due_date:"2026-07-20", paid_amount:null, status:"pending", method:"PIX" });
    expect(fromNull.paidAmount).toBe(0);
    const entry: FinanceEntry = { id:"f1", type:"Receita", category:"Parcela", client:"Cliente", clientId:"c1", processId:"p1", amount:100.01, dueDate:"2026-07-31", paidAmount:25, status:"Parcial", method:"PIX", sourceType:"contract_installment", sourceId:"source-1", sourceInstallmentId:"i1", contractId:"c1x", competencyDate:"2026-07-01", version:4, renegotiationId:"r1" };
    const round = mapFinanceEntryFromDatabase(mapFinanceEntryToDatabase(entry,org,"c1"),"Cliente");
    expect(round).toMatchObject(entry);
  });

  it("mantém parcelas, pagamentos e agenda sincronizáveis", () => {
    const installment: ContractInstallment = { id:"i1", organizationId:org, contractId:"c1", installmentNumber:1, amountCents:3334, dueDate:"2026-07-31", status:"pending", financialEntryId:"f1" };
    expect(mapContractInstallmentFromDatabase(mapContractInstallmentToDatabase(installment,org))).toMatchObject(installment);
    const payment: FinancialPayment = { id:"pay1", organizationId:org, financialEntryId:"f1", amountCents:1000, paymentDate:"2026-07-15", paymentMethod:"PIX", receiptId:"rec1", idempotencyKey:"key1", createdBy:"u1" };
    expect(mapFinancialPaymentFromDatabase(mapFinancialPaymentToDatabase(payment,org))).toMatchObject(payment);
    const event: ScheduledEvent = { id:"e1", organizationId:org, eventType:"meeting", sourceType:"meeting", sourceId:"m1", title:"Reunião", startsAt:"2026-07-15T12:00:00Z", endsAt:"2026-07-15T13:30:00Z", status:"scheduled", clientVisible:false, visibility:"internal", timezone:"America/Fortaleza", recurrenceRule:"FREQ=WEEKLY", syncStatus:"pending", version:2 };
    expect(mapScheduledEventFromDatabase(mapScheduledEventToDatabase(event,org))).toMatchObject(event);
  });
});
