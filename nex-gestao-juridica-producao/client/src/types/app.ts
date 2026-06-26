import type { ReactNode } from "react";

export type PageKey =
  | "dashboard"
  | "clientes"
  | "processos"
  | "tarefas"
  | "financeiro"
  | "precificacao"
  | "documentos"
  | "ponto"
  | "portal"
  | "automacoes"
  | "relatorios"
  | "configuracoes";

export type TaskStatus = "Pendente" | "Em andamento" | "Aguardando cliente" | "Aguardando tribunal" | "Concluída" | "Atrasada" | "Cancelada";
export type TimeKind = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida_final";

export type Employee = {
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

export type Lead = {
  id: string;
  name: string;
  phone: string;
  origin: string;
  area: string;
  stage: string;
  value: number;
  nextContact: string;
  responsible: string;
};

export type Client = {
  id: string;
  type: "PF" | "PJ";
  name: string;
  document: string;
  city: string;
  origin: string;
  status: "Ativo" | "Prospecto" | "Inativo";
  responsible: string;
  processes: number;
  lifetimeValue: number;
  email?: string;
  phone?: string;
  address?: string;
};

export type Process = {
  id: string;
  cnj: string;
  client: string;
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
  nextDeadline: string;
  lastMoveDays: number;
  progress: number;
};

export type Task = {
  id: string;
  title: string;
  processId: string;
  client: string;
  responsible: string;
  sector: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente" | "Crítica";
  status: TaskStatus;
  due: string;
  estimatedHours: number;
  spentHours: number;
  checklist?: string[];
};

export type FinanceEntry = {
  id: string;
  type: "Receita" | "Despesa";
  category: string;
  client: string;
  processId?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "Pendente" | "Pago" | "Atrasado" | "Cancelado" | "Parcial";
  method: "PIX" | "Dinheiro" | "Cartão" | "Boleto" | "Transferência" | "Recorrente";
  notes?: string;
};

export type TimeRecord = {
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
  device: string;
  justification?: string;
};

export type LegalDoc = {
  id: string;
  name: string;
  type: string;
  client: string;
  processId: string;
  status: "Recebido" | "Em análise" | "Pendente correção" | "Aprovado" | "Protocolado" | "Arquivado" | "Assinatura";
  origin: "Câmera" | "Upload" | "Editor" | "Scanner do cliente";
  responsible: string;
  version: string;
  createdAt?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  dataUrl?: string;
  storagePath?: string;
  hash?: string;
};

export type Protocol = {
  id: string;
  number: string;
  body: string;
  processId: string;
  document: string;
  status: "Pendente" | "Protocolado" | "Aguardando retorno" | "Deferido" | "Indeferido" | "Arquivado";
  date: string;
  responsible: string;
};

export type Signature = {
  id: string;
  document: string;
  signer: string;
  role: string;
  status: "Solicitada" | "Assinada" | "Recusada";
  date: string;
  ip: string;
};

export type Message = {
  id: string;
  channel: "WhatsApp" | "E-mail" | "SMS" | "Chat";
  client: string;
  processId: string;
  subject: string;
  status: "Enviada" | "Agendada" | "Pendente";
  date: string;
};

export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  module: "Processos" | "Financeiro" | "Ponto" | "Documentos" | "CRM" | "Relatórios";
  status: "Ativa" | "Pausada" | "Rascunho";
  lastRun: string;
  executions: number;
  successRate: number;
};

export type AutomationRun = {
  id: string;
  ruleId: string;
  ruleName: string;
  result: string;
  date: string;
  status: "Sucesso" | "Atenção" | "Erro";
};

export type PricingProposal = {
  id: string;
  title: string;
  client: string;
  processId?: string;
  area: string;
  service: string;
  minimum: number;
  recommended: number;
  premium: number;
  entry: number;
  successFee: number;
  status: "Rascunho" | "Enviada" | "Aceita" | "Recusada";
  createdAt: string;
};

export type AppState = {
  employees: Employee[];
  leads: Lead[];
  clients: Client[];
  processes: Process[];
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
};

export type EntityName = keyof AppState;

export type Toast = { id: string; tone: "success" | "error" | "info"; title: string; message?: string };

export type FeaturePageProps = {
  state: AppState;
  commit: <K extends EntityName>(entity: K, value: AppState[K][number], action?: "create" | "update") => Promise<void>;
  remove: <K extends EntityName>(entity: K, id: string) => Promise<void>;
  setPage: (page: PageKey) => void;
  notify: (toast: Omit<Toast, "id">) => void;
};

export type WithChildren = { children: ReactNode };
