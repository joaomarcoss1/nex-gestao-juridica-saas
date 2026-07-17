import { describe, expect, it } from "vitest";
import { defaultState } from "@/data/defaultState";
import { applyAtomicOperationLocal } from "@/services/atomicOperations.service";
import type { AppState, AuthProfile, FeeContract, Hearing } from "@/types/app";

const profile: AuthProfile = {
  id: "00000000-0000-4000-8000-0000000000e1",
  organizationId: "00000000-0000-4000-8000-000000000001",
  name: "Administrador de teste",
  role: "admin_master",
  active: true,
};
const fresh = (): AppState => structuredClone(defaultState);

describe("operações atômicas locais", () => {
  it("converte lead reutilizando cliente existente e não duplica no retry", () => {
    const state = fresh();
    const lead = state.leads[0];
    lead.consentAccepted = true;
    const reuseClientId = state.clients.find((client) => client.phone === lead.phone || client.email === lead.email)?.id;
    const clientsBefore = state.clients.length;
    const first = applyAtomicOperationLocal(state, profile, { type: "convertLead", leadId: lead.id, reuseClientId, requireConsent: true, duplicateOverrideReason: reuseClientId ? "Cliente confirmado no teste." : undefined, idempotencyKey: "convert-lead-1" });
    expect(first.state.clients).toHaveLength(clientsBefore);
    expect(first.state.leads.find((item) => item.id === lead.id)?.conversionStatus).toBe("completed");
    const processesAfterFirst = first.state.processes.length;
    const second = applyAtomicOperationLocal(first.state, profile, { type: "convertLead", leadId: lead.id, reuseClientId, requireConsent: true, idempotencyKey: "convert-lead-1" });
    expect(second.existing).toBe(true);
    expect(second.state.processes).toHaveLength(processesAfterFirst);
  });

  it("mantém o estado original intacto quando a conversão falha", () => {
    const state = fresh();
    state.leads[0] = { ...state.leads[0], name: "", phone: "", email: "" };
    const snapshot = structuredClone(state);
    expect(() => applyAtomicOperationLocal(state, profile, { type: "convertLead", leadId: state.leads[0].id, idempotencyKey: "invalid" })).toThrow();
    expect(state).toEqual(snapshot);
  });

  it("aplica um workflow uma única vez", () => {
    const state = fresh();
    const processId = state.processes[0].id;
    const templateId = state.workflowTemplates[0].id;
    const first = applyAtomicOperationLocal(state, profile, { type: "startWorkflow", processId, workflowTemplateId: templateId, idempotencyKey: "wf-1" });
    const runCount = first.state.workflowRuns.length;
    const taskCount = first.state.tasks.length;
    const second = applyAtomicOperationLocal(first.state, profile, { type: "startWorkflow", processId, workflowTemplateId: templateId, idempotencyKey: "wf-1" });
    expect(second.state.workflowRuns).toHaveLength(runCount);
    expect(second.state.tasks).toHaveLength(taskCount);
  });

  it("não conclui etapa com checklist pendente e não inventa horas", () => {
    const state = fresh();
    const started = applyAtomicOperationLocal(state, profile, { type: "startWorkflow", processId: state.processes[0].id, workflowTemplateId: state.workflowTemplates[0].id, idempotencyKey: "wf-checklist" });
    const step = started.state.workflowRunSteps[0];
    const task = started.state.tasks.find((item) => item.id === step.taskId)!;
    task.checklist = ["Documento obrigatório"];
    task.checklistCompleted = [];
    expect(() => applyAtomicOperationLocal(started.state, profile, { type: "completeWorkflowStep", runStepId: step.id, workedMinutes: 0, idempotencyKey: "step-1" })).toThrow(/checklist/i);
    task.checklistCompleted = ["Documento obrigatório"];
    const completed = applyAtomicOperationLocal(started.state, profile, { type: "completeWorkflowStep", runStepId: step.id, workedMinutes: 0, idempotencyKey: "step-1" });
    const saved = completed.state.tasks.find((item) => item.id === task.id)!;
    expect(saved.status).toBe("Concluída");
    expect(saved.workedMinutes).toBe(0);
    expect(saved.spentHours).toBe(0);
  });

  it("gera parcelas uma vez e fecha o total exato", () => {
    const state = fresh();
    const contract: FeeContract = { ...state.feeContracts[0], id: "contract-test", totalAmount: 100.01, installments: 3, firstDueDate: "2026-01-31", dueDatePolicy: "keep", status: "Ativo" };
    const first = applyAtomicOperationLocal(state, profile, { type: "saveFeeContract", contract, idempotencyKey: "contract-1" });
    const parts = first.state.contractInstallments.filter((item) => item.contractId === contract.id);
    expect(parts).toHaveLength(3);
    expect(parts.reduce((sum, item) => sum + item.amountCents, 0)).toBe(10_001);
    const financeCount = first.state.finances.length;
    const second = applyAtomicOperationLocal(first.state, profile, { type: "saveFeeContract", contract: { ...contract, title: "Título alterado" }, idempotencyKey: "contract-edit" });
    expect(second.state.finances).toHaveLength(financeCount);
    expect(second.state.contractInstallments.filter((item) => item.contractId === contract.id)).toHaveLength(3);
  });

  it("atualiza custa e folha sem duplicar lançamentos", () => {
    let state = fresh();
    const cost = { ...state.costEntries[0], id: "cost-test", amount: 450 };
    state = applyAtomicOperationLocal(state, profile, { type: "saveCostEntry", cost, idempotencyKey: "cost-1" }).state;
    const afterCost = state.finances.length;
    state = applyAtomicOperationLocal(state, profile, { type: "saveCostEntry", cost: { ...cost, amount: 475 }, idempotencyKey: "cost-2" }).state;
    expect(state.finances).toHaveLength(afterCost);
    expect(state.finances.find((item) => item.costId === cost.id)?.amount).toBe(475);

    const payroll = { ...state.payrolls[0], id: "payroll-test" };
    state = applyAtomicOperationLocal(state, profile, { type: "savePayroll", payroll, idempotencyKey: "payroll-1" }).state;
    const afterPayroll = state.finances.length;
    state = applyAtomicOperationLocal(state, profile, { type: "savePayroll", payroll: { ...payroll, net: payroll.net + 100 }, idempotencyKey: "payroll-2" }).state;
    expect(state.finances).toHaveLength(afterPayroll);
    expect(state.finances.find((item) => item.payrollId === payroll.id)?.amount).toBe(payroll.net + 100);
  });

  it("registra pagamento parcial e rejeita repetição ou excesso", () => {
    const state = fresh();
    const entry = state.finances.find((item) => item.status === "Pendente")!;
    const first = applyAtomicOperationLocal(state, profile, { type: "registerPayment", financialEntryId: entry.id, amountCents: 1000, paymentDate: "2026-07-14", paymentMethod: "PIX", idempotencyKey: "payment-1" });
    expect(first.state.financialPayments).toHaveLength(1);
    expect(first.state.paymentReceipts).toHaveLength(1);
    expect(first.state.finances.find((item) => item.id === entry.id)?.status).toBe("Parcial");
    const retry = applyAtomicOperationLocal(first.state, profile, { type: "registerPayment", financialEntryId: entry.id, amountCents: 1000, paymentDate: "2026-07-14", paymentMethod: "PIX", idempotencyKey: "payment-1" });
    expect(retry.existing).toBe(true);
    expect(retry.state.financialPayments).toHaveLength(1);
    expect(() => applyAtomicOperationLocal(first.state, profile, { type: "registerPayment", financialEntryId: entry.id, amountCents: 999_999_999, paymentDate: "2026-07-14", paymentMethod: "PIX", idempotencyKey: "payment-too-high" })).toThrow(/saldo/i);
  });

  it("sincroniza reunião, evento e tarefa sem duplicação", () => {
    const state = fresh();
    const meeting: Hearing = { id: "meeting-test", title: "Reunião de estratégia", client: "Wallace Pereira", clientId: state.clients[0].id, processId: state.processes[0].id, hearingAt: "2027-01-12T14:00:00", type: "Reunião com cliente", responsible: state.employees[0].id, status: "Agendada" };
    const first = applyAtomicOperationLocal(state, profile, { type: "saveMeeting", meeting, idempotencyKey: "meeting-1" });
    expect(first.state.hearings.filter((item) => item.id === meeting.id)).toHaveLength(1);
    expect(first.state.scheduledEvents.filter((item) => item.sourceId === meeting.id)).toHaveLength(1);
    expect(first.state.tasks.filter((item) => item.meetingId === meeting.id)).toHaveLength(1);
    const edited = applyAtomicOperationLocal(first.state, profile, { type: "saveMeeting", meeting: { ...meeting, hearingAt: "2027-01-13T15:00:00" }, idempotencyKey: "meeting-2" });
    expect(edited.state.scheduledEvents.filter((item) => item.sourceId === meeting.id)).toHaveLength(1);
    expect(edited.state.tasks.find((item) => item.meetingId === meeting.id)?.due).toBe("2027-01-13");
  });

  it("detecta conflito de agenda e preserva o estado anterior", () => {
    const state = fresh();
    const first: Hearing = { id: "meeting-conflict-a", title: "Primeiro compromisso", client: "Equipe interna", hearingAt: "2027-02-10T10:00:00", type: "Reunião de equipe", responsible: state.employees[0].id, status: "Agendada" };
    const saved = applyAtomicOperationLocal(state, profile, { type: "saveMeeting", meeting: first, idempotencyKey: "meeting-a" });
    const snapshot = structuredClone(saved.state);
    const second: Hearing = { ...first, id: "meeting-conflict-b", title: "Segundo compromisso", hearingAt: "2027-02-10T10:30:00" };
    expect(() => applyAtomicOperationLocal(saved.state, profile, { type: "saveMeeting", meeting: second, idempotencyKey: "meeting-b" })).toThrow(/conflito/i);
    expect(saved.state).toEqual(snapshot);
  });
});
