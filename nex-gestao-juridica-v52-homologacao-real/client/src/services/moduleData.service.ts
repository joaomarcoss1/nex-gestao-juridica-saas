import type { AtomicOperation, EntityName, PageKey } from "@/types/app";

const shared: EntityName[] = ["organizations", "employees", "notifications"];
const modules: Partial<Record<PageKey, EntityName[]>> = {
  dashboard: ["clients", "leads", "processes", "tasks", "deadlines", "finances", "scheduledEvents", "hearings"],
  crm: ["leads", "leadSources", "clients", "processes", "tasks", "workflowTemplates", "workflowSteps", "workflowRuns", "workflowRunSteps"],
  clientes: ["clients", "processes", "finances", "documents", "messages"],
  processos: ["clients", "processes", "processMovements", "processPhaseHistory", "tasks", "deadlines", "documents", "finances", "workflowTemplates", "workflowSteps", "workflowRuns", "workflowRunSteps"],
  tarefas: ["clients", "processes", "tasks", "messages", "workflowTemplates", "workflowSteps", "workflowRuns", "workflowRunSteps"],
  prazos: ["clients", "processes", "deadlines", "tasks"],
  agenda: ["clients", "processes", "hearings", "scheduledEvents", "tasks", "deadlines", "finances"],
  financeiro: ["clients", "processes", "finances", "financialPayments", "paymentReceipts", "feeContracts", "contractInstallments", "costEntries", "payrolls"],
  documentos: ["clients", "processes", "documents", "documentFolders", "documentVersions", "documentTemplates"],
  folha: ["employees", "payrolls", "finances", "financialPayments"],
  automacoes: ["automations", "automationRuns", "tasks", "finances"],
  relatorios: ["clients", "processes", "tasks", "deadlines", "finances", "timeRecords", "payrolls", "reportExports"],
  portal: ["clients", "processes", "documents", "messages", "pricings", "finances", "scheduledEvents"],
};

export function entitiesForPage(page: PageKey): EntityName[] {
  return Array.from(new Set([...shared, ...(modules[page] ?? [])]));
}

export function entitiesForOperation(operation: AtomicOperation): EntityName[] {
  switch (operation.type) {
    case "convertLead": return ["leads", "clients", "processes", "processMovements", "tasks", "workflowRuns", "workflowRunSteps", "auditLogs"];
    case "createLeadFollowUp": return ["leads", "tasks", "auditLogs"];
    case "setDefaultLeadSource": return ["leadSources", "auditLogs"];
    case "createProcess": case "simulateJudicialSync": case "changeProcessPhase": case "closeProcess": return ["processes", "processMovements", "processPhaseHistory", "tasks", "workflowRuns", "workflowRunSteps", "auditLogs"];
    case "startWorkflow": case "completeWorkflowStep": return ["tasks", "workflowRuns", "workflowRunSteps", "auditLogs"];
    case "saveFeeContract": return ["feeContracts", "contractInstallments", "finances", "auditLogs"];
    case "saveCostEntry": return ["costEntries", "finances", "auditLogs"];
    case "savePayroll": return ["payrolls", "finances", "auditLogs"];
    case "registerPayment": return ["finances", "financialPayments", "paymentReceipts", "auditLogs"];
    case "saveMeeting": case "cancelMeeting": return ["hearings", "scheduledEvents", "tasks", "auditLogs"];
  }
}
