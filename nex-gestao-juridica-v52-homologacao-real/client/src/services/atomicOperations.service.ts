import type { AppState, AtomicOperation, AuthProfile, Client, ContractInstallment, FinanceEntry, FinancialPayment, PaymentReceipt, Process, ProcessMovement, ProcessPhaseHistory, ScheduledEvent, Task, WorkflowRun, WorkflowRunStep } from "@/types/app";
import { databaseMode, supabase } from "./supabase";
import { loadNormalizedState } from "./normalizedRepository";
import { buildInstallmentSchedule, financialBalance, fromCents, nextFinancialStatus, toCents } from "@/lib/financialIntegrity";
import { addBusinessDays } from "@/lib/businessDates";
import { findScheduleConflicts } from "@/lib/schedulingIntegrity";
import { entitiesForOperation } from "./moduleData.service";
import { uid } from "@/utils/format";

export type AtomicOperationResult = { state: AppState; existing?: boolean; referenceId?: string };

function clone(state: AppState): AppState { return JSON.parse(JSON.stringify(state)) as AppState; }
function nowIso() { return new Date().toISOString(); }
function today() { return nowIso().slice(0, 10); }
function actor(profile: AuthProfile | null) { return profile?.id ?? "demo-user"; }
function org(profile: AuthProfile | null, state: AppState) { return profile?.organizationId || state.organizations[0]?.id || "demo-org"; }
function appendAudit(state: AppState, profile: AuthProfile | null, action: string, entityId: string, detail: string) {
  state.auditLogs.unshift({ id: uid("audit"), module: "Homologação real v5.2", action, entityId, user: profile?.name ?? "Ambiente demo", userId: profile?.id, date: today(), detail });
}
function hasProcessed(state: AppState, key: string) { return state.auditLogs.some((log) => log.action === "idempotency" && log.detail === key); }
function markProcessed(state: AppState, key: string, entityId: string) { state.auditLogs.unshift({ id: uid("idem"), module: "Integridade", action: "idempotency", entityId, date: today(), detail: key }); }

function startWorkflowLocal(state: AppState, profile: AuthProfile | null, processId: string, workflowTemplateId: string, idempotencyKey: string) {
  const processed = state.workflowRuns.find((run) => run.idempotencyKey === idempotencyKey);
  if (processed) return processed.id;
  const existing = state.workflowRuns.find((run) => run.processId === processId && run.workflowTemplateId === workflowTemplateId && ["pending", "active"].includes(run.status));
  if (existing) return existing.id;
  const process = state.processes.find((item) => item.id === processId);
  if (!process) throw new Error("Processo não encontrado para iniciar o workflow.");
  const template = state.workflowTemplates.find((item) => item.id === workflowTemplateId && item.active);
  if (!template) throw new Error("Template de workflow ativo não encontrado.");
  const steps = state.workflowSteps.filter((item) => item.workflowId === workflowTemplateId).sort((a, b) => a.order - b.order);
  if (!steps.length) throw new Error("O template não possui etapas configuradas.");
  const runId = uid("workflow-run");
  const run: WorkflowRun = { id: runId, organizationId: org(profile, state), workflowTemplateId, processId, clientId: process.clientId, status: "active", currentStepOrder: steps[0].order, startedAt: nowIso(), startedBy: actor(profile), idempotencyKey };
  state.workflowRuns.unshift(run);
  let previousRunStepId: string | undefined;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const runStepId = uid("workflow-run-step");
    let taskId: string | undefined;
    if (step.createsTask !== false) {
      taskId = uid("task");
      const task: Task = { id: taskId, title: step.taskTitle || step.name, description: `Etapa ${step.order} do workflow ${template.name}.`, processId, client: process.client, clientId: process.clientId, responsible: process.responsible, delegatedBy: actor(profile), reviewer: process.responsible, sector: step.responsibleRole || "Jurídico", priority: step.autoPriority || "Média", status: index === 0 ? "Pendente" : "Aguardando cliente", due: addBusinessDays(today(), Math.max(1, step.order)), estimatedHours: 0, spentHours: 0, estimatedMinutes: 60, workedMinutes: 0, billableMinutes: 0, workflowStage: index === 0 ? "Triagem" : "Execução", slaHours: 24, checklist: step.requiresDocument ? ["Anexar documento obrigatório"] : [], checklistCompleted: [], workflowRunId: runId, workflowRunStepId: runStepId };
      state.tasks.unshift(task);
    }
    const runStep: WorkflowRunStep = { id: runStepId, organizationId: org(profile, state), workflowRunId: runId, workflowStepId: step.id, taskId, stepOrder: step.order, status: index === 0 ? "available" : "pending", dependsOnStepId: previousRunStepId };
    state.workflowRunSteps.push(runStep);
    previousRunStepId = runStepId;
  }
  appendAudit(state, profile, "workflow_started", runId, `Workflow ${template.name} iniciado para ${process.client}.`);
  return runId;
}

function createProcessLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "createProcess" }>) {
  if (hasProcessed(state, operation.idempotencyKey)) return { existing: true, referenceId: operation.process.id };
  if (state.processes.some((item) => item.id === operation.process.id)) return { existing: true, referenceId: operation.process.id };
  const process: Process = { ...operation.process, organizationId: org(profile, state), version: 1, openedAt: operation.process.openedAt || today(), progress: operation.process.progress ?? 0 };
  state.processes.unshift(process);
  state.processMovements.unshift({ id: uid("movement"), organizationId: org(profile, state), processId: process.id, movementType: "created", title: "Processo cadastrado", description: "Cadastro concluído por operação atômica.", occurredAt: nowIso(), source: "manual", visibility: "client", createdBy: actor(profile) });
  if (operation.startWorkflowTemplateId) startWorkflowLocal(state, profile, process.id, operation.startWorkflowTemplateId, `${operation.idempotencyKey}:workflow`);
  markProcessed(state, operation.idempotencyKey, process.id);
  appendAudit(state, profile, "process_created", process.id, "Processo e estruturas iniciais confirmados na mesma operação.");
  return { referenceId: process.id };
}

function convertLeadLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "convertLead" }>) {
  const lead = state.leads.find((item) => item.id === operation.leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  if (lead.conversionStatus === "completed" && lead.conversionClientId && lead.conversionProcessId) return { existing: true, referenceId: lead.conversionProcessId };
  if (hasProcessed(state, operation.idempotencyKey)) return { existing: true, referenceId: lead.conversionProcessId };
  if (!lead.name.trim() || (!lead.phone.trim() && !lead.email?.trim())) throw new Error("Informe nome e ao menos um canal de contato antes da conversão.");
  if (operation.requireConsent !== false && !lead.consentAccepted) throw new Error("Registre o consentimento do lead antes da conversão.");
  const matches = state.clients.filter((item) => Boolean(lead.document && item.document === lead.document) || Boolean(lead.email && item.email?.toLowerCase() === lead.email.toLowerCase()) || Boolean(lead.phone && (item.phone === lead.phone || item.whatsapp === lead.phone)));
  if (matches.length && !operation.reuseClientId) throw new Error("Existe um cliente semelhante. Confirme qual cadastro deve ser reutilizado antes de converter.");
  let client = operation.reuseClientId ? state.clients.find((item) => item.id === operation.reuseClientId) : undefined;
  if (!client) {
    client = { id: uid("client"), organizationId: org(profile, state), type: lead.type ?? "PF", name: lead.name, document: lead.document ?? "", city: "", origin: lead.origin, status: "Ativo", responsible: lead.responsible, responsibleId: lead.responsible, processes: 0, lifetimeValue: lead.value, email: lead.email, phone: lead.phone, whatsapp: lead.phone, notes: lead.notes } as Client;
    state.clients.unshift(client);
  }
  const process: Process = { id: uid("process"), organizationId: org(profile, state), cnj: "", type: "Extrajudicial", client: client.name, clientId: client.id, opposite: "", activePole: client.name, passivePole: "A definir", subject: lead.demandType || lead.area, court: "Controle interno", courtDivision: "", district: "", state: "MA", class: lead.demandType || "Novo caso", area: lead.area, phase: "Triagem", status: "Novo caso", risk: "Médio", successChance: 50, value: lead.value, fees: Math.round(lead.value * 0.3 * 100) / 100, costs: 0, responsible: lead.responsible, responsibleId: lead.responsible, nextDeadline: lead.nextContact, lastMoveDays: 0, progress: 0, clientVisibleSummary: "Caso recebido e em triagem jurídica.", internalStrategy: lead.notes, timeline: [], checklist: ["Validar documentos", "Confirmar conflito de interesse", "Definir estratégia"], openedAt: today(), source: `CRM:${lead.origin}`, version: 1 };
  state.processes.unshift(process);
  client.processes = (client.processes || 0) + 1;
  const template = state.workflowTemplates.find((item) => item.active && (item.moduleArea === lead.area || item.moduleArea === "Geral"));
  if (template) startWorkflowLocal(state, profile, process.id, template.id, `${operation.idempotencyKey}:workflow`);
  lead.stage = "Cliente convertido"; lead.convertedAt = nowIso(); lead.convertedBy = actor(profile); lead.conversionClientId = client.id; lead.conversionProcessId = process.id; lead.conversionStatus = "completed"; lead.conversionIdempotencyKey = operation.idempotencyKey; lead.version = (lead.version ?? 0) + 1;
  state.processMovements.unshift({ id: uid("movement"), organizationId: org(profile, state), processId: process.id, movementType: "crm_conversion", title: "Caso convertido pelo CRM", description: `Lead ${lead.name} convertido sem operações parciais.`, occurredAt: nowIso(), source: "workflow", visibility: "internal", createdBy: actor(profile) });
  markProcessed(state, operation.idempotencyKey, process.id);
  appendAudit(state, profile, "lead_converted", lead.id, `Cliente ${client.id} e processo ${process.id} vinculados.`);
  return { referenceId: process.id };
}

function processBlockers(state: AppState, processId: string) {
  const process = state.processes.find((item) => item.id === processId);
  if (!process) return ["Processo não encontrado"];
  const pendingTasks = state.tasks.filter((task) => task.processId === processId && !["Concluída", "Cancelada"].includes(task.status));
  const pendingDeadlines = state.deadlines.filter((deadline) => deadline.processId === processId && !["Concluído", "Cancelado"].includes(deadline.status));
  const activeRuns = state.workflowRuns.filter((run) => run.processId === processId && ["active", "pending"].includes(run.status));
  const incompleteChecklist = (process.checklist ?? []).length && !(process.checklist ?? []).every((item) => item.startsWith("✓ "));
  return [pendingTasks.length ? `${pendingTasks.length} tarefa(s) aberta(s)` : "", pendingDeadlines.length ? `${pendingDeadlines.length} prazo(s) pendente(s)` : "", activeRuns.length ? `${activeRuns.length} workflow(s) ativo(s)` : "", incompleteChecklist ? "checklist processual incompleto" : ""].filter(Boolean);
}

function saveContractLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "saveFeeContract" }>) {
  const existing = state.feeContracts.find((item) => item.id === operation.contract.id);
  const contract = { ...operation.contract, version: (existing?.version ?? 0) + 1 };
  if (existing) Object.assign(existing, contract); else state.feeContracts.unshift(contract);
  if (!["Ativo", "Assinado"].includes(contract.status)) return { referenceId: contract.id };
  if (state.contractInstallments.some((item) => item.contractId === contract.id)) return { existing: true, referenceId: contract.id };
  const schedule = buildInstallmentSchedule({ totalCents: toCents(contract.totalAmount), count: Math.max(1, contract.installments), firstDueDate: contract.firstDueDate || today(), policy: contract.dueDatePolicy || "next_business_day" });
  for (const part of schedule) {
    const installment: ContractInstallment = { id: uid("installment"), organizationId: org(profile, state), contractId: contract.id, installmentNumber: part.installmentNumber, amountCents: part.amountCents, dueDate: part.dueDate, status: "pending" };
    const client = state.clients.find((item) => item.id === contract.clientId);
    const finance: FinanceEntry = { id: uid("finance"), type: "Receita", category: "Parcela de contrato", client: client?.name || "Cliente", clientId: contract.clientId, processId: contract.processId, amount: fromCents(part.amountCents), dueDate: part.dueDate, status: "Pendente", method: "PIX", installment: part.installmentNumber, installments: contract.installments, sourceType: "contract_installment", sourceId: installment.id, sourceInstallmentId: installment.id, contractId: contract.id, paidAmount: 0, version: 1 };
    installment.financialEntryId = finance.id; state.contractInstallments.push(installment); state.finances.unshift(finance);
  }
  contract.financialGeneratedAt = nowIso();
  markProcessed(state, operation.idempotencyKey, contract.id);
  appendAudit(state, profile, "contract_installments_generated", contract.id, `${schedule.length} parcela(s), total exato de ${contract.totalAmount}.`);
  return { referenceId: contract.id };
}

function saveCostLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "saveCostEntry" }>) {
  const existing = state.costEntries.find((item) => item.id === operation.cost.id);
  const cost = { ...operation.cost, version: (existing?.version ?? 0) + 1 };
  if (existing) Object.assign(existing, cost); else state.costEntries.unshift(cost);
  let finance = cost.financialEntryId ? state.finances.find((item) => item.id === cost.financialEntryId) : state.finances.find((item) => item.costId === cost.id);
  const client = state.clients.find((item) => item.id === cost.clientId);
  const values: FinanceEntry = { id: finance?.id || uid("finance"), type: "Despesa", category: cost.category, client: client?.name || "Escritório", clientId: cost.clientId, processId: cost.processId, amount: cost.amount, dueDate: cost.dueDate, paidDate: cost.status === "Pago" ? today() : undefined, paidAmount: cost.status === "Pago" ? cost.amount : 0, status: cost.status === "Cancelado" ? "Cancelado" : cost.status === "Pago" ? "Pago" : "Pendente", method: "PIX", sourceType: "cost_entry", sourceId: cost.id, costId: cost.id, version: (finance?.version ?? 0) + 1 };
  if (finance) Object.assign(finance, values); else { finance = values; state.finances.unshift(finance); }
  cost.financialEntryId = finance.id; markProcessed(state, operation.idempotencyKey, cost.id); return { referenceId: cost.id };
}

function savePayrollLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "savePayroll" }>) {
  const existing = state.payrolls.find((item) => item.id === operation.payroll.id);
  const payroll = { ...operation.payroll };
  if (existing) Object.assign(existing, payroll); else state.payrolls.unshift(payroll);
  const sourceId = `${payroll.employeeId}:${payroll.year}-${String(payroll.month).padStart(2, "0")}`;
  let finance = state.finances.find((item) => item.payrollId === payroll.id || (item.sourceType === "payroll" && item.sourceId === sourceId));
  const values: FinanceEntry = { id: finance?.id || uid("finance"), type: "Despesa", category: "Folha", client: payroll.employeeName, amount: payroll.net || payroll.gross || payroll.baseSalary, dueDate: `${payroll.year}-${String(payroll.month).padStart(2, "0")}-05`, paidDate: payroll.status === "Paga" ? today() : undefined, paidAmount: payroll.status === "Paga" ? (payroll.net || payroll.gross || payroll.baseSalary) : 0, status: payroll.status === "Paga" ? "Pago" : "Pendente", method: "Transferência", sourceType: "payroll", sourceId, payrollId: payroll.id, competencyDate: `${payroll.year}-${String(payroll.month).padStart(2, "0")}-01`, version: (finance?.version ?? 0) + 1 };
  if (finance) Object.assign(finance, values); else state.finances.unshift(values);
  markProcessed(state, operation.idempotencyKey, payroll.id); return { referenceId: payroll.id };
}

function registerPaymentLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "registerPayment" }>) {
  const duplicate = state.financialPayments.find((item) => item.idempotencyKey === operation.idempotencyKey);
  if (duplicate) return { existing: true, referenceId: duplicate.id };
  const entry = state.finances.find((item) => item.id === operation.financialEntryId);
  if (!entry) throw new Error("Lançamento financeiro não encontrado.");
  const balance = financialBalance(entry.amount, entry.paidAmount ?? 0);
  if (operation.amountCents <= 0) throw new Error("O valor do pagamento deve ser positivo.");
  if (operation.amountCents > balance) throw new Error("O pagamento supera o saldo do lançamento.");
  const paymentId = uid("payment"); const receiptId = uid("receipt");
  const payment: FinancialPayment = { id: paymentId, organizationId: org(profile, state), financialEntryId: entry.id, amountCents: operation.amountCents, paymentDate: operation.paymentDate, paymentMethod: operation.paymentMethod, receiptId, idempotencyKey: operation.idempotencyKey, createdBy: actor(profile) };
  const receiptNumber = `REC-${new Date().getFullYear()}-${String(state.paymentReceipts.length + 1).padStart(6, "0")}`;
  const receipt: PaymentReceipt = { id: receiptId, financeId: entry.id, receiptNumber, amount: fromCents(operation.amountCents), issuedAt: operation.paymentDate, issuedBy: actor(profile) };
  state.financialPayments.unshift(payment); state.paymentReceipts.unshift(receipt);
  const totalPaidCents = state.financialPayments.filter((item) => item.financialEntryId === entry.id && !item.cancelledAt).reduce((sum, item) => sum + item.amountCents, 0);
  entry.paidAmount = fromCents(totalPaidCents); entry.paidDate = operation.paymentDate; entry.receiptNumber = receiptNumber; entry.status = nextFinancialStatus(toCents(entry.amount), totalPaidCents, entry.dueDate); entry.version = (entry.version ?? 0) + 1;
  appendAudit(state, profile, "payment_registered", payment.id, `Baixa de ${receipt.amount} no lançamento ${entry.id}.`);
  return { referenceId: payment.id };
}

function saveMeetingLocal(state: AppState, profile: AuthProfile | null, operation: Extract<AtomicOperation, { type: "saveMeeting" }>) {
  const meeting = { ...operation.meeting };
  const durationMinutes = Math.min(1440, Math.max(15, meeting.durationMinutes ?? 60));
  const organizationTimezone = meeting.timezone || state.organizations.find((item) => item.id === org(profile, state))?.timezone || "America/Fortaleza";
  meeting.durationMinutes = durationMinutes;
  meeting.timezone = organizationTimezone;
  const event: ScheduledEvent = { id: `event-${meeting.id}`, organizationId: org(profile, state), eventType: meeting.type?.toLowerCase().includes("audi") ? "hearing" : "meeting", sourceType: "meeting", sourceId: meeting.id, title: meeting.title, clientId: meeting.clientId, processId: meeting.processId, responsibleId: meeting.responsible, startsAt: meeting.hearingAt, endsAt: new Date(new Date(meeting.hearingAt).getTime() + durationMinutes * 60 * 1000).toISOString(), location: meeting.location, meetingLink: meeting.link, status: meeting.status === "Cancelada" ? "cancelled" : meeting.status === "Realizada" ? "completed" : "scheduled", visibility: meeting.clientId ? "client" : "team", clientVisible: Boolean(meeting.clientId), timezone: organizationTimezone, recurrenceRule: meeting.recurrenceRule, recurrenceSeriesId: meeting.recurrenceSeriesId, syncStatus: "local", version: 1 };
  const conflicts = findScheduleConflicts(event, state.scheduledEvents);
  if (conflicts.length) throw new Error(`Conflito de agenda com: ${conflicts.map((item) => item.title).join(", ")}.`);
  const existing = state.hearings.find((item) => item.id === meeting.id);
  if (existing) Object.assign(existing, meeting); else state.hearings.unshift(meeting);
  const existingEvent = state.scheduledEvents.find((item) => item.sourceType === "meeting" && item.sourceId === meeting.id);
  if (existingEvent) Object.assign(existingEvent, event, { version: (existingEvent.version ?? 0) + 1 }); else state.scheduledEvents.unshift(event);
  let task = state.tasks.find((item) => item.meetingId === meeting.id);
  const taskValues: Task = { id: task?.id || uid("task"), title: `Preparar ${meeting.title}`, description: "Preparar pauta, documentos e participantes.", processId: meeting.processId, client: meeting.client, clientId: meeting.clientId, responsible: meeting.responsible || "", sector: "Agenda / Controladoria", priority: "Média", status: meeting.status === "Cancelada" ? "Cancelada" : task?.status === "Concluída" ? "Concluída" : "Pendente", due: meeting.hearingAt.slice(0, 10), estimatedHours: 0.75, spentHours: task?.spentHours ?? 0, estimatedMinutes: 45, workedMinutes: task?.workedMinutes ?? 0, workflowStage: "Execução", slaHours: 24, checklist: ["Separar documentos", "Confirmar participantes", "Registrar ata"], checklistCompleted: task?.checklistCompleted ?? [], meetingId: meeting.id };
  if (task) Object.assign(task, taskValues); else state.tasks.unshift(taskValues);
  markProcessed(state, operation.idempotencyKey, meeting.id); return { referenceId: meeting.id };
}

export function applyAtomicOperationLocal(state: AppState, profile: AuthProfile | null, operation: AtomicOperation): AtomicOperationResult {
  const next = clone(state);
  let result: { existing?: boolean; referenceId?: string } = {};
  switch (operation.type) {
    case "convertLead": result = convertLeadLocal(next, profile, operation); break;
    case "createProcess": result = createProcessLocal(next, profile, operation); break;
    case "startWorkflow": result = { referenceId: startWorkflowLocal(next, profile, operation.processId, operation.workflowTemplateId, operation.idempotencyKey) }; break;
    case "completeWorkflowStep": {
      const runStep = next.workflowRunSteps.find((item) => item.id === operation.runStepId); if (!runStep) throw new Error("Etapa de workflow não encontrada.");
      if (runStep.status === "completed") { result = { existing: true, referenceId: runStep.id }; break; }
      const task = next.tasks.find((item) => item.id === runStep.taskId);
      if (task && (task.blockers?.length || (task.checklist?.length && (task.checklistCompleted?.length ?? 0) < task.checklist.length))) throw new Error("Conclua o checklist e remova os bloqueios antes de avançar.");
      runStep.status = "completed"; runStep.completedAt = nowIso();
      if (task) { task.status = "Concluída"; task.completedAt = today(); task.workedMinutes = operation.workedMinutes; task.billableMinutes = operation.billableMinutes ?? operation.workedMinutes; task.spentHours = operation.workedMinutes / 60; }
      const run = next.workflowRuns.find((item) => item.id === runStep.workflowRunId); const following = next.workflowRunSteps.filter((item) => item.workflowRunId === runStep.workflowRunId).sort((a, b) => a.stepOrder - b.stepOrder).find((item) => item.stepOrder > runStep.stepOrder && item.status === "pending");
      if (following) { following.status = "available"; if (run) run.currentStepOrder = following.stepOrder; const nextTask = next.tasks.find((item) => item.id === following.taskId); if (nextTask && nextTask.status === "Aguardando cliente") nextTask.status = "Pendente"; }
      else if (run) { run.status = "completed"; run.completedAt = nowIso(); }
      result = { referenceId: runStep.id }; break;
    }
    case "changeProcessPhase": {
      const process = next.processes.find((item) => item.id === operation.processId); if (!process) throw new Error("Processo não encontrado.");
      if (!operation.reason.trim()) throw new Error("Informe o motivo da mudança de fase.");
      if (operation.expectedVersion != null && operation.expectedVersion !== (process.version ?? 0)) throw new Error("Este processo foi atualizado por outro usuário. Recarregue os dados antes de salvar novamente.");
      const openTasks = next.tasks.filter((task) => task.processId === process.id && task.status !== "Concluída" && task.status !== "Cancelada");
      if (openTasks.some((task) => task.priority === "Crítica" || task.blockers?.length)) throw new Error("Há tarefa crítica ou bloqueada impedindo a mudança de fase.");
      const previous = process.phase; process.phase = operation.newPhase; process.version = (process.version ?? 0) + 1;
      const runSteps = next.workflowRunSteps.filter((step) => next.workflowRuns.some((run) => run.id === step.workflowRunId && run.processId === process.id));
      process.progress = runSteps.length ? Math.round(runSteps.filter((step) => step.status === "completed").length / runSteps.length * 100) : process.progress;
      const history: ProcessPhaseHistory = { id: uid("phase"), organizationId: org(profile, next), processId: process.id, previousPhase: previous, newPhase: process.phase, changedBy: actor(profile), changedAt: nowIso(), reason: operation.reason };
      next.processPhaseHistory.unshift(history); result = { referenceId: history.id }; break;
    }
    case "closeProcess": {
      const process = next.processes.find((item) => item.id === operation.processId); if (!process) throw new Error("Processo não encontrado.");
      if (operation.expectedVersion != null && operation.expectedVersion !== (process.version ?? 0)) throw new Error("Este processo foi atualizado por outro usuário. Recarregue os dados antes de salvar novamente.");
      const blockers = processBlockers(next, process.id); if (blockers.length && !operation.force) throw new Error(`Encerramento bloqueado: ${blockers.join(", ")}.`);
      if (!operation.reason.trim()) throw new Error("Informe a justificativa de encerramento.");
      process.status = "Encerrado"; process.phase = "Encerrado"; process.closedAt = nowIso(); process.progress = 100; process.version = (process.version ?? 0) + 1;
      next.processMovements.unshift({ id: uid("movement"), organizationId: org(profile, next), processId: process.id, movementType: "closed", title: "Processo encerrado", description: operation.reason, occurredAt: nowIso(), source: "manual", visibility: "client", createdBy: actor(profile) }); result = { referenceId: process.id }; break;
    }
    case "simulateJudicialSync": {
      const process = next.processes.find((item) => item.id === operation.processId); if (!process) throw new Error("Processo não encontrado.");
      if (hasProcessed(next, operation.idempotencyKey)) { result = { existing: true, referenceId: process.id }; break; }
      next.processMovements.unshift({ id: uid("movement"), organizationId: org(profile, next), processId: process.id, movementType: "simulation", title: "Simulação de movimentação judicial", description: "Registro de demonstração; nenhuma API de tribunal foi consultada.", occurredAt: nowIso(), source: "simulation", visibility: "internal", createdBy: actor(profile) });
      markProcessed(next, operation.idempotencyKey, process.id); result = { referenceId: process.id }; break;
    }
    case "saveFeeContract": result = saveContractLocal(next, profile, operation); break;
    case "saveCostEntry": result = saveCostLocal(next, profile, operation); break;
    case "savePayroll": result = savePayrollLocal(next, profile, operation); break;
    case "registerPayment": result = registerPaymentLocal(next, profile, operation); break;
    case "saveMeeting": result = saveMeetingLocal(next, profile, operation); break;
    case "cancelMeeting": {
      const meeting = next.hearings.find((item) => item.id === operation.meetingId); if (!meeting) throw new Error("Reunião não encontrada.");
      meeting.status = "Cancelada"; const event = next.scheduledEvents.find((item) => item.sourceType === "meeting" && item.sourceId === meeting.id); if (event) event.status = "cancelled";
      const task = next.tasks.find((item) => item.meetingId === meeting.id); if (task && task.status !== "Concluída") task.status = "Cancelada";
      appendAudit(next, profile, "meeting_cancelled", meeting.id, operation.reason); result = { referenceId: meeting.id }; break;
    }
    case "createLeadFollowUp": {
      const lead = next.leads.find((item) => item.id === operation.leadId); if (!lead) throw new Error("Lead não encontrado.");
      if (hasProcessed(next, operation.idempotencyKey)) { result = { existing: true, referenceId: lead.id }; break; }
      lead.nextContact = operation.dueDate; lead.version = (lead.version ?? 0) + 1;
      const task: Task = { id: uid("task"), title: `Follow-up: ${lead.name}`, description: `Retomar contato comercial com o lead ${lead.name}.`, processId: "", client: lead.name, responsible: lead.responsible, sector: "Atendimento", priority: "Média", status: "Pendente", due: operation.dueDate, estimatedHours: 0.5, spentHours: 0 };
      next.tasks.unshift(task); markProcessed(next, operation.idempotencyKey, lead.id); appendAudit(next, profile, "lead_follow_up_created", lead.id, `Follow-up agendado para ${operation.dueDate}.`); result = { referenceId: task.id }; break;
    }
    case "setDefaultLeadSource": {
      const source = next.leadSources.find((item) => item.id === operation.sourceId); if (!source) throw new Error("Fonte de lead não encontrada.");
      if (hasProcessed(next, operation.idempotencyKey)) { result = { existing: true, referenceId: source.id }; break; }
      next.leadSources.forEach((item) => { item.isDefault = item.id === source.id; });
      markProcessed(next, operation.idempotencyKey, source.id); appendAudit(next, profile, "lead_source_default_changed", source.id, `Fonte padrão alterada para ${source.sourceName}.`); result = { referenceId: source.id }; break;
    }
  }
  return { state: next, ...result };
}

const rpcNames: Record<AtomicOperation["type"], string> = {
  convertLead: "nex_v52_convert_lead", createProcess: "nex_v52_create_process", startWorkflow: "nex_v52_start_workflow", completeWorkflowStep: "nex_v52_complete_workflow_step", changeProcessPhase: "nex_v52_change_process_phase", closeProcess: "nex_v52_close_process", simulateJudicialSync: "nex_v52_simulate_judicial_sync", saveFeeContract: "nex_v52_save_fee_contract", saveCostEntry: "nex_v52_save_cost_entry", savePayroll: "nex_v52_save_payroll", registerPayment: "nex_v52_register_payment", saveMeeting: "nex_v52_save_meeting", cancelMeeting: "nex_v52_cancel_meeting", createLeadFollowUp: "nex_v52_create_lead_follow_up", setDefaultLeadSource: "nex_v52_set_default_lead_source_operation",
};

function rpcPayload(operation: AtomicOperation) { return { p_operation: operation }; }

export async function executeAtomicOperation(state: AppState, profile: AuthProfile | null, operation: AtomicOperation): Promise<AtomicOperationResult> {
  if (databaseMode !== "production") return applyAtomicOperationLocal(state, profile, operation);
  if (!supabase) throw new Error("Supabase indisponível para operação transacional.");
  const { data, error } = await supabase.rpc(rpcNames[operation.type], rpcPayload(operation) as never);
  if (error) {
    const message = String(error.message ?? error);
    if (message.includes("VERSION_CONFLICT")) throw new Error("Este registro foi atualizado por outro usuário. Recarregue os dados antes de salvar novamente.");
    if (message.includes("INVALID_OR_CROSS_ORGANIZATION_REFERENCE")) throw new Error("Um vínculo informado não pertence à sua organização ou não está mais disponível.");
    if (message.includes("FORBIDDEN")) throw new Error("Seu perfil não possui permissão para concluir esta operação.");
    throw error;
  }
  const refreshed = await loadNormalizedState(entitiesForOperation(operation), state);
  return { state: refreshed, referenceId: (data as { id?: string } | null)?.id };
}
