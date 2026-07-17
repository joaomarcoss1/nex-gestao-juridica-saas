import type { AppState, AuthProfile, EntityName, PermissionKey } from "@/types/app";
import { can } from "@/lib/permissions";
import { hydrateRelations, resolveClientId } from "@/services/normalizedRepository";

export const routePermissions: Record<string, PermissionKey> = {
  dashboard: "dashboard.view",
  crm: "leads.view",
  clientes: "clients.view",
  processos: "processes.view",
  tarefas: "tasks.view",
  prazos: "deadlines.view",
  agenda: "deadlines.view",
  financeiro: "financial.view",
  precificacao: "pricing.view",
  documentos: "documents.view",
  ponto: "time.view",
  folha: "payroll.view",
  portal: "portal.view",
  chat: "chat.view",
  automacoes: "automations.view",
  relatorios: "reports.view",
  equipe: "users.view",
  empresas: "companies.view",
  modulos: "processes.view",
  auditoria: "audit.view",
  integracoes: "integrations.view",
  configuracoes: "settings.view",
  status: "settings.view",
  onboarding: "settings.view",
  assinatura: "financial.view",
};

const actionPermissions: Partial<Record<EntityName, Partial<Record<string, PermissionKey>>>> = {
  clients: { create: "clients.create", update: "clients.update", archive: "clients.archive", restore: "clients.update", delete: "clients.delete" },
  leads: { create: "leads.create", update: "leads.update", archive: "leads.update", restore: "leads.update", delete: "leads.update" },
  leadSources: { create: "integrations.manage", update: "integrations.manage", archive: "integrations.manage", restore: "integrations.manage", delete: "integrations.manage" },
  processes: { create: "processes.create", update: "processes.update", archive: "processes.archive", restore: "processes.update", delete: "processes.delete" },
  deadlines: { create: "deadlines.create", update: "deadlines.update", archive: "deadlines.update", restore: "deadlines.update", delete: "deadlines.update" },
  scheduledEvents: { create: "deadlines.create", update: "deadlines.update", archive: "deadlines.update", restore: "deadlines.update", delete: "deadlines.update" },
  tasks: { create: "tasks.create", update: "tasks.update", archive: "tasks.update", restore: "tasks.update", delete: "tasks.update" },
  finances: { create: "financial.create", update: "financial.update", archive: "financial.update", restore: "financial.update", delete: "financial.delete" },
  documents: { create: "documents.upload", update: "documents.approve", archive: "documents.delete", restore: "documents.approve", delete: "documents.delete" },
  pricings: { create: "pricing.create", update: "pricing.update", archive: "pricing.update", restore: "pricing.update", delete: "pricing.update" },
  timeRecords: { create: "time.punch", update: "time.adjust", archive: "time.adjust", restore: "time.adjust", delete: "time.approve" },
  payrolls: { create: "payroll.generate", update: "payroll.generate", archive: "payroll.generate", restore: "payroll.generate", delete: "payroll.generate" },
  messages: { create: "chat.view", update: "chat.reply", archive: "chat.reply", restore: "chat.reply", delete: "chat.reply" },
  automations: { create: "automations.create", update: "automations.update", archive: "automations.update", restore: "automations.update", delete: "automations.update" },
  automationRuns: { create: "automations.run", update: "automations.run" },
  integrations: { create: "integrations.manage", update: "integrations.manage", archive: "integrations.manage", restore: "integrations.manage", delete: "integrations.manage" },
  reportExports: { create: "reports.export" },
  organizations: { create: "companies.create", update: "companies.update", archive: "companies.block", restore: "companies.update", delete: "companies.block" },
  units: { create: "settings.manage", update: "settings.manage", archive: "settings.manage", restore: "settings.manage", delete: "settings.manage" },
  departments: { create: "settings.manage", update: "settings.manage", archive: "settings.manage", restore: "settings.manage", delete: "settings.manage" },
  teams: { create: "users.invite", update: "users.invite", archive: "users.invite", restore: "users.invite", delete: "users.invite" },
  teamMembers: { create: "users.invite", update: "users.invite", archive: "users.invite", restore: "users.invite", delete: "users.invite" },
  workflowTemplates: { create: "automations.create", update: "automations.update", archive: "automations.update", restore: "automations.update", delete: "automations.update" },
  workflowSteps: { create: "automations.create", update: "automations.update", archive: "automations.update", restore: "automations.update", delete: "automations.update" },
  legalModuleRecords: { create: "processes.create", update: "processes.update", archive: "processes.update", restore: "processes.update", delete: "processes.update" },
  ruralProperties: { create: "processes.create", update: "processes.update", archive: "processes.update", restore: "processes.update", delete: "processes.update" },
  documentFolders: { create: "documents.upload", update: "documents.approve", archive: "documents.delete", restore: "documents.approve", delete: "documents.delete" },
  documentVersions: { create: "documents.upload", update: "documents.approve" },
  documentTemplates: { create: "documents.approve", update: "documents.approve", archive: "documents.delete", restore: "documents.approve", delete: "documents.delete" },
  feeContracts: { create: "financial.create", update: "financial.update", archive: "financial.update", restore: "financial.update", delete: "financial.delete" },
  costEntries: { create: "financial.create", update: "financial.update", archive: "financial.update", restore: "financial.update", delete: "financial.delete" },
  pointSchedules: { create: "time.approve", update: "time.approve", archive: "time.approve", restore: "time.approve", delete: "time.approve" },
  pointAdjustments: { create: "time.adjust", update: "time.approve", archive: "time.approve", restore: "time.approve", delete: "time.approve" },
  pointJustifications: { create: "time.adjust", update: "time.approve", archive: "time.approve", restore: "time.approve", delete: "time.approve" },
  notifications: { create: "automations.run", update: "automations.run", archive: "automations.run", restore: "automations.run", delete: "automations.run" },
};

const globalAdminRoles = new Set(["admin_master", "admin_master_global"]);
const adminRoles = new Set(["admin_master", "admin_master_global", "admin", "admin_empresa", "socio"]);

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
  if (entity === "timeRecords" && ["update", "archive", "delete"].includes(action)) {
    throw new Error("Registros de ponto são imutáveis. Use solicitação de ajuste, abono ou justificativa auditável.");
  }
  if (entity === "messages" && profile && state && !canAccessMessage(profile, item, state)) {
    throw new Error("Chat jurídico bloqueou mensagem fora da sua responsabilidade.");
  }
}

function clientIdForItem(item: any, state: AppState) {
  if (!item) return null;
  if (item.clientId) return item.clientId;
  if (item.client) return resolveClientId(state, item.client);
  return null;
}

function processForItem(item: any, state: AppState) {
  if (!item?.processId) return null;
  return state.processes.find((process) => process.id === item.processId) ?? null;
}

export function isClientScopedItem(profile: AuthProfile, item: unknown, state: AppState) {
  if (profile.role !== "cliente") return true;
  const clientId = profile.clientId;
  if (!clientId) return false;
  const itemClientId = clientIdForItem(item, state);
  return itemClientId === clientId;
}

export function canAccessMessage(profile: AuthProfile, item: unknown, state: AppState) {
  const role = String(profile.role).toLowerCase();
  if (adminRoles.has(role)) return true;
  const message = item as { clientId?: string; client?: string; processId?: string; responsibleId?: string; senderId?: string } | undefined;
  if (!message) return true;
  if (role === "cliente") return isClientScopedItem(profile, message, state);
  const process = processForItem(message, state);
  if (["advogado"].includes(role)) return message.responsibleId === profile.id || message.senderId === profile.id || process?.responsible === profile.id || process?.responsibleId === profile.id;
  return false;
}

function filterStateByOrganization(state: AppState, organizationId?: string): AppState {
  if (!organizationId) return state;
  const byOrg = <T extends object>(items: T[]) => items.filter((item) => {
    const itemOrgId = (item as { organizationId?: string }).organizationId;
    return !itemOrgId || itemOrgId === organizationId;
  });
  const employees = byOrg(state.employees);
  const employeeIds = new Set(employees.map((item) => item.id));
  const clients = byOrg(state.clients);
  const clientIds = new Set(clients.map((item) => item.id));
  const processes = byOrg(state.processes).filter((item) => !item.clientId || clientIds.has(item.clientId));
  const processIds = new Set(processes.map((item) => item.id));
  return {
    ...state,
    organizations: state.organizations.filter((item) => item.id === organizationId),
    units: state.units.filter((item) => item.organizationId === organizationId),
    departments: state.departments.filter((item) => item.organizationId === organizationId),
    teams: state.teams.filter((item) => item.organizationId === organizationId),
    workflowTemplates: state.workflowTemplates.filter((item) => item.organizationId === organizationId || !item.organizationId),
    legalModuleRecords: byOrg(state.legalModuleRecords).filter((item) => !item.processId || processIds.has(item.processId)),
    ruralProperties: byOrg(state.ruralProperties).filter((item) => !item.processId || processIds.has(item.processId)),
    documentFolders: byOrg(state.documentFolders).filter((item) => !item.clientId || clientIds.has(item.clientId)),
    notifications: byOrg(state.notifications).filter((item) => !item.userId || employeeIds.has(item.userId)),
    employees,
    leadSources: byOrg(state.leadSources),
    clients,
    processes,
    deadlines: state.deadlines.filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    tasks: state.tasks.filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    finances: state.finances.filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    timeRecords: byOrg(state.timeRecords).filter((item) => !item.employeeId || employeeIds.has(item.employeeId)),
    documents: byOrg(state.documents).filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    messages: byOrg(state.messages).filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    pricings: byOrg(state.pricings).filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    payrolls: state.payrolls.filter((item) => employeeIds.has(item.employeeId)),
    hearings: byOrg(state.hearings).filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    scheduledEvents: byOrg(state.scheduledEvents).filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    clientConsents: state.clientConsents.filter((item) => clientIds.has(item.clientId)),
    feeContracts: state.feeContracts.filter((item) => clientIds.has(item.clientId)),
    costEntries: state.costEntries.filter((item) => (!item.clientId || clientIds.has(item.clientId)) && (!item.processId || processIds.has(item.processId))),
    auditLogs: byOrg(state.auditLogs),
  };
}

export function scopeStateForProfile(state: AppState, profile: AuthProfile | null | undefined): AppState {
  const hydrated = hydrateRelations(state);
  const role = String(profile?.role ?? "").toLowerCase();
  if (!profile || globalAdminRoles.has(role)) return hydrated;

  const scopedByOrg = filterStateByOrganization(hydrated, profile.organizationId);
  if (adminRoles.has(role)) return scopedByOrg;
  if (profile.role === "cliente") {
    const hydrated = scopedByOrg;
    const clientId = profile.clientId;
    if (!clientId) return { ...hydrated, leadSources: [], clients: [], processes: [], deadlines: [], tasks: [], finances: [], documents: [], messages: [], pricings: [], hearings: [], scheduledEvents: [], clientConsents: [], legalModuleRecords: [], ruralProperties: [], feeContracts: [], costEntries: [], documentFolders: [], notifications: [], auditLogs: [] };
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
      scheduledEvents: hydrated.scheduledEvents.filter((event) => event.clientVisible && (matchesClient(event) || (event.processId ? processIds.has(event.processId) : false))),
      leadSources: [],
      clientConsents: hydrated.clientConsents.filter((c) => c.clientId === clientId),
      legalModuleRecords: hydrated.legalModuleRecords.filter((m) => m.clientId === clientId || processIds.has(m.processId)),
      ruralProperties: hydrated.ruralProperties.filter((r) => r.clientId === clientId || (r.processId ? processIds.has(r.processId) : false)),
      feeContracts: hydrated.feeContracts.filter((f) => f.clientId === clientId),
      costEntries: hydrated.costEntries.filter((c) => c.clientId === clientId || (c.processId ? processIds.has(c.processId) : false)),
      documentFolders: hydrated.documentFolders.filter((f) => f.clientId === clientId || (f.processId ? processIds.has(f.processId) : false)).map((f) => ({ ...f, accessLevel: f.accessLevel === "Restrito" ? "Interno" : f.accessLevel })),
      notifications: hydrated.notifications.filter((n) => n.clientId === clientId),
      auditLogs: [],
    };
  }
  if (profile.role === "financeiro") return { ...scopedByOrg, documents: [], auditLogs: [], payrolls: [], timeRecords: [], messages: [], processes: hydrated.processes };
  if (profile.role === "rh") return { ...scopedByOrg, finances: [], documents: [], processes: [], deadlines: [], messages: [], auditLogs: [] };
  if (profile.role === "advogado") {
    const hydrated = scopedByOrg;
    const responsible = profile.id;
    const processes = hydrated.processes.filter((p) => !p.responsible || p.responsible === responsible || p.responsibleId === responsible);
    const processIds = new Set(processes.map((p) => p.id));
    return {
      ...hydrated,
      processes,
      deadlines: hydrated.deadlines.filter((d) => processIds.has(d.processId) || d.responsible === responsible),
      tasks: hydrated.tasks.filter((t) => processIds.has(t.processId) || t.responsible === responsible || t.delegatedBy === responsible || t.reviewer === responsible),
      messages: hydrated.messages.filter((m) => processIds.has(m.processId) || m.responsibleId === responsible || m.senderId === responsible),
      finances: [],
      legalModuleRecords: hydrated.legalModuleRecords.filter((m) => processIds.has(m.processId) || m.responsibleId === responsible),
      ruralProperties: hydrated.ruralProperties.filter((r) => r.processId ? processIds.has(r.processId) : false),
      feeContracts: [],
      costEntries: [],
      payrolls: [],
      auditLogs: [],
    };
  }
  if (profile.role === "controladoria") return { ...scopedByOrg, finances: [], payrolls: [], messages: [], auditLogs: [] };
  if (profile.role === "funcionario" || profile.role === "estagiario" || profile.role === "atendimento") {
    const hydrated = scopedByOrg;
    return {
      ...hydrated,
      clients: hydrated.clients,
      processes: hydrated.processes,
      deadlines: [],
      finances: [],
      pricings: [],
      payrolls: [],
      automations: [],
      automationRuns: [],
      integrations: [],
      messages: [],
      feeContracts: [],
      costEntries: [],
      auditLogs: [],
    };
  }
  return scopedByOrg;
}
