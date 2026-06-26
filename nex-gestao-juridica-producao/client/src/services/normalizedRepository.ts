import type { AppState, EntityName } from "@/types/app";
import { defaultState } from "@/data/defaultState";
import { supabase } from "./supabase";

const STORAGE_KEY = "nex-gestao-juridica-normalized-v1";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export function normalizeState(partial?: Partial<AppState> | null): AppState {
  return {
    ...cloneState(defaultState),
    ...(partial ?? {}),
    employees: partial?.employees ?? defaultState.employees,
    leads: partial?.leads ?? defaultState.leads,
    clients: partial?.clients ?? defaultState.clients,
    processes: partial?.processes ?? defaultState.processes,
    tasks: partial?.tasks ?? defaultState.tasks,
    finances: partial?.finances ?? defaultState.finances,
    timeRecords: partial?.timeRecords ?? defaultState.timeRecords,
    documents: partial?.documents ?? defaultState.documents,
    protocols: partial?.protocols ?? defaultState.protocols,
    signatures: partial?.signatures ?? defaultState.signatures,
    messages: partial?.messages ?? defaultState.messages,
    automations: partial?.automations ?? defaultState.automations,
    automationRuns: partial?.automationRuns ?? defaultState.automationRuns,
    pricings: partial?.pricings ?? defaultState.pricings,
  };
}

export function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as Partial<AppState>) : cloneState(defaultState);
  } catch {
    return cloneState(defaultState);
  }
}

export function saveLocalState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function employeeName(state: AppState, id?: string) {
  return state.employees.find((e) => e.id === id)?.name ?? id ?? "";
}

function clientId(state: AppState, name?: string) {
  return state.clients.find((c) => c.name === name)?.id ?? null;
}

function mapFromSupabase(state: AppState, table: EntityName, rows: any[]): AppState {
  const next = { ...state };
  if (table === "clients") {
    next.clients = rows.map((r) => ({ id: r.id, type: r.type ?? "PF", name: r.name, document: r.document ?? "", city: r.address?.city ?? "", origin: r.origin ?? "", status: r.status === "ativo" ? "Ativo" : r.status ?? "Ativo", responsible: r.responsible_id ?? "", processes: 0, lifetimeValue: 0, email: r.email ?? "", phone: r.phone ?? r.whatsapp ?? "", address: r.address?.street ?? "" }));
  }
  if (table === "leads") {
    next.leads = rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone ?? "", origin: r.origin ?? "", area: r.area ?? "", stage: r.stage ?? "Novo lead", value: Number(r.estimated_value ?? 0), nextContact: r.next_contact ?? "", responsible: r.responsible_id ?? "" }));
  }
  if (table === "processes") {
    next.processes = rows.map((r) => ({ id: r.id, cnj: r.cnj ?? "", client: state.clients.find((c) => c.id === r.client_id)?.name ?? "Cliente", opposite: r.opposite_party ?? "", area: r.area ?? "", court: r.court ?? "", class: r.class_processual ?? "", phase: r.phase ?? "", status: r.status ?? "", risk: r.risk ?? "Médio", successChance: Number(r.success_chance ?? 0), value: Number(r.claim_value ?? 0), fees: Number(r.fees_value ?? 0), responsible: r.responsible_id ?? "", nextDeadline: r.expected_end_at ?? "", lastMoveDays: 0, progress: 30 }));
  }
  if (table === "tasks") {
    next.tasks = rows.map((r) => ({ id: r.id, title: r.title, processId: r.process_id ?? "", client: state.clients.find((c) => c.id === r.client_id)?.name ?? "", responsible: r.responsible_id ?? "", sector: r.sector ?? "", priority: r.priority ?? "Média", status: r.status ?? "Pendente", due: String(r.due_at ?? "").slice(0, 10), estimatedHours: Number(r.estimated_hours ?? 0), spentHours: Number(r.spent_hours ?? 0), checklist: r.checklist ?? [] }));
  }
  if (table === "finances") {
    next.finances = rows.map((r) => ({ id: r.id, type: r.type === "despesa" ? "Despesa" : "Receita", category: r.category ?? "", client: state.clients.find((c) => c.id === r.client_id)?.name ?? "Escritório", processId: r.process_id ?? undefined, amount: Number(r.amount ?? 0), dueDate: r.due_date ?? "", paidDate: r.paid_date ?? undefined, status: r.status ? String(r.status).replace(/^./, (m) => m.toUpperCase()) as any : "Pendente", method: r.method ?? "PIX", notes: r.notes ?? "" }));
  }
  if (table === "documents") {
    next.documents = rows.map((r) => ({ id: r.id, name: r.name, type: r.type ?? "Documento", client: state.clients.find((c) => c.id === r.client_id)?.name ?? "", processId: r.process_id ?? "", status: r.status ?? "Recebido", origin: r.origin ?? "Upload", responsible: r.responsible_id ?? "", version: r.version ?? "v1", createdAt: String(r.created_at ?? "").slice(0, 10), fileName: r.file_name ?? undefined, mimeType: r.mime_type ?? undefined, sizeBytes: r.file_size_bytes ?? undefined, storagePath: r.storage_path ?? undefined, hash: r.sha256_hash ?? undefined }));
  }
  if (table === "automations") {
    next.automations = rows.map((r) => ({ id: r.id, name: r.name, module: r.module, trigger: r.trigger_event, actions: r.actions ?? [], status: r.status === "pausada" ? "Pausada" : r.status === "rascunho" ? "Rascunho" : "Ativa", lastRun: String(r.last_run_at ?? "").slice(0, 10), executions: Number(r.executions ?? 0), successRate: Number(r.success_rate ?? 100) }));
  }
  if (table === "automationRuns") {
    next.automationRuns = rows.map((r) => ({ id: r.id, ruleId: r.automation_rule_id, ruleName: state.automations.find((a) => a.id === r.automation_rule_id)?.name ?? "Automação", result: r.result ?? "", date: String(r.executed_at ?? "").slice(0, 10), status: r.status === "erro" ? "Erro" : r.status === "atenção" ? "Atenção" : "Sucesso" }));
  }
  if (table === "timeRecords") {
    next.timeRecords = rows.map((r) => ({ id: r.id, employeeId: r.employee_id, employeeName: state.employees.find((e) => e.id === r.employee_id)?.name ?? "Funcionário", sector: state.employees.find((e) => e.id === r.employee_id)?.sector ?? "", kind: r.kind, date: r.record_date, time: r.record_time?.slice(0, 5) ?? "", status: r.status ?? "normal", mode: r.mode === "remoto" ? "Remoto" : "Presencial", location: typeof r.location === "object" ? r.location?.label ?? "" : String(r.location ?? ""), device: r.device ?? "", justification: r.justification ?? undefined }));
  }
  if (table === "pricings") {
    next.pricings = rows.map((r) => ({ id: r.id, title: r.service_type ?? "Proposta", client: state.clients.find((c) => c.id === r.client_id)?.name ?? "", processId: r.process_id ?? undefined, area: r.area ?? "", service: r.service_type ?? "", minimum: Number(r.minimum_value ?? 0), recommended: Number(r.recommended_value ?? 0), premium: Number(r.premium_value ?? 0), entry: Number(r.entry_value ?? 0), successFee: Number(r.legal_factors?.honorario_exito ?? 0), status: r.status ? String(r.status).replace(/^./, (m) => m.toUpperCase()) as any : "Rascunho", createdAt: String(r.created_at ?? "").slice(0, 10) }));
  }
  return next;
}

const tableNames: Partial<Record<EntityName, string>> = {
  clients: "clients",
  leads: "leads",
  processes: "processes",
  tasks: "tasks",
  finances: "financial_entries",
  timeRecords: "time_records",
  documents: "documents",
  automations: "automation_rules",
  automationRuns: "automation_runs",
  pricings: "pricing_proposals",
};

export async function loadNormalizedState(): Promise<AppState> {
  const local = loadLocalState();
  if (!supabase) return local;
  let next = local;
  for (const entity of ["clients", "leads", "processes", "tasks", "finances", "documents", "automations", "automationRuns", "timeRecords", "pricings"] as EntityName[]) {
    const table = tableNames[entity];
    if (!table) continue;
    const { data, error } = await supabase.from(table).select("*").limit(500);
    if (!error && data && data.length) next = mapFromSupabase(next, entity, data);
  }
  saveLocalState(next);
  return next;
}

function toRemotePayload(entity: EntityName, item: any, state: AppState) {
  if (entity === "clients") return { id: item.id, organization_id: ORG_ID, type: item.type, name: item.name, document: item.document, phone: item.phone, whatsapp: item.phone, address: { city: item.city, street: item.address }, origin: item.origin, status: String(item.status).toLowerCase(), notes: "Criado pelo Nex Gestão Jurídica" };
  if (entity === "leads") return { id: item.id, organization_id: ORG_ID, name: item.name, phone: item.phone, origin: item.origin, area: item.area, stage: item.stage, estimated_value: item.value, next_contact: item.nextContact };
  if (entity === "processes") return { id: item.id, organization_id: ORG_ID, client_id: clientId(state, item.client), cnj: item.cnj, court: item.court, class_processual: item.class, area: item.area, type: "judicial", opposite_party: item.opposite, phase: item.phase, status: item.status, risk: item.risk, success_chance: item.successChance, claim_value: item.value, fees_value: item.fees, expected_end_at: item.nextDeadline };
  if (entity === "tasks") return { id: item.id, organization_id: ORG_ID, process_id: item.processId || null, client_id: clientId(state, item.client), title: item.title, responsible_id: null, sector: item.sector, priority: item.priority, status: item.status, due_at: item.due ? new Date(`${item.due}T12:00:00`).toISOString() : null, estimated_hours: item.estimatedHours, spent_hours: item.spentHours, checklist: item.checklist ?? [] };
  if (entity === "finances") return { id: item.id, organization_id: ORG_ID, client_id: clientId(state, item.client), process_id: item.processId || null, type: item.type === "Despesa" ? "despesa" : "receita", category: item.category, amount: item.amount, due_date: item.dueDate, paid_date: item.paidDate ?? null, status: String(item.status).toLowerCase(), method: item.method, notes: item.notes ?? "" };
  if (entity === "timeRecords") return { id: item.id, organization_id: ORG_ID, employee_id: item.employeeId, record_date: item.date, record_time: item.time, kind: item.kind, status: item.status, mode: item.mode.toLowerCase(), location: { label: item.location }, device: item.device, justification: item.justification ?? null };
  if (entity === "documents") return { id: item.id, organization_id: ORG_ID, client_id: clientId(state, item.client), process_id: item.processId || null, name: item.name, type: item.type, status: item.status, origin: item.origin, version: item.version, responsible_id: null, file_name: item.fileName ?? null, mime_type: item.mimeType ?? null, file_size_bytes: item.sizeBytes ?? null, storage_path: item.storagePath ?? null, sha256_hash: item.hash ?? null, scanner_metadata: { source: item.origin } };
  if (entity === "automations") return { id: item.id, organization_id: ORG_ID, name: item.name, module: item.module, trigger_event: item.trigger, conditions: {}, actions: item.actions, status: item.status.toLowerCase(), last_run_at: item.lastRun ? new Date(`${item.lastRun}T12:00:00`).toISOString() : null, executions: item.executions, success_rate: item.successRate };
  if (entity === "automationRuns") return { id: item.id, organization_id: ORG_ID, automation_rule_id: item.ruleId, status: item.status.toLowerCase(), result: item.result, executed_at: item.date ? new Date(`${item.date}T12:00:00`).toISOString() : new Date().toISOString() };
  if (entity === "pricings") return { id: item.id, organization_id: ORG_ID, client_id: clientId(state, item.client), process_id: item.processId || null, area: item.area, service_type: item.service, real_cost: item.minimum, minimum_value: item.minimum, recommended_value: item.recommended, premium_value: item.premium, entry_value: item.entry, legal_factors: { honorario_exito: item.successFee }, status: item.status.toLowerCase() };
  return item;
}

export async function persistEntity<K extends EntityName>(entity: K, item: AppState[K][number], state: AppState) {
  const table = tableNames[entity];
  if (!supabase || !table) return;
  const payload = toRemotePayload(entity, item, state);
  const { error } = await supabase.from(table).upsert(payload as never);
  if (error) throw error;
}

export async function deleteEntityRemote(entity: EntityName, id: string) {
  const table = tableNames[entity];
  if (!supabase || !table) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDocumentToStorage(documentId: string, dataUrl: string) {
  if (!supabase) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const path = `documentos/${documentId}.jpg`;
  const { error } = await supabase.storage.from("documentos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

export function getEmployeeName(state: AppState, id?: string) {
  return employeeName(state, id);
}
