import type { AppState, AuthProfile, EntityName, PermissionKey } from "@/types/app";
import { can } from "@/lib/permissions";
import { hydrateRelations, resolveClientId } from "@/services/normalizedRepository";

export const routePermissions: Record<string, PermissionKey> = {
  dashboard: "dashboard.view",
  clientes: "clients.view",
  processos: "processes.view",
  prazos: "deadlines.view",
  tarefas: "tasks.view",
  financeiro: "financial.view",
  precificacao: "pricing.view",
  documentos: "documents.view",
  ponto: "time.view",
  folha: "payroll.view",
  portal: "portal.view",
  automacoes: "automations.view",
  relatorios: "reports.view",
  auditoria: "audit.view",
  integracoes: "integrations.view",
  configuracoes: "settings.view",
};

const actionPermissions: Partial<Record<EntityName, Partial<Record<string, PermissionKey>>>> = {
  clients: { create: "clients.create", update: "clients.update", archive: "clients.archive", restore: "clients.update", delete: "clients.delete" },
  leads: { create: "leads.create", update: "leads.update", archive: "leads.update", restore: "leads.update", delete: "leads.update" },
  processes: { create: "processes.create", update: "processes.update", archive: "processes.archive", restore: "processes.update", delete: "processes.delete" },
  deadlines: { create: "deadlines.create", update: "deadlines.update", archive: "deadlines.update", restore: "deadlines.update", delete: "deadlines.update" },
  tasks: { create: "tasks.create", update: "tasks.update", archive: "tasks.update", restore: "tasks.update", delete: "tasks.update" },
  finances: { create: "financial.create", update: "financial.update", archive: "financial.update", restore: "financial.update", delete: "financial.delete" },
  documents: { create: "documents.upload", update: "documents.approve", archive: "documents.delete", restore: "documents.approve", delete: "documents.delete" },
  pricings: { create: "pricing.create", update: "pricing.update", archive: "pricing.update", restore: "pricing.update", delete: "pricing.update" },
  timeRecords: { create: "time.punch", update: "time.adjust", archive: "time.adjust", restore: "time.adjust", delete: "time.approve" },
  payrolls: { create: "payroll.generate", update: "payroll.generate", archive: "payroll.generate", restore: "payroll.generate", delete: "payroll.generate" },
  automations: { create: "automations.create", update: "automations.update", archive: "automations.update", restore: "automations.update", delete: "automations.update" },
  automationRuns: { create: "automations.run", update: "automations.run" },
  integrations: { create: "integrations.manage", update: "integrations.manage", archive: "integrations.manage", restore: "integrations.manage", delete: "integrations.manage" },
  reportExports: { create: "reports.export" },
};

export function permissionForEntityAction(entity: EntityName, action: string): PermissionKey | undefined {
  return actionPermissions[entity]?.[action];
}

export function canAccessRoute(profile: AuthProfile | null | undefined, page: string) {
  const permission = routePermissions[page] ?? "dashboard.view";
  return can(profile, permission);
}

export function assertEntityActionAllowed(profile: AuthProfile | null | undefined, entity: EntityName, action: string, item?: unknown, state?: AppState) {
  const permission = permissionForEntityAction(entity, action);
  if (permission && !can(profile, permission)) {
    throw new Error(`Permissão insuficiente para ${String(entity)}.${action}.`);
  }
  if (profile?.role === "cliente" && state && !isClientScopedItem(profile, item, state)) {
    throw new Error("Portal do cliente bloqueou acesso a registro de outro cliente.");
  }
}

function clientIdForItem(item: any, state: AppState) {
  if (!item) return null;
  if (item.clientId) return item.clientId;
  if (item.client) return resolveClientId(state, item.client);
  return null;
}

export function isClientScopedItem(profile: AuthProfile, item: unknown, state: AppState) {
  if (profile.role !== "cliente") return true;
  const clientId = profile.clientId;
  if (!clientId) return false;
  const itemClientId = clientIdForItem(item, state);
  return itemClientId === clientId;
}

export function scopeStateForProfile(state: AppState, profile: AuthProfile | null | undefined): AppState {
  const hydrated = hydrateRelations(state);
  if (!profile || ["admin", "socio"].includes(String(profile.role))) return hydrated;
  if (profile.role === "cliente") {
    const clientId = profile.clientId;
    if (!clientId) return { ...hydrated, clients: [], processes: [], deadlines: [], tasks: [], finances: [], documents: [], messages: [], pricings: [], hearings: [], clientConsents: [] };
    const matchesClient = (item: { clientId?: string; client?: string }) => (item.clientId ?? resolveClientId(hydrated, item.client)) === clientId;
    const processes = hydrated.processes.filter(matchesClient);
    const processIds = new Set(processes.map((p) => p.id));
    return {
      ...hydrated,
      clients: hydrated.clients.filter((c) => c.id === clientId),
      processes,
      deadlines: hydrated.deadlines.filter((d) => matchesClient(d) || processIds.has(d.processId)),
      tasks: hydrated.tasks.filter((t) => matchesClient(t) || processIds.has(t.processId)).map((t) => ({ ...t, description: t.description?.replace(/Estratégia interna:.*/gi, "") })),
      finances: hydrated.finances.filter(matchesClient),
      documents: hydrated.documents.filter((d) => matchesClient(d) || processIds.has(d.processId)),
      messages: hydrated.messages.filter((m) => matchesClient(m) || processIds.has(m.processId)),
      pricings: hydrated.pricings.filter(matchesClient),
      hearings: hydrated.hearings.filter((h) => matchesClient(h) || processIds.has(h.processId)),
      clientConsents: hydrated.clientConsents.filter((c) => c.clientId === clientId),
      auditLogs: [],
    };
  }
  if (profile.role === "financeiro") return { ...hydrated, documents: [], auditLogs: [], payrolls: [], timeRecords: [] };
  if (profile.role === "rh") return { ...hydrated, finances: [], documents: [], processes: [], deadlines: [], auditLogs: [] };
  if (profile.role === "advogado" || profile.role === "controladoria") {
    const responsible = profile.id;
    const processes = hydrated.processes.filter((p) => !p.responsible || p.responsible === responsible || p.responsibleId === responsible);
    const processIds = new Set(processes.map((p) => p.id));
    return { ...hydrated, processes, deadlines: hydrated.deadlines.filter((d) => processIds.has(d.processId) || d.responsible === responsible), tasks: hydrated.tasks.filter((t) => processIds.has(t.processId) || t.responsible === responsible), finances: [], payrolls: [], auditLogs: [] };
  }
  return hydrated;
}
