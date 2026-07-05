import type { ReactNode } from "react";

export type PageKey =
  | "dashboard"
  | "crm"
  | "clientes"
  | "processos"
  | "tarefas"
  | "prazos"
  | "agenda"
  | "documentos"
  | "financeiro"
  | "precificacao"
  | "portal"
  | "chat"
  | "ponto"
  | "relatorios"
  | "equipe"
  | "modulos"
  | "folha"
  | "automacoes"
  | "auditoria"
  | "integracoes"
  | "empresas"
  | "configuracoes";


export type PermissionKey =
  | "dashboard.view"
  | "clients.view" | "clients.create" | "clients.update" | "clients.archive" | "clients.delete"
  | "leads.view" | "leads.create" | "leads.update" | "leads.convert"
  | "processes.view" | "processes.create" | "processes.update" | "processes.archive" | "processes.delete"
  | "deadlines.view" | "deadlines.create" | "deadlines.update" | "deadlines.complete"
  | "tasks.view" | "tasks.create" | "tasks.update" | "tasks.complete"
  | "financial.view" | "financial.create" | "financial.update" | "financial.pay" | "financial.delete"
  | "pricing.view" | "pricing.create" | "pricing.update" | "pricing.approve"
  | "documents.view" | "documents.upload" | "documents.download" | "documents.approve" | "documents.delete"
  | "portal.view" | "portal.manage"
  | "chat.view" | "chat.reply"
  | "users.view" | "users.invite" | "users.promote_master"
  | "companies.view" | "companies.create" | "companies.update" | "companies.block" | "companies.support"
  | "time.view" | "time.punch" | "time.adjust" | "time.approve"
  | "payroll.view" | "payroll.generate" | "payroll.export"
  | "reports.view" | "reports.export"
  | "automations.view" | "automations.create" | "automations.update" | "automations.run"
  | "integrations.view" | "integrations.manage"
  | "settings.view" | "settings.manage" | "audit.view";

export type AuthProfile = {
  id: string;
  organizationId: string;
  authUserId?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  role: "admin_master_global" | "admin_master" | "admin_empresa" | "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "rh" | "atendimento" | "controladoria" | "funcionario" | "cliente" | string;
  sector?: string;
  oab?: string;
  active: boolean;
  organizationRegistrationCode?: string;
  organizationName?: string;
  /** Perfil cliente: vínculo imutável usado pelo portal e pelo RLS para impedir seleção manual de outro cliente. */
  clientId?: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
};

export type TaskStatus = "Pendente" | "Triagem" | "Em andamento" | "Em produção" | "Revisão" | "Aguardando cliente" | "Aguardando tribunal" | "Concluída" | "Atrasada" | "Cancelada";
export type TimeKind = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida_final" | "ajuste_manual" | "abono" | "falta" | "feriado" | "folga" | "home_office" | "justificativa";
export type Archiveable = { archivedAt?: string; updatedAt?: string; createdAt?: string };

export type Employee = Archiveable & {
  id: string;
  organizationId?: string;
  unit?: string;
  department?: string;
  managerId?: string;
  name: string;
  cpf: string;
  pinHash: string;
  role: string;
  sector: string;
  email: string;
  phone: string;
  oab?: string;
  baseSalary: number;
  hourlyRate: number;
  schedule: { entrada: string; saida_intervalo: string; retorno_intervalo: string; saida_final: string };
  mode: "Presencial" | "Híbrido" | "Remoto";
  contractType?: "CLT" | "Associado" | "Estágio" | "Prestador" | "Sócio";
  workDays?: string[];
  toleranceMinutes?: number;
  status: "Ativo" | "Férias" | "Licença" | "Inativo";
  score: number;
};

export type Lead = Archiveable & {
  id: string;
  name: string;
  type?: "PF" | "PJ";
  phone: string;
  email?: string;
  origin: string;
  area: string;
  demandType?: string;
  stage: string;
  value: number;
  nextContact: string;
  responsible: string;
  notes?: string;
  lossReason?: string;
};

export type Client = Archiveable & {
  id: string;
  organizationId?: string;
  unitId?: string;
  departmentId?: string;
  type: "PF" | "PJ" | "Espólio" | "Condomínio" | "Associação" | "Cooperativa" | "Grupo econômico" | "Órgão público" | "Produtor rural" | "Empresa rural" | "Cliente corporativo";
  name: string;
  document: string;
  rg?: string;
  maritalStatus?: string;
  profession?: string;
  birthDate?: string;
  fantasyName?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  cnae?: string;
  legalRepresentatives?: string;
  partners?: string;
  corporateDocuments?: string;
  city: string;
  origin: string;
  status: "Ativo" | "Prospecto" | "Inativo" | "Arquivado";
  responsible: string;
  responsibleId?: string;
  processes: number;
  lifetimeValue: number;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  representative?: string;
  powerOfAttorney?: string;
  personalDocuments?: string;
  notes?: string;
};

export type Process = Archiveable & {
  id: string;
  organizationId?: string;
  unitId?: string;
  departmentId?: string;
  teamId?: string;
  cnj: string;
  type?: "Judicial" | "Administrativo" | "Consultivo" | "Extrajudicial" | "Contrato" | "Acordo" | "Serviço avulso";
  client: string;
  clientId?: string;
  opposite: string;
  activePole?: string;
  passivePole?: string;
  subject?: string;
  court: string;
  courtDivision?: string;
  district?: string;
  state?: string;
  class: string;
  administrativeBody?: string;
  protocolNumber?: string;
  procedureType?: string;
  requirements?: string;
  decisions?: string;
  appeals?: string;
  agreements?: string;
  meetings?: string;
  notices?: string;
  contracts?: string;
  area: string;
  phase: string;
  status: string;
  risk: "Baixo" | "Médio" | "Alto";
  successChance: number;
  value: number;
  fees: number;
  costs?: number;
  responsible: string;
  responsibleId?: string;
  auxiliaryLawyers?: string[];
  nextDeadline: string;
  lastMoveDays: number;
  progress: number;
  clientVisibleSummary?: string;
  internalStrategy?: string;
  timeline?: string[];
  annotations?: string;
  checklist?: string[];
  closedAt?: string;
  notes?: string;
};

export type Deadline = Archiveable & {
  id: string;
  processId: string;
  client: string;
  clientId?: string;
  responsible: string;
  type: string;
  publicationDate: string;
  awarenessDate: string;
  startDate: string;
  days: number;
  countType: "Dias úteis" | "Dias corridos";
  dueDate: string;
  fatal: boolean;
  priority: "Baixa" | "Média" | "Alta" | "Urgente" | "Crítica";
  status: "Pendente" | "Concluído" | "Atrasado" | "Cancelado";
  warningDays?: number[];
  completedAt?: string;
  proof?: string;
  notes?: string;
};

export type Task = Archiveable & {
  id: string;
  title: string;
  description?: string;
  processId: string;
  client: string;
  clientId?: string;
  responsible: string;
  sector: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente" | "Crítica";
  status: TaskStatus;
  due: string;
  estimatedHours: number;
  spentHours: number;
  checklist?: string[];
  comments?: string[];
  delegatedBy?: string;
  reviewer?: string;
  workflowStage?: "Triagem" | "Execução" | "Revisão" | "Protocolo" | "Cliente" | "Concluído";
  startedAt?: string;
  completedAt?: string;
  slaHours?: number;
  qualityScore?: number;
  blockers?: string[];
};

export type FinanceEntry = Archiveable & {
  id: string;
  type: "Receita" | "Despesa";
  category: string;
  costCenter?: string;
  bankAccount?: string;
  client: string;
  clientId?: string;
  processId?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: "Pendente" | "Pago" | "Atrasado" | "Cancelado" | "Parcial" | "Arquivado";
  method: "PIX" | "Dinheiro" | "Cartão" | "Boleto" | "Transferência" | "Recorrente";
  recurrence?: string;
  installment?: number;
  installments?: number;
  attachment?: string;
  receiptNumber?: string;
  partialPayments?: Array<{ amount: number; paidAt: string; method: string; receiptNumber: string }>;
  notes?: string;
};

export type TimeRecord = Archiveable & {
  id: string;
  organizationId?: string;
  unit?: string;
  department?: string;
  employeeId: string;
  employeeName: string;
  sector: string;
  kind: TimeKind;
  date: string;
  time: string;
  status: "normal" | "justificado" | "pendente_aprovacao" | "aprovado" | "reprovado" | "abonado" | "inconsistente";
  mode: "Presencial" | "Remoto" | "Híbrido" | "Diligência externa" | "Audiência externa";
  location: string;
  latitude?: number;
  longitude?: number;
  ip?: string;
  origin?: "web" | "mobile" | "admin" | "importacao";
  expectedTime?: string;
  selfieStoragePath?: string;
  consentLgpd?: boolean;
  device: string;
  justification?: string;
  adjustmentReason?: string;
  requestedTime?: string;
  approvedBy?: string;
  approvedAt?: string;
};

export type LegalDoc = Archiveable & {
  id: string;
  organizationId?: string;
  folderId?: string;
  tags?: string[];
  clientVisible?: boolean;
  releasedAt?: string;
  validationStatus?: "Pendente" | "Validado" | "Recusado";
  accessLevel?: "Interno" | "Cliente" | "Financeiro" | "Restrito";
  name: string;
  type: string;
  client: string;
  clientId?: string;
  processId: string;
  status: "Recebido" | "Em análise" | "Pendente correção" | "Aprovado" | "Protocolado" | "Arquivado" | "Assinatura" | "Recusado";
  origin: "Câmera" | "Upload" | "Editor" | "Scanner do cliente";
  responsible: string;
  version: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  dataUrl?: string;
  storagePath?: string;
  hash?: string;
  viewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionComment?: string;
};

export type Protocol = Archiveable & {
  id: string;
  number: string;
  body: string;
  processId: string;
  document: string;
  status: "Pendente" | "Protocolado" | "Aguardando retorno" | "Deferido" | "Indeferido" | "Arquivado";
  date: string;
  responsible: string;
};

export type Signature = Archiveable & {
  id: string;
  document: string;
  signer: string;
  role: string;
  status: "Solicitada" | "Assinada" | "Recusada";
  date: string;
  ip: string;
};

export type Message = Archiveable & {
  id: string;
  organizationId?: string;
  channel: "WhatsApp" | "E-mail" | "SMS" | "Chat";
  threadType?: "cliente" | "interno";
  relatedTaskId?: string;
  relatedDocumentId?: string;
  departmentId?: string;
  priority?: "Baixa" | "Média" | "Alta" | "Urgente";
  resolved?: boolean;
  attachments?: string[];
  client: string;
  clientId?: string;
  processId: string;
  subject: string;
  body?: string;
  status: "Enviada" | "Agendada" | "Pendente" | "Lida" | "Respondida" | "Em análise";
  date: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  responsibleId?: string;
  direction?: "cliente_para_escritorio" | "escritorio_para_cliente" | "interno";
  readAt?: string;
  answeredAt?: string;
};

export type AutomationRule = Archiveable & {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  conditions?: string[];
  actions: string[];
  module: "Processos" | "Financeiro" | "Ponto" | "Documentos" | "CRM" | "Relatórios" | "Prazos" | "Folha" | "Portal" | "Tarefas" | "Workflow";
  status: "Ativa" | "Pausada" | "Rascunho";
  recurrence?: "Evento" | "Diária" | "Semanal" | "Mensal";
  lastRun: string;
  nextRun?: string;
  executions: number;
  failures?: number;
  successRate: number;
  responsible?: string;
};

export type AutomationRun = Archiveable & {
  id: string;
  ruleId: string;
  ruleName: string;
  result: string;
  date: string;
  status: "Sucesso" | "Atenção" | "Erro";
  details?: string;
};

export type PricingProposal = Archiveable & {
  id: string;
  title: string;
  client: string;
  clientId?: string;
  processId?: string;
  area: string;
  service: string;
  minimum: number;
  recommended: number;
  premium: number;
  entry: number;
  successFee: number;
  status: "Rascunho" | "Enviada" | "Aceita" | "Recusada" | "Arquivada";
  createdAt: string;
  version?: string;
  oabState?: string;
  oabYear?: number;
};

export type Payroll = Archiveable & {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  baseSalary: number;
  workedHours: number;
  overtime: number;
  absences: number;
  delays: number;
  benefits: number;
  discounts: number;
  commissions: number;
  gross: number;
  net: number;
  status: "Rascunho" | "Fechada" | "Paga" | "Assinada";
};

export type Integration = Archiveable & {
  id: string;
  provider: "Asaas" | "Mercado Pago" | "Stripe" | "WhatsApp Business" | "Evolution API" | "E-mail" | "Tribunais" | "ICP-Brasil" | "Outro";
  status: "Desconectado" | "Preparado" | "Conectado" | "Erro";
  description: string;
  requiresBackend: boolean;
  lastSync?: string;
};

export type AuditLog = {
  id: string;
  module: string;
  action: string;
  entityId?: string;
  user?: string;
  userId?: string;
  date: string;
  time?: string;
  detail: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ip?: string;
  device?: string;
};


export type Hearing = Archiveable & {
  id: string;
  processId: string;
  clientId?: string;
  client: string;
  title: string;
  hearingAt: string;
  type?: string;
  location?: string;
  link?: string;
  responsible?: string;
  checklist?: string[];
  status: "Agendada" | "Realizada" | "Cancelada";
};

export type ClientConsent = Archiveable & {
  id: string;
  clientId: string;
  consentType: string;
  legalBasis?: string;
  accepted: boolean;
  acceptedAt?: string;
  revokedAt?: string;
};

export type PaymentReceipt = {
  id: string;
  financeId: string;
  receiptNumber: string;
  amount: number;
  issuedAt: string;
  issuedBy?: string;
};

export type ReportExport = {
  id: string;
  reportName: string;
  filters: Record<string, unknown>;
  format: "PDF" | "CSV" | "XLSX";
  exportedAt: string;
};


export type Organization = Archiveable & {
  id: string;
  registrationCode: string;
  name: string;
  tradeName?: string;
  document: string;
  email?: string;
  phone?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  city?: string;
  state?: string;
  address?: string;
  plan: "Enterprise" | "Profissional" | "Operacional" | "Starter" | string;
  headquartersCity?: string;
  status: "Ativa" | "Bloqueada" | "Suspensa" | "Inativa";
  accessBlocked?: boolean;
  blockedReason?: string;
  createdBy?: string;
  supportMode?: boolean;
};

export type Unit = Archiveable & {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  state: string;
  managerId?: string;
  status: "Ativa" | "Inativa";
};

export type Department = Archiveable & {
  id: string;
  organizationId: string;
  unitId?: string;
  name: string;
  legalArea?: string;
  managerId?: string;
  status: "Ativo" | "Inativo";
};

export type Team = Archiveable & {
  id: string;
  organizationId: string;
  unitId?: string;
  departmentId?: string;
  name: string;
  coordinatorId?: string;
  legalArea: string;
  capacity: number;
  status: "Ativa" | "Pausada" | "Inativa";
};

export type TeamMember = Archiveable & {
  id: string;
  teamId: string;
  employeeId: string;
  role: "Sócio" | "Coordenador" | "Advogado" | "Estagiário" | "Assistente" | "Financeiro" | "RH" | "Controladoria";
  workloadPercent: number;
};

export type WorkflowTemplate = Archiveable & {
  id: string;
  organizationId: string;
  moduleArea: string;
  name: string;
  description?: string;
  active: boolean;
};

export type WorkflowStep = Archiveable & {
  id: string;
  workflowId: string;
  order: number;
  name: string;
  createsTask?: boolean;
  taskTitle?: string;
  responsibleRole?: string;
  requiresDocument?: boolean;
  notifyClient?: boolean;
  autoPriority?: "Baixa" | "Média" | "Alta" | "Urgente" | "Crítica";
};

export type LegalModuleRecord = Archiveable & {
  id: string;
  organizationId?: string;
  moduleArea: string;
  processId: string;
  clientId?: string;
  client: string;
  serviceType: string;
  stage: string;
  status: "Ativo" | "Pendente" | "Em análise" | "Aguardando cliente" | "Concluído" | "Arquivado";
  responsibleId?: string;
  fieldValues: Record<string, string | number | boolean | string[]>;
  checklist: Array<{ label: string; done: boolean }>;
  indicators?: Record<string, number | string>;
};

export type RuralProperty = Archiveable & {
  id: string;
  organizationId?: string;
  clientId?: string;
  processId?: string;
  name: string;
  propertyType: "Fazenda" | "Sítio" | "Chácara" | "Gleba" | "Lote rural" | "Área produtiva";
  owner: string;
  possessor?: string;
  municipality: string;
  state: string;
  locality?: string;
  declaredArea: number;
  measuredArea: number;
  registeredArea: number;
  registryNumber?: string;
  notaryOffice?: string;
  ccir?: string;
  car?: string;
  itr?: string;
  cib?: string;
  nirf?: string;
  sigef?: string;
  incra?: string;
  coordinates?: string;
  memorial?: string;
  mapStoragePath?: string;
  boundaries?: string;
  legalReserve?: string;
  appArea?: string;
  productiveArea?: string;
  preservationArea?: string;
  environmentalStatus: string;
  taxStatus: string;
  registryStatus: string;
  landStatus: string;
  pendingItems: string[];
  protocols: string[];
  photos?: string[];
  videos?: string[];
  reports?: string[];
  technicalResponsible?: string;
  artRrt?: string;
};

export type DocumentFolder = Archiveable & { id: string; organizationId?: string; clientId?: string; processId?: string; name: string; parentId?: string; accessLevel: "Interno" | "Cliente" | "Restrito"; };
export type DocumentVersion = Archiveable & { id: string; documentId: string; version: string; storagePath?: string; hash?: string; changedBy?: string; changeNote?: string; createdAt: string; };
export type DocumentTemplate = Archiveable & { id: string; moduleArea: string; name: string; type: string; body: string; clientVisibleDefault: boolean; };

export type FeeContract = Archiveable & {
  id: string;
  clientId: string;
  processId?: string;
  title: string;
  feeType: "Contratual" | "Sucumbencial" | "Êxito" | "Mensal" | "Avulso";
  totalAmount: number;
  entryAmount: number;
  installments: number;
  successPercent?: number;
  status: "Rascunho" | "Enviado" | "Assinado" | "Ativo" | "Encerrado" | "Cancelado";
  signedAt?: string;
};

export type CostEntry = Archiveable & { id: string; clientId?: string; processId?: string; category: "Custas" | "Guias" | "Diligência" | "Correspondente" | "Reembolso" | "Despesa interna"; description: string; amount: number; dueDate: string; status: "Pendente" | "Pago" | "Reembolsado" | "Cancelado"; responsibleId?: string; };

export type PointSchedule = Archiveable & { id: string; employeeId: string; unitId?: string; departmentId?: string; scheduleType: string; entrada: string; saida_intervalo: string; retorno_intervalo: string; saida_final: string; toleranceMinutes: number; dailyHours: number; workDays: string[]; managerId?: string; active: boolean; };
export type PointAdjustmentRequest = Archiveable & { id: string; employeeId: string; date: string; kind: TimeKind; requestedTime: string; reason: string; attachment?: string; status: "Pendente" | "Aprovada" | "Reprovada" | "Abonada"; approverId?: string; approvedAt?: string; };
export type PointJustification = Archiveable & { id: string; employeeId: string; timeRecordId?: string; date: string; reason: string; status: "Pendente" | "Aprovada" | "Reprovada" | "Abonada"; approverId?: string; decidedAt?: string; };

export type Notification = Archiveable & { id: string; userId?: string; clientId?: string; title: string; body: string; module: string; priority: "Baixa" | "Média" | "Alta" | "Urgente"; readAt?: string; };

export type AppState = {
  organizations: Organization[];
  units: Unit[];
  departments: Department[];
  teams: Team[];
  teamMembers: TeamMember[];
  workflowTemplates: WorkflowTemplate[];
  workflowSteps: WorkflowStep[];
  legalModuleRecords: LegalModuleRecord[];
  ruralProperties: RuralProperty[];
  documentFolders: DocumentFolder[];
  documentVersions: DocumentVersion[];
  documentTemplates: DocumentTemplate[];
  feeContracts: FeeContract[];
  costEntries: CostEntry[];
  pointSchedules: PointSchedule[];
  pointAdjustments: PointAdjustmentRequest[];
  pointJustifications: PointJustification[];
  notifications: Notification[];
  employees: Employee[];
  leads: Lead[];
  clients: Client[];
  processes: Process[];
  deadlines: Deadline[];
  tasks: Task[];
  finances: FinanceEntry[];
  timeRecords: TimeRecord[];
  documents: LegalDoc[];
  protocols: Protocol[];
  signatures: Signature[];
  messages: Message[];
  automations: AutomationRule[];
  automationRuns: AutomationRun[];
  pricings: PricingProposal[];
  payrolls: Payroll[];
  integrations: Integration[];
  hearings: Hearing[];
  clientConsents: ClientConsent[];
  paymentReceipts: PaymentReceipt[];
  reportExports: ReportExport[];
  auditLogs: AuditLog[];
};

export type EntityName = keyof AppState;

export type Toast = { id: string; tone: "success" | "error" | "info"; title: string; message?: string };

export type FeaturePageProps = {
  state: AppState;
  commit: <K extends EntityName>(entity: K, value: AppState[K][number], action?: "create" | "update" | "archive" | "restore") => Promise<void>;
  remove: <K extends EntityName>(entity: K, id: string) => Promise<void>;
  archive: <K extends EntityName>(entity: K, item: AppState[K][number]) => Promise<void>;
  restore: <K extends EntityName>(entity: K, item: AppState[K][number]) => Promise<void>;
  setPage: (page: PageKey) => void;
  notify: (toast: Omit<Toast, "id">) => void;
};

export type WithChildren = { children: ReactNode };
