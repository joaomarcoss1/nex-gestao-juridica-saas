import type { ReactNode } from "react";

export type PageKey =
  | "dashboard"
  | "clientes"
  | "processos"
  | "prazos"
  | "tarefas"
  | "financeiro"
  | "precificacao"
  | "documentos"
  | "ponto"
  | "folha"
  | "portal"
  | "automacoes"
  | "relatorios"
  | "auditoria"
  | "integracoes"
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
  role: "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "rh" | "atendimento" | "controladoria" | "funcionario" | "cliente" | string;
  sector?: string;
  oab?: string;
  active: boolean;
  /** Perfil cliente: vínculo imutável usado pelo portal e pelo RLS para impedir seleção manual de outro cliente. */
  clientId?: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
};

export type TaskStatus = "Pendente" | "Em andamento" | "Aguardando cliente" | "Aguardando tribunal" | "Concluída" | "Atrasada" | "Cancelada";
export type TimeKind = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida_final";
export type Archiveable = { archivedAt?: string; updatedAt?: string; createdAt?: string };

export type Employee = Archiveable & {
  id: string;
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
  type: "PF" | "PJ";
  name: string;
  document: string;
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
  notes?: string;
};

export type Process = Archiveable & {
  id: string;
  cnj: string;
  type?: "Judicial" | "Administrativo" | "Consultivo" | "Extrajudicial" | "Contrato" | "Acordo" | "Serviço avulso";
  client: string;
  clientId?: string;
  opposite: string;
  area: string;
  court: string;
  class: string;
  phase: string;
  status: string;
  risk: "Baixo" | "Médio" | "Alto";
  successChance: number;
  value: number;
  fees: number;
  responsible: string;
  responsibleId?: string;
  nextDeadline: string;
  lastMoveDays: number;
  progress: number;
  clientVisibleSummary?: string;
  internalStrategy?: string;
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
  employeeId: string;
  employeeName: string;
  sector: string;
  kind: TimeKind;
  date: string;
  time: string;
  status: "normal" | "justificado" | "pendente_aprovacao";
  mode: "Presencial" | "Remoto";
  location: string;
  latitude?: number;
  longitude?: number;
  selfieStoragePath?: string;
  consentLgpd?: boolean;
  device: string;
  justification?: string;
  approvedBy?: string;
};

export type LegalDoc = Archiveable & {
  id: string;
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
  channel: "WhatsApp" | "E-mail" | "SMS" | "Chat";
  client: string;
  clientId?: string;
  processId: string;
  subject: string;
  body?: string;
  status: "Enviada" | "Agendada" | "Pendente";
  date: string;
};

export type AutomationRule = Archiveable & {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  conditions?: string[];
  actions: string[];
  module: "Processos" | "Financeiro" | "Ponto" | "Documentos" | "CRM" | "Relatórios" | "Prazos" | "Folha";
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
  date: string;
  detail: string;
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

export type AppState = {
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
