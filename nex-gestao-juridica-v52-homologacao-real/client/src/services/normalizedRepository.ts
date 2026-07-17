import type { AppState, EntityName } from "@/types/app";
import { defaultState } from "@/data/defaultState";
import { isProductionSupabaseEnabled, supabase } from "./supabase";
import { getCurrentOrganizationId, getCurrentProfileRole } from "./authContext";
import {
  mapContractInstallmentFromDatabase, mapContractInstallmentToDatabase,
  mapFinanceEntryFromDatabase, mapFinanceEntryToDatabase,
  mapFinancialPaymentFromDatabase, mapFinancialPaymentToDatabase,
  mapLeadSourceFromDatabase, mapLeadSourceToDatabase,
  mapProcessMovementFromDatabase, mapProcessMovementToDatabase,
  mapProcessPhaseHistoryFromDatabase, mapProcessPhaseHistoryToDatabase,
  mapScheduledEventFromDatabase, mapScheduledEventToDatabase,
  mapWorkflowRunFromDatabase, mapWorkflowRunStepFromDatabase,
  mapWorkflowRunStepToDatabase, mapWorkflowRunToDatabase,
} from "./entityMappers.v52";

const STORAGE_KEY = "nex-gestao-juridica-normalized-v3";

const tableNames: Partial<Record<EntityName, string>> = {
  organizations: "organizations",
  units: "units",
  departments: "departments",
  teams: "teams",
  teamMembers: "team_members",
  workflowTemplates: "workflow_templates",
  workflowSteps: "workflow_steps",
  workflowRuns: "workflow_runs",
  workflowRunSteps: "workflow_run_steps",
  legalModuleRecords: "legal_module_records",
  ruralProperties: "rural_properties",
  documentFolders: "document_folders",
  documentVersions: "document_versions",
  documentTemplates: "document_templates",
  feeContracts: "fee_contracts",
  costEntries: "cost_entries",
  pointSchedules: "point_schedules",
  pointAdjustments: "point_adjustment_requests",
  pointJustifications: "point_justifications",
  notifications: "notifications",
  employees: "employees",
  clients: "clients",
  leads: "leads",
  leadSources: "crm_lead_sources",
  processes: "processes",
  processMovements: "process_movements",
  processPhaseHistory: "process_phase_history",
  deadlines: "deadlines",
  tasks: "tasks",
  finances: "financial_entries",
  contractInstallments: "contract_installments",
  financialPayments: "financial_payments",
  timeRecords: "time_records",
  documents: "documents",
  protocols: "protocols",
  signatures: "signatures",
  messages: "messages",
  automations: "automation_rules",
  automationRuns: "automation_runs",
  pricings: "pricing_proposals",
  payrolls: "payrolls",
  integrations: "integrations",
  auditLogs: "audit_logs",
  hearings: "hearings",
  scheduledEvents: "scheduled_events",
  clientConsents: "client_consents",
  paymentReceipts: "payment_receipts",
  reportExports: "report_exports",
};

function isRecoverableSupabaseReadError(error: unknown) {
  const candidate = error as { code?: string; message?: string; details?: string };
  const code = String(candidate?.code ?? "");
  const message = `${candidate?.message ?? ""} ${candidate?.details ?? ""}`.toLowerCase();
  return ["42P01", "42703", "42883", "42501", "PGRST200", "PGRST204"].includes(code)
    || message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("permission denied")
    || message.includes("function public.current_profile")
    || message.includes("function public.nex_current");
}

function describeSupabaseError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return `${candidate?.code ? candidate.code + ": " : ""}${candidate?.message ?? String(error)}`;
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

/** Estado vazio usado em produção para impedir vazamento de dados demo/local quando
 * a tabela do Supabase ainda não possui registros ou quando o RLS retorna vazio.
 * O defaultState fica restrito ao modo demo/offline.
 */
export function emptyState(): AppState {
  return {
    organizations: [], units: [], departments: [], teams: [], teamMembers: [], workflowTemplates: [], workflowSteps: [], workflowRuns: [], workflowRunSteps: [],
    legalModuleRecords: [], ruralProperties: [], documentFolders: [], documentVersions: [], documentTemplates: [],
    feeContracts: [], costEntries: [], pointSchedules: [], pointAdjustments: [], pointJustifications: [], notifications: [],
    employees: [], leads: [], leadSources: [], clients: [], processes: [], processMovements: [], processPhaseHistory: [], deadlines: [], tasks: [], finances: [], contractInstallments: [], financialPayments: [],
    timeRecords: [], documents: [], protocols: [], signatures: [], messages: [], automations: [],
    automationRuns: [], pricings: [], payrolls: [], integrations: [], hearings: [], clientConsents: [],
    scheduledEvents: [], paymentReceipts: [], reportExports: [], auditLogs: [],
  };
}

export function normalizeState(partial?: Partial<AppState> | null): AppState {
  return {
    ...cloneState(defaultState),
    ...(partial ?? {}),
    organizations: partial?.organizations ?? defaultState.organizations,
    units: partial?.units ?? defaultState.units,
    departments: partial?.departments ?? defaultState.departments,
    teams: partial?.teams ?? defaultState.teams,
    teamMembers: partial?.teamMembers ?? defaultState.teamMembers,
    workflowTemplates: partial?.workflowTemplates ?? defaultState.workflowTemplates,
    workflowSteps: partial?.workflowSteps ?? defaultState.workflowSteps,
    workflowRuns: partial?.workflowRuns ?? defaultState.workflowRuns,
    workflowRunSteps: partial?.workflowRunSteps ?? defaultState.workflowRunSteps,
    legalModuleRecords: partial?.legalModuleRecords ?? defaultState.legalModuleRecords,
    ruralProperties: partial?.ruralProperties ?? defaultState.ruralProperties,
    documentFolders: partial?.documentFolders ?? defaultState.documentFolders,
    documentVersions: partial?.documentVersions ?? defaultState.documentVersions,
    documentTemplates: partial?.documentTemplates ?? defaultState.documentTemplates,
    feeContracts: partial?.feeContracts ?? defaultState.feeContracts,
    costEntries: partial?.costEntries ?? defaultState.costEntries,
    pointSchedules: partial?.pointSchedules ?? defaultState.pointSchedules,
    pointAdjustments: partial?.pointAdjustments ?? defaultState.pointAdjustments,
    pointJustifications: partial?.pointJustifications ?? defaultState.pointJustifications,
    notifications: partial?.notifications ?? defaultState.notifications,
    employees: partial?.employees ?? defaultState.employees,
    leads: partial?.leads ?? defaultState.leads,
    leadSources: partial?.leadSources ?? defaultState.leadSources,
    clients: partial?.clients ?? defaultState.clients,
    processes: partial?.processes ?? defaultState.processes,
    processMovements: partial?.processMovements ?? defaultState.processMovements,
    processPhaseHistory: partial?.processPhaseHistory ?? defaultState.processPhaseHistory,
    deadlines: partial?.deadlines ?? defaultState.deadlines,
    tasks: partial?.tasks ?? defaultState.tasks,
    finances: partial?.finances ?? defaultState.finances,
    contractInstallments: partial?.contractInstallments ?? defaultState.contractInstallments,
    financialPayments: partial?.financialPayments ?? defaultState.financialPayments,
    timeRecords: partial?.timeRecords ?? defaultState.timeRecords,
    documents: partial?.documents ?? defaultState.documents,
    protocols: partial?.protocols ?? defaultState.protocols,
    signatures: partial?.signatures ?? defaultState.signatures,
    messages: partial?.messages ?? defaultState.messages,
    automations: partial?.automations ?? defaultState.automations,
    automationRuns: partial?.automationRuns ?? defaultState.automationRuns,
    pricings: partial?.pricings ?? defaultState.pricings,
    payrolls: partial?.payrolls ?? defaultState.payrolls,
    integrations: partial?.integrations ?? defaultState.integrations,
    hearings: partial?.hearings ?? defaultState.hearings,
    scheduledEvents: partial?.scheduledEvents ?? defaultState.scheduledEvents,
    clientConsents: partial?.clientConsents ?? defaultState.clientConsents,
    paymentReceipts: partial?.paymentReceipts ?? defaultState.paymentReceipts,
    reportExports: partial?.reportExports ?? defaultState.reportExports,
    auditLogs: partial?.auditLogs ?? defaultState.auditLogs,
  };
}

export function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return hydrateRelations(raw ? normalizeState(JSON.parse(raw) as Partial<AppState>) : cloneState(defaultState));
  } catch {
    return hydrateRelations(cloneState(defaultState));
  }
}

export function saveLocalState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resolveClientId(state: AppState, nameOrId?: string) {
  if (!nameOrId) return null;
  return state.clients.find((c) => c.id === nameOrId || c.name === nameOrId)?.id ?? null;
}
function clientId(state: AppState, name?: string) {
  return resolveClientId(state, name);
}
function clientIdForPayload(state: AppState, item: { clientId?: string; client?: string }) {
  return item.clientId ?? resolveClientId(state, item.client) ?? null;
}
function clientName(state: AppState, id?: string | null) {
  return state.clients.find((c) => c.id === id)?.name ?? "";
}
function employeeName(state: AppState, id?: string | null) {
  return state.employees.find((e) => e.id === id)?.name ?? id ?? "";
}
function capStatus(value: unknown, fallback: string) {
  const raw = String(value ?? fallback);
  return raw.replace(/^./, (m) => m.toUpperCase());
}

export function hydrateRelations(state: AppState): AppState {
  const withClient = <T extends { client?: string; clientId?: string }>(item: T): T => {
    const id = item.clientId ?? resolveClientId(state, item.client);
    const name = item.client || clientName(state, id);
    return { ...item, clientId: id ?? undefined, client: name ?? item.client } as T;
  };
  return {
    ...state,
    clients: state.clients.map((client) => ({ ...client, responsibleId: client.responsibleId ?? client.responsible })),
    processes: state.processes.map((p) => ({ ...withClient(p), responsibleId: p.responsibleId ?? p.responsible })),
    deadlines: state.deadlines.map(withClient),
    tasks: state.tasks.map(withClient),
    finances: state.finances.map(withClient),
    documents: state.documents.map(withClient),
    messages: state.messages.map(withClient),
    pricings: state.pricings.map(withClient),
    hearings: state.hearings.map(withClient),
    legalModuleRecords: state.legalModuleRecords.map(withClient),
    ruralProperties: state.ruralProperties.map((item) => ({ ...item, clientId: item.clientId ?? (item.processId ? state.processes.find((p) => p.id === item.processId)?.clientId : undefined) })),
  };
}

function mapFromSupabase(state: AppState, entity: EntityName, rows: any[]): AppState {
  const next = { ...state };
  if (entity === "organizations") next.organizations = rows.map((r) => ({
    id: r.id,
    registrationCode: r.registration_code ?? r.payload?.registrationCode ?? "",
    name: r.name ?? r.payload?.name ?? "",
    tradeName: r.trade_name ?? r.payload?.tradeName ?? "",
    document: r.document ?? r.payload?.document ?? "",
    email: r.email ?? r.payload?.email ?? "",
    phone: r.phone ?? r.payload?.phone ?? "",
    responsibleName: r.responsible_name ?? r.payload?.responsibleName ?? "",
    responsibleEmail: r.responsible_email ?? r.payload?.responsibleEmail ?? "",
    city: r.city ?? r.payload?.city ?? r.headquarters_city ?? "",
    state: r.state ?? r.payload?.state ?? "",
    address: r.address ?? r.payload?.address ?? "",
    plan: r.plan ?? r.payload?.plan ?? "Profissional",
    headquartersCity: r.headquarters_city ?? r.payload?.headquartersCity ?? "",
    status: r.access_blocked ? "Bloqueada" : (r.status ?? r.payload?.status ?? "Ativa"),
    accessBlocked: Boolean(r.access_blocked ?? r.payload?.accessBlocked),
    blockedReason: r.blocked_reason ?? r.payload?.blockedReason ?? "",
    createdBy: r.created_by ?? r.payload?.createdBy ?? undefined,
    supportMode: Boolean(r.support_mode ?? r.payload?.supportMode),
    stripeCustomerId: r.stripe_customer_id ?? r.payload?.stripeCustomerId ?? undefined,
    stripeSubscriptionId: r.stripe_subscription_id ?? r.payload?.stripeSubscriptionId ?? undefined,
    subscriptionStatus: r.subscription_status ?? r.payload?.subscriptionStatus ?? undefined,
    billingEmail: r.billing_email ?? r.payload?.billingEmail ?? undefined,
    billingMode: r.billing_mode ?? r.payload?.billingMode ?? (r.billing_exempt_forever ? "lifetime_exempt" : r.manual_trial_enabled ? "manual_trial" : "stripe"),
    manualTrialEnabled: Boolean(r.manual_trial_enabled ?? r.payload?.manualTrialEnabled),
    manualTrialStartedAt: r.manual_trial_started_at ?? r.payload?.manualTrialStartedAt ?? undefined,
    manualTrialDisabledAt: r.manual_trial_disabled_at ?? r.payload?.manualTrialDisabledAt ?? undefined,
    manualTrialDisabledBy: r.manual_trial_disabled_by ?? r.payload?.manualTrialDisabledBy ?? undefined,
    manualTrialReason: r.manual_trial_reason ?? r.payload?.manualTrialReason ?? undefined,
    billingExemptForever: Boolean(r.billing_exempt_forever ?? r.payload?.billingExemptForever),
    billingExemptReason: r.billing_exempt_reason ?? r.payload?.billingExemptReason ?? undefined,
    billingExemptGrantedAt: r.billing_exempt_granted_at ?? r.payload?.billingExemptGrantedAt ?? undefined,
    billingExemptGrantedBy: r.billing_exempt_granted_by ?? r.payload?.billingExemptGrantedBy ?? undefined,
    billingNotes: r.billing_notes ?? r.payload?.billingNotes ?? undefined,
    timezone: r.timezone ?? r.payload?.timezone ?? "America/Fortaleza",
    createdAt: String(r.created_at ?? "").slice(0, 10),
    updatedAt: String(r.updated_at ?? "").slice(0, 10),
    archivedAt: r.archived_at ?? undefined
  }));
  if (entity === "employees") next.employees = rows.map((r) => ({ id: r.id, organizationId: r.organization_id ?? undefined, name: r.name, cpf: r.cpf ?? "", pinHash: r.pin_hash ?? "", role: r.cargo ?? "Funcionário", sector: r.setor ?? "Administrativo", email: r.email ?? "", phone: r.phone ?? "", oab: r.oab ?? "", baseSalary: Number(r.salario_base ?? 0), hourlyRate: Number(r.valor_hora ?? 0), schedule: { entrada: r.jornada?.entrada ?? "08:00", saida_intervalo: r.jornada?.saida_intervalo ?? "12:00", retorno_intervalo: r.jornada?.retorno_intervalo ?? "14:00", saida_final: r.jornada?.saida_final ?? "18:00" }, mode: r.jornada?.mode ?? "Presencial", status: r.status === "ativo" ? "Ativo" : capStatus(r.status, "Ativo") as any, score: Number(r.jornada?.score ?? 100), archivedAt: r.archived_at ?? undefined }));
  if (entity === "clients") next.clients = rows.map((r) => ({ id: r.id, organizationId: r.organization_id ?? undefined, type: r.type ?? "PF", name: r.name, document: r.document ?? "", city: r.address?.city ?? r.city ?? "", origin: r.origin ?? "", status: r.status === "ativo" ? "Ativo" : capStatus(r.status, "Ativo") as any, responsible: r.responsible_id ?? "", processes: 0, lifetimeValue: 0, email: r.email ?? "", phone: r.phone ?? r.whatsapp ?? "", whatsapp: r.whatsapp ?? r.phone ?? "", address: r.address?.street ?? r.address?.full ?? "", notes: r.notes ?? "", archivedAt: r.archived_at ?? undefined }));
  if (entity === "leads") next.leads = rows.map((r) => ({ id: r.id, name: r.name, type: r.type ?? "PF", phone: r.phone ?? "", email: r.email ?? "", origin: r.origin ?? "", area: r.area ?? "", demandType: r.demand_type ?? "", stage: r.stage ?? "Novo lead", value: Number(r.estimated_value ?? 0), nextContact: r.next_contact ?? "", responsible: r.responsible_id ?? "", notes: r.notes ?? "", lossReason: r.loss_reason ?? "", lossNotes: r.loss_notes ?? "", lostAt: r.lost_at ?? undefined, lostBy: r.lost_by ?? undefined, competitor: r.competitor ?? undefined, convertedAt: r.converted_at ?? undefined, convertedBy: r.converted_by ?? undefined, conversionClientId: r.conversion_client_id ?? undefined, conversionProcessId: r.conversion_process_id ?? undefined, conversionStatus: r.conversion_status ?? undefined, conversionIdempotencyKey: r.conversion_idempotency_key ?? undefined, document: r.document ?? "", consentAccepted: Boolean(r.consent_accepted), checklist: r.checklist ?? [], version: Number(r.version ?? 0), archivedAt: r.archived_at ?? undefined }));
  if (entity === "processes") next.processes = rows.map((r) => ({ id: r.id, organizationId: r.organization_id ?? undefined, unitId: r.unit_id ?? undefined, departmentId: r.department_id ?? undefined, teamId: r.team_id ?? undefined, cnj: r.cnj ?? "", type: capStatus(r.type, "Judicial") as any, clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "Cliente", opposite: r.opposite_party ?? "", activePole: r.active_pole ?? "", passivePole: r.passive_pole ?? "", subject: r.subject ?? "", area: r.area ?? "", court: r.court ?? "", courtDivision: r.court_division ?? "", district: r.district ?? "", state: r.state ?? "", class: r.class_processual ?? "", administrativeBody: r.administrative_body ?? "", protocolNumber: r.protocol_number ?? "", procedureType: r.procedure_type ?? "", requirements: r.requirements ?? "", decisions: r.decisions ?? "", appeals: r.appeals ?? "", agreements: r.agreements ?? "", meetings: r.meetings ?? "", notices: r.notices ?? "", contracts: r.contracts ?? "", phase: r.phase ?? "", status: r.status ?? "", risk: r.risk ?? "Médio", successChance: Number(r.success_chance ?? 0), value: Number(r.claim_value ?? 0), fees: Number(r.fees_value ?? 0), costs: Number(r.costs_value ?? 0), responsible: r.responsible_id ?? "", responsibleId: r.responsible_id ?? undefined, auxiliaryLawyers: r.auxiliary_lawyers ?? [], nextDeadline: r.expected_end_at ?? "", lastMoveDays: Number(r.last_move_days ?? 0), progress: Number(r.progress ?? 0), clientVisibleSummary: r.client_visible_summary ?? "", internalStrategy: r.internal_strategy ?? "", timeline: r.timeline ?? [], annotations: r.annotations ?? "", checklist: r.checklist ?? [], closedAt: r.closed_at ?? undefined, notes: r.notes ?? "", source: r.source ?? "", tags: r.tags ?? [], teamIds: r.team_ids ?? [], openedAt: r.opened_at ?? undefined, version: Number(r.version ?? 0), archivedAt: r.archived_at ?? undefined }));
  if (entity === "deadlines") next.deadlines = rows.map((r) => ({ id: r.id, processId: r.process_id ?? "", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", responsible: r.responsible_id ?? "", type: r.type ?? "Prazo", publicationDate: r.publication_date ?? "", awarenessDate: r.awareness_date ?? "", startDate: r.start_date ?? "", days: Number(r.days ?? 0), countType: r.count_type ?? "Dias úteis", dueDate: r.due_date ?? "", fatal: Boolean(r.fatal), priority: r.priority ?? "Média", status: capStatus(r.status, "Pendente") as any, proof: r.proof ?? "", notes: r.notes ?? "", archivedAt: r.archived_at ?? undefined }));
  if (entity === "tasks") next.tasks = rows.map((r) => ({ id: r.id, title: r.title, description: r.description ?? "", processId: r.process_id ?? "", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", responsible: r.responsible_id ?? "", delegatedBy: r.delegated_by ?? undefined, reviewer: r.reviewer_id ?? undefined, workflowStage: r.workflow_stage ?? undefined, sector: r.sector ?? "", priority: r.priority ?? "Média", status: r.status ?? "Pendente", due: String(r.due_at ?? "").slice(0, 10), estimatedHours: Number(r.estimated_hours ?? 0), spentHours: Number(r.spent_hours ?? 0), slaHours: Number(r.sla_hours ?? 0), qualityScore: Number(r.quality_score ?? 0), startedAt: String(r.started_at ?? "").slice(0, 10) || undefined, completedAt: String(r.completed_at ?? "").slice(0, 10) || undefined, checklist: r.checklist ?? [], checklistCompleted: r.checklist_completed ?? [], comments: r.comments ?? [], blockers: r.blockers ?? [], workflowRunId: r.workflow_run_id ?? undefined, workflowRunStepId: r.workflow_run_step_id ?? undefined, meetingId: r.meeting_id ?? undefined, estimatedMinutes: Number(r.estimated_minutes ?? Number(r.estimated_hours ?? 0) * 60), workedMinutes: Number(r.worked_minutes ?? Number(r.spent_hours ?? 0) * 60), billableMinutes: Number(r.billable_minutes ?? 0), version: Number(r.version ?? 0), archivedAt: r.archived_at ?? undefined }));
  if (entity === "finances") next.finances = rows.map((r) => mapFinanceEntryFromDatabase(r, clientName(state, r.client_id) || r.client_name || "Escritório"));
  if (entity === "timeRecords") next.timeRecords = rows.map((r) => ({ id: r.id, employeeId: r.employee_id, employeeName: employeeName(state, r.employee_id), sector: state.employees.find((e) => e.id === r.employee_id)?.sector ?? "", kind: r.kind, date: r.record_date, time: r.record_time?.slice(0, 5) ?? "", status: r.status ?? "normal", mode: r.mode === "remoto" ? "Remoto" : "Presencial", location: typeof r.location === "object" ? r.location?.label ?? "" : String(r.location ?? ""), device: r.device ?? "", justification: r.justification ?? undefined, approvedBy: r.approved_by ?? undefined, archivedAt: r.archived_at ?? undefined }));
  if (entity === "documents") next.documents = rows.map((r) => ({ id: r.id, name: r.name, type: r.type ?? "Documento", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", processId: r.process_id ?? "", status: capStatus(r.status, "Recebido") as any, origin: r.origin ?? "Upload", responsible: r.responsible_id ?? "", version: r.version ?? "v1", createdAt: String(r.created_at ?? "").slice(0, 10), fileName: r.file_name ?? undefined, mimeType: r.mime_type ?? undefined, sizeBytes: r.file_size_bytes ?? undefined, storagePath: r.storage_path ?? undefined, hash: r.sha256_hash ?? undefined, rejectionComment: r.rejection_comment ?? undefined, archivedAt: r.archived_at ?? undefined }));
  if (entity === "messages") next.messages = rows.map((r) => ({ id: r.id, channel: r.channel ?? "Chat", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", processId: r.process_id ?? "", subject: r.subject ?? r.body ?? "", body: r.body ?? "", status: capStatus(r.status, "Pendente") as any, date: String(r.scheduled_at ?? r.sent_at ?? r.created_at ?? "").slice(0, 10), senderId: r.sender_id ?? undefined, senderName: r.sender_name ?? undefined, senderRole: r.sender_role ?? undefined, responsibleId: r.responsible_id ?? undefined, direction: r.direction ?? undefined, readAt: String(r.read_at ?? "").slice(0, 10) || undefined, answeredAt: String(r.answered_at ?? "").slice(0, 10) || undefined, archivedAt: r.archived_at ?? undefined }));
  if (entity === "automations") next.automations = rows.map((r) => ({ id: r.id, name: r.name, description: r.description ?? "", module: r.module, trigger: r.trigger_event, conditions: Array.isArray(r.conditions) ? r.conditions : Object.entries(r.conditions ?? {}).map(([k, v]) => `${k}: ${v}`), actions: r.actions ?? [], status: r.status === "pausada" ? "Pausada" : r.status === "rascunho" ? "Rascunho" : "Ativa", recurrence: r.recurrence ?? "Evento", lastRun: String(r.last_run_at ?? "").slice(0, 10), nextRun: String(r.next_run_at ?? "").slice(0, 10), executions: Number(r.executions ?? 0), failures: Number(r.failures ?? 0), successRate: Number(r.success_rate ?? 100), responsible: r.responsible_id ?? "", archivedAt: r.archived_at ?? undefined }));
  if (entity === "automationRuns") next.automationRuns = rows.map((r) => ({ id: r.id, ruleId: r.automation_rule_id, ruleName: state.automations.find((a) => a.id === r.automation_rule_id)?.name ?? "Automação", result: r.result ?? "", date: String(r.executed_at ?? "").slice(0, 10), status: r.status === "erro" ? "Erro" : r.status === "atenção" ? "Atenção" : "Sucesso", details: JSON.stringify(r.output_payload ?? {}), archivedAt: r.archived_at ?? undefined }));
  if (entity === "pricings") next.pricings = rows.map((r) => ({ id: r.id, title: r.title ?? r.service_type ?? "Proposta", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", processId: r.process_id ?? undefined, area: r.area ?? "", service: r.service_type ?? "", minimum: Number(r.minimum_value ?? 0), recommended: Number(r.recommended_value ?? 0), premium: Number(r.premium_value ?? 0), entry: Number(r.entry_value ?? 0), successFee: Number(r.legal_factors?.honorario_exito ?? r.success_fee ?? 0), status: capStatus(r.status, "Rascunho") as any, createdAt: String(r.created_at ?? "").slice(0, 10), version: r.version ?? "v1", oabState: r.oab_state ?? "MA", oabYear: Number(r.oab_year ?? new Date().getFullYear()), archivedAt: r.archived_at ?? undefined }));
  if (entity === "payrolls") next.payrolls = rows.map((r) => ({ id: r.id, employeeId: r.employee_id, employeeName: employeeName(state, r.employee_id), month: Number(r.period_month ?? 1), year: Number(r.period_year ?? new Date().getFullYear()), baseSalary: Number(r.base_salary ?? r.details?.baseSalary ?? 0), workedHours: Number(r.details?.workedHours ?? 0), overtime: Number(r.details?.overtime ?? 0), absences: Number(r.details?.absences ?? 0), delays: Number(r.details?.delays ?? 0), benefits: Number(r.benefits ?? 0), discounts: Number(r.discounts ?? 0), commissions: Number(r.details?.commissions ?? 0), gross: Number(r.gross_value ?? 0), net: Number(r.net_value ?? 0), status: capStatus(r.status, "Rascunho") as any, archivedAt: r.archived_at ?? undefined }));
  if (entity === "integrations") next.integrations = rows.map((r) => ({ id: r.id, provider: r.provider ?? "Outro", status: capStatus(r.status, "Preparado") as any, description: r.description ?? r.config?.description ?? "Integração preparada.", requiresBackend: Boolean(r.config?.requiresBackend ?? true), lastSync: String(r.last_sync_at ?? "").slice(0, 10), archivedAt: r.archived_at ?? undefined }));
  if (entity === "auditLogs") next.auditLogs = rows.map((r) => ({ id: r.id, module: r.module ?? "Sistema", action: r.action ?? "audit", entityId: r.entity_id ?? undefined, user: r.user_id ?? "Sistema", date: String(r.created_at ?? "").slice(0, 10), detail: JSON.stringify(r.after_data ?? r.before_data ?? {}) }));
  if (entity === "hearings") next.hearings = rows.map((r) => ({ id: r.id, processId: r.process_id ?? "", clientId: r.client_id ?? undefined, client: clientName(state, r.client_id) || r.client_name || "", title: r.title, hearingAt: r.hearing_at ?? "", type: r.type ?? "", location: r.location ?? "", link: r.link ?? "", responsible: r.responsible_id ?? "", checklist: r.checklist ?? [], status: capStatus(r.status, "Agendada") as any, durationMinutes: Number(r.duration_minutes ?? 60), timezone: r.timezone ?? state.organizations[0]?.timezone ?? "America/Fortaleza", recurrenceRule: r.recurrence_rule ?? undefined, recurrenceSeriesId: r.recurrence_series_id ?? undefined, archivedAt: r.archived_at ?? undefined }));
  if (entity === "leadSources") next.leadSources = rows.map(mapLeadSourceFromDatabase);
  if (entity === "scheduledEvents") next.scheduledEvents = rows.map(mapScheduledEventFromDatabase);
  if (entity === "clientConsents") next.clientConsents = rows.map((r) => ({ id: r.id, clientId: r.client_id, consentType: r.consent_type, legalBasis: r.legal_basis ?? "", accepted: Boolean(r.accepted), acceptedAt: r.accepted_at ?? undefined, revokedAt: r.revoked_at ?? undefined, archivedAt: r.archived_at ?? undefined }));
  if (entity === "paymentReceipts") next.paymentReceipts = rows.map((r) => ({ id: r.id, financeId: r.financial_entry_id, receiptNumber: r.receipt_number, amount: Number(r.amount ?? 0), issuedAt: r.issued_at ?? "", issuedBy: r.issued_by ?? undefined, status: r.status ?? "issued", cancelledAt: r.cancelled_at ?? undefined, cancellationReason: r.cancellation_reason ?? undefined, reversedBy: r.reversed_by ?? undefined }));
  if (entity === "reportExports") next.reportExports = rows.map((r) => ({ id: r.id, reportName: r.report_name, filters: r.filters ?? {}, format: String(r.format ?? "PDF").toUpperCase() as any, exportedAt: r.exported_at ?? "" }));
  if (entity === "workflowRuns") next.workflowRuns = rows.map(mapWorkflowRunFromDatabase);
  if (entity === "workflowRunSteps") next.workflowRunSteps = rows.map(mapWorkflowRunStepFromDatabase);
  if (entity === "processMovements") next.processMovements = rows.map(mapProcessMovementFromDatabase);
  if (entity === "processPhaseHistory") next.processPhaseHistory = rows.map(mapProcessPhaseHistoryFromDatabase);
  if (entity === "contractInstallments") next.contractInstallments = rows.map(mapContractInstallmentFromDatabase);
  if (entity === "financialPayments") next.financialPayments = rows.map(mapFinancialPaymentFromDatabase);
  if (["units", "departments", "teams", "teamMembers", "workflowTemplates", "workflowSteps", "legalModuleRecords", "ruralProperties", "documentFolders", "documentVersions", "documentTemplates", "feeContracts", "costEntries", "pointSchedules", "pointAdjustments", "pointJustifications", "notifications"].includes(entity)) {
    (next as any)[entity] = rows.map((r) => ({ ...(r.payload ?? r), id: r.id, archivedAt: r.archived_at ?? r.archivedAt ?? undefined }));
  }

  return hydrateRelations(next);
}

export async function loadNormalizedState(entities?: EntityName[], baseState?: AppState): Promise<AppState> {
  const local = loadLocalState();
  if (!supabase) return local;
  const client = supabase;

  // Produção: Supabase/RLS é a fonte principal. As entidades são consultadas em
  // paralelo e cada tabela é paginada para evitar o antigo corte silencioso de 700 linhas.
  const canonicalOrder: EntityName[] = ["organizations", "units", "departments", "teams", "teamMembers", "employees", "clients", "leads", "leadSources", "processes", "processMovements", "processPhaseHistory", "workflowTemplates", "workflowSteps", "workflowRuns", "workflowRunSteps", "legalModuleRecords", "ruralProperties", "deadlines", "tasks", "finances", "contractInstallments", "financialPayments", "feeContracts", "costEntries", "documents", "documentFolders", "documentVersions", "documentTemplates", "messages", "automations", "automationRuns", "timeRecords", "pointSchedules", "pointAdjustments", "pointJustifications", "notifications", "pricings", "payrolls", "integrations", "hearings", "scheduledEvents", "clientConsents", "paymentReceipts", "reportExports", "auditLogs"];
  const requested = new Set(entities?.length ? entities : canonicalOrder);
  const order = canonicalOrder.filter((entity) => requested.has(entity));
  const organizationId = getCurrentOrganizationId();
  const role = getCurrentProfileRole();
  const globalMaster = ["admin_master", "admin_master_global"].includes(String(role).toLowerCase());
  const pageSize = 250;
  const maxPages = 2; // no máximo 500 linhas por entidade no carregamento inicial do módulo

  async function fetchRows(entity: EntityName) {
    const table = tableNames[entity];
    if (!table) return { entity, rows: [] as Record<string, unknown>[] };
    const rows: Record<string, unknown>[] = [];
    for (let page = 0; page < maxPages; page += 1) {
      const from = page * pageSize;
      let query = client.from(table).select("*").range(from, from + pageSize - 1);
      if (organizationId && !globalMaster && !["organizations", "automation_runs"].includes(table)) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) {
        if (isRecoverableSupabaseReadError(error)) {
          console.warn(`[Nex] Leitura Supabase indisponível para ${table}: ${describeSupabaseError(error)}.`);
          return { entity, rows: [] as Record<string, unknown>[] };
        }
        throw error;
      }
      const batch = (data ?? []) as Record<string, unknown>[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      if (page === maxPages - 1) console.warn(`[Nex] ${table} atingiu o limite inicial de ${pageSize * maxPages} registros. Use paginação server-side para continuar.`);
    }
    return { entity, rows };
  }

  const fetched = await Promise.all(order.map(fetchRows));
  const byEntity = new Map(fetched.map((result) => [result.entity, result.rows]));
  let next = baseState ? cloneState(baseState) : emptyState();
  for (const entity of order) next = mapFromSupabase(next, entity, byEntity.get(entity) ?? []);
  return next;
}

function toRemotePayload(entity: EntityName, item: any, state: AppState) {
  const orgId = item.organizationId ?? getCurrentOrganizationId();
  if (!orgId && entity !== "organizations") throw new Error("Perfil sem organização carregada. Faça login novamente antes de salvar no Supabase.");
  const base = { id: item.id, organization_id: orgId, archived_at: item.archivedAt ?? null } as Record<string, unknown>;
  if (entity === "organizations") return {
    id: item.id,
    registration_code: item.registrationCode,
    name: item.name,
    trade_name: item.tradeName ?? item.name,
    document: item.document ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    responsible_name: item.responsibleName ?? "",
    responsible_email: item.responsibleEmail ?? "",
    city: item.city ?? "",
    state: item.state ?? "",
    address: item.address ?? "",
    plan: item.plan ?? "Profissional",
    status: item.status ?? "Ativa",
    access_blocked: Boolean(item.accessBlocked),
    blocked_reason: item.blockedReason ?? "",
    created_by: item.createdBy ?? null,
    stripe_customer_id: item.stripeCustomerId ?? null,
    stripe_subscription_id: item.stripeSubscriptionId ?? null,
    subscription_status: item.subscriptionStatus ?? (item.billingExemptForever ? "exempt_forever" : item.manualTrialEnabled ? "manual_trial" : null),
    billing_email: item.billingEmail ?? item.email ?? null,
    billing_mode: item.billingMode ?? (item.billingExemptForever ? "lifetime_exempt" : item.manualTrialEnabled ? "manual_trial" : "stripe"),
    manual_trial_enabled: Boolean(item.manualTrialEnabled),
    manual_trial_started_at: item.manualTrialStartedAt ?? null,
    manual_trial_disabled_at: item.manualTrialDisabledAt ?? null,
    manual_trial_disabled_by: item.manualTrialDisabledBy ?? null,
    manual_trial_reason: item.manualTrialReason ?? null,
    billing_exempt_forever: Boolean(item.billingExemptForever),
    billing_exempt_reason: item.billingExemptReason ?? null,
    billing_exempt_granted_at: item.billingExemptGrantedAt ?? null,
    billing_exempt_granted_by: item.billingExemptGrantedBy ?? null,
    billing_notes: item.billingNotes ?? null,
    timezone: item.timezone ?? "America/Fortaleza",
    payload: item,
    archived_at: item.archivedAt ?? null
  };
  if (entity === "employees") return { ...base, name: item.name, cpf: item.cpf, cargo: item.role, setor: item.sector, email: item.email ?? null, phone: item.phone ?? null, salario_base: item.baseSalary, valor_hora: item.hourlyRate, jornada: { ...item.schedule, mode: item.mode, score: item.score }, pin_hash: item.pinHash, status: String(item.status).toLowerCase() };
  if (entity === "clients") return { ...base, type: item.type, name: item.name, document: item.document, email: item.email, phone: item.phone, whatsapp: item.whatsapp ?? item.phone, address: { city: item.city, street: item.address }, origin: item.origin, status: String(item.status).toLowerCase(), notes: item.notes ?? "" };
  if (entity === "leads") return { ...base, name: item.name, type: item.type ?? "PF", phone: item.phone, email: item.email, origin: item.origin, area: item.area, demand_type: item.demandType, stage: item.stage, estimated_value: item.value, next_contact: item.nextContact || null, notes: item.notes ?? "", loss_reason: item.lossReason ?? "", loss_notes: item.lossNotes ?? "", lost_at: item.lostAt ?? null, lost_by: item.lostBy ?? null, competitor: item.competitor ?? null, converted_at: item.convertedAt ?? null, converted_by: item.convertedBy ?? null, conversion_client_id: item.conversionClientId ?? null, conversion_process_id: item.conversionProcessId ?? null, conversion_status: item.conversionStatus ?? null, conversion_idempotency_key: item.conversionIdempotencyKey ?? null, document: item.document ?? "", consent_accepted: Boolean(item.consentAccepted), checklist: item.checklist ?? [], version: item.version ?? 0 };
  if (entity === "processes") return { ...base, unit_id: item.unitId ?? null, department_id: item.departmentId ?? null, team_id: item.teamId ?? null, client_id: clientIdForPayload(state, item), cnj: item.cnj, court: item.court, court_division: item.courtDivision ?? "", district: item.district ?? "", state: item.state ?? "", class_processual: item.class, subject: item.subject ?? "", area: item.area, type: String(item.type ?? "judicial").toLowerCase(), opposite_party: item.opposite, active_pole: item.activePole ?? "", passive_pole: item.passivePole ?? "", administrative_body: item.administrativeBody ?? "", protocol_number: item.protocolNumber ?? "", procedure_type: item.procedureType ?? "", requirements: item.requirements ?? "", decisions: item.decisions ?? "", appeals: item.appeals ?? "", agreements: item.agreements ?? "", meetings: item.meetings ?? "", notices: item.notices ?? "", contracts: item.contracts ?? "", phase: item.phase, status: item.status, risk: item.risk, success_chance: item.successChance, claim_value: item.value, fees_value: item.fees, costs_value: item.costs ?? 0, expected_end_at: item.nextDeadline || null, responsible_id: item.responsible || null, auxiliary_lawyers: item.auxiliaryLawyers ?? [], client_visible_summary: item.clientVisibleSummary ?? "", internal_strategy: item.internalStrategy ?? "", timeline: item.timeline ?? [], annotations: item.annotations ?? "", checklist: item.checklist ?? [], closed_at: item.closedAt ?? null, notes: item.notes ?? "", source: item.source ?? "", tags: item.tags ?? [], team_ids: item.teamIds ?? [], opened_at: item.openedAt ?? null, last_move_days: item.lastMoveDays ?? 0, progress: item.progress ?? 0, version: item.version ?? 0 };
  if (entity === "deadlines") return { ...base, process_id: item.processId || null, client_id: clientIdForPayload(state, item), type: item.type, responsible_id: item.responsible || null, publication_date: item.publicationDate || null, awareness_date: item.awarenessDate || null, start_date: item.startDate || null, days: item.days, count_type: item.countType, due_date: item.dueDate || null, fatal: item.fatal, priority: item.priority, status: String(item.status).toLowerCase(), proof: item.proof ?? "", notes: item.notes ?? "" };
  if (entity === "tasks") return { ...base, process_id: item.processId || null, client_id: clientIdForPayload(state, item), title: item.title, description: item.description ?? "", responsible_id: item.responsible || null, delegated_by: item.delegatedBy || null, reviewer_id: item.reviewer || null, workflow_stage: item.workflowStage ?? null, sector: item.sector, priority: item.priority, status: item.status, due_at: item.due ? new Date(`${item.due}T12:00:00`).toISOString() : null, estimated_hours: item.estimatedHours, spent_hours: item.spentHours, started_at: item.startedAt ? new Date(`${item.startedAt}T12:00:00`).toISOString() : null, completed_at: item.completedAt ? new Date(`${item.completedAt}T12:00:00`).toISOString() : null, sla_hours: item.slaHours ?? 24, quality_score: item.qualityScore ?? null, blockers: item.blockers ?? [], checklist: item.checklist ?? [], comments: item.comments ?? [], checklist_completed: item.checklistCompleted ?? [], workflow_run_id: item.workflowRunId ?? null, workflow_run_step_id: item.workflowRunStepId ?? null, meeting_id: item.meetingId ?? null, estimated_minutes: item.estimatedMinutes ?? Math.round((item.estimatedHours ?? 0) * 60), worked_minutes: item.workedMinutes ?? Math.round((item.spentHours ?? 0) * 60), billable_minutes: item.billableMinutes ?? 0, version: item.version ?? 0 };
  if (entity === "finances") return mapFinanceEntryToDatabase(item, orgId, clientIdForPayload(state, item));
  if (entity === "timeRecords") return { ...base, employee_id: item.employeeId, record_date: item.date, record_time: item.time, kind: item.kind, status: item.status, mode: item.mode.toLowerCase(), location: { label: item.location }, device: item.device, justification: item.justification ?? null, approved_by: item.approvedBy ?? null };
  if (entity === "documents") return { ...base, client_id: clientIdForPayload(state, item), process_id: item.processId || null, name: item.name, type: item.type, status: item.status, origin: item.origin, version: item.version, responsible_id: item.responsible || null, file_name: item.fileName ?? null, mime_type: item.mimeType ?? null, file_size_bytes: item.sizeBytes ?? null, storage_path: item.storagePath ?? null, sha256_hash: item.hash ?? null, rejection_comment: item.rejectionComment ?? "", scanner_metadata: { source: item.origin } };
  if (entity === "messages") return { ...base, client_id: clientIdForPayload(state, item), process_id: item.processId || null, channel: item.channel, subject: item.subject, body: item.body ?? item.subject, status: String(item.status).toLowerCase(), scheduled_at: item.date ? new Date(`${item.date}T12:00:00`).toISOString() : null, sender_id: item.senderId || null, sender_name: item.senderName ?? null, sender_role: item.senderRole ?? null, responsible_id: item.responsibleId || null, direction: item.direction ?? null, read_at: item.readAt ? new Date(`${item.readAt}T12:00:00`).toISOString() : null, answered_at: item.answeredAt ? new Date(`${item.answeredAt}T12:00:00`).toISOString() : null };
  if (entity === "automations") return { ...base, name: item.name, description: item.description ?? "", module: item.module, trigger_event: item.trigger, conditions: item.conditions ?? {}, actions: item.actions, status: item.status.toLowerCase(), recurrence: item.recurrence ?? "Evento", last_run_at: item.lastRun ? new Date(`${item.lastRun}T12:00:00`).toISOString() : null, next_run_at: item.nextRun ? new Date(`${item.nextRun}T12:00:00`).toISOString() : null, executions: item.executions, failures: item.failures ?? 0, success_rate: item.successRate, responsible_id: item.responsible || null };
  if (entity === "automationRuns") return { ...base, automation_rule_id: item.ruleId, status: item.status.toLowerCase(), result: item.result, output_payload: { details: item.details ?? "" }, executed_at: item.date ? new Date(`${item.date}T12:00:00`).toISOString() : new Date().toISOString() };
  if (entity === "pricings") return { ...base, title: item.title, client_id: clientIdForPayload(state, item), process_id: item.processId || null, area: item.area, service_type: item.service, real_cost: item.minimum, minimum_value: item.minimum, recommended_value: item.recommended, premium_value: item.premium, entry_value: item.entry, legal_factors: { honorario_exito: item.successFee }, status: item.status.toLowerCase(), version: item.version ?? "v1", oab_state: item.oabState ?? "MA", oab_year: item.oabYear ?? new Date().getFullYear() };
  if (entity === "payrolls") return { ...base, employee_id: item.employeeId, period_month: item.month, period_year: item.year, base_salary: item.baseSalary, gross_value: item.gross, discounts: item.discounts, benefits: item.benefits, net_value: item.net, status: item.status.toLowerCase(), details: { workedHours: item.workedHours, overtime: item.overtime, absences: item.absences, delays: item.delays, commissions: item.commissions } };
  if (entity === "integrations") return { ...base, provider: item.provider, status: item.status.toLowerCase(), description: item.description, config: { requiresBackend: item.requiresBackend }, last_sync_at: item.lastSync ? new Date(`${item.lastSync}T12:00:00`).toISOString() : null };
  if (entity === "auditLogs") return { id: item.id, organization_id: orgId, module: item.module, action: item.action, entity_id: item.entityId, after_data: { detail: item.detail, user: item.user }, created_at: item.date ? new Date(`${item.date}T12:00:00`).toISOString() : new Date().toISOString() };
  if (entity === "leadSources") return mapLeadSourceToDatabase(item, orgId);
  if (entity === "scheduledEvents") return mapScheduledEventToDatabase(item, orgId);
  if (entity === "hearings") return { ...base, process_id: item.processId || null, client_id: item.clientId ?? clientId(state, item.client), title: item.title, hearing_at: item.hearingAt, type: item.type ?? "", location: item.location ?? "", link: item.link ?? "", responsible_id: item.responsible || null, checklist: item.checklist ?? [], status: String(item.status).toLowerCase(), duration_minutes: item.durationMinutes ?? 60, timezone: item.timezone ?? state.organizations[0]?.timezone ?? "America/Fortaleza", recurrence_rule: item.recurrenceRule ?? null, recurrence_series_id: item.recurrenceSeriesId ?? null };
  if (entity === "clientConsents") return { ...base, client_id: item.clientId, consent_type: item.consentType, legal_basis: item.legalBasis ?? "", accepted: item.accepted, accepted_at: item.acceptedAt ?? null, revoked_at: item.revokedAt ?? null };
  if (entity === "paymentReceipts") return { ...base, financial_entry_id: item.financeId, receipt_number: item.receiptNumber, amount: item.amount, issued_at: item.issuedAt, issued_by: item.issuedBy ?? null, status: item.status ?? "issued", cancelled_at: item.cancelledAt ?? null, cancellation_reason: item.cancellationReason ?? null, reversed_by: item.reversedBy ?? null, payload: item };
  if (entity === "reportExports") return { ...base, report_name: item.reportName, filters: item.filters ?? {}, format: item.format, exported_at: item.exportedAt };
  if (entity === "workflowRuns") return mapWorkflowRunToDatabase(item, orgId);
  if (entity === "workflowRunSteps") return mapWorkflowRunStepToDatabase(item, orgId);
  if (entity === "processMovements") return mapProcessMovementToDatabase(item, orgId);
  if (entity === "processPhaseHistory") return mapProcessPhaseHistoryToDatabase(item, orgId);
  if (entity === "contractInstallments") return mapContractInstallmentToDatabase(item, orgId);
  if (entity === "financialPayments") return mapFinancialPaymentToDatabase(item, orgId);
  if (["units", "departments", "teams", "teamMembers", "workflowTemplates", "workflowSteps", "legalModuleRecords", "ruralProperties", "documentFolders", "documentVersions", "documentTemplates", "feeContracts", "costEntries", "pointSchedules", "pointAdjustments", "pointJustifications", "notifications"].includes(entity)) return { ...base, payload: item };

  return { ...base, ...item };
}

export async function persistEntity<K extends EntityName>(entity: K, item: AppState[K][number], state: AppState) {
  const table = tableNames[entity];
  if (!table) return;
  if (!supabase) {
    if (isProductionSupabaseEnabled()) throw new Error("Supabase indisponível para persistência.");
    return;
  }
  const payload = toRemotePayload(entity, item, state);
  const { error } = await supabase.from(table).upsert(payload as never);
  if (error) throw error;

  // Equipe v4.0: ao criar/editar colaborador com e-mail, deixa users_profiles pronto
  // para vincular automaticamente quando o funcionário criar o primeiro acesso.
  if (entity === "employees" && (item as any).email) {
    const { error: profileError } = await supabase.rpc("upsert_staff_profile_from_employee", {
      p_employee_id: (item as any).id,
      p_name: (item as any).name,
      p_email: (item as any).email,
      p_role: (item as any).role,
      p_sector: (item as any).sector,
      p_phone: (item as any).phone ?? null,
      p_oab: (item as any).oab ?? null,
    });
    if (profileError) throw profileError;
  }
}

export async function deleteEntityRemote(entity: EntityName, id: string) {
  const table = tableNames[entity];
  if (!supabase || !table) return;
  const { error } = await supabase.from(table).update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function uploadDocumentToStorage(documentId: string, dataUrl: string, clientId?: string, processId?: string) {
  if (!supabase) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const digest = Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const safeClient = clientId || "sem-cliente";
  const safeProcess = processId || "sem-processo";
  const path = `${getCurrentOrganizationId()}/${safeClient}/${safeProcess}/${documentId}-${digest}.jpg`;
  const { error } = await supabase.storage.from("documentos").upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
  if (error) throw error;
  return path;
}

export function getEmployeeName(state: AppState, id?: string) {
  return employeeName(state, id);
}
