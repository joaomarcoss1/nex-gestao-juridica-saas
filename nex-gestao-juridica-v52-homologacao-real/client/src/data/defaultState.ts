import type { AppState, PageKey } from "@/types/app";
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  ClipboardCheck,
  CircleDollarSign,
  Scale,
  FileText,
  Fingerprint,
  Home,
  Zap,
  BarChart3,
  Settings,
  ScrollText,
  CalendarClock,
  FileSpreadsheet,
  PlugZap,
  MessageSquareText,
  UserRoundPlus,
  CalendarDays,
  Network,
  Building2,
  Activity,
  Rocket,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export const today = new Date();
export const isoToday = today.toISOString().slice(0, 10);
export const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
export const inThreeDays = new Date(today.getTime() + 86400000 * 3).toISOString().slice(0, 10);
export const inSevenDays = new Date(today.getTime() + 86400000 * 7).toISOString().slice(0, 10);


const ORG1 = "00000000-0000-4000-8000-000000000001";
const U1 = "00000000-0000-4000-8000-0000000000u1";
const U2 = "00000000-0000-4000-8000-0000000000u2";
const D1 = "00000000-0000-4000-8000-0000000000d1";
const D2 = "00000000-0000-4000-8000-0000000000d2";
const D3 = "00000000-0000-4000-8000-0000000000d3";
const T1 = "00000000-0000-4000-8000-0000000000t1";
const T2 = "00000000-0000-4000-8000-0000000000t2";
const WF1 = "00000000-0000-4000-8000-0000000000w1";
const WF2 = "00000000-0000-4000-8000-0000000000w2";
const E1 = "00000000-0000-4000-8000-0000000000e1";
const E2 = "00000000-0000-4000-8000-0000000000e2";
const E3 = "00000000-0000-4000-8000-0000000000e3";
const E4 = "00000000-0000-4000-8000-0000000000e4";
const E5 = "00000000-0000-4000-8000-0000000000e5";
const C1 = "00000000-0000-4000-8000-0000000000c1";
const C2 = "00000000-0000-4000-8000-0000000000c2";
const C3 = "00000000-0000-4000-8000-0000000000c3";
const P1 = "00000000-0000-4000-8000-0000000000a1";
const P2 = "00000000-0000-4000-8000-0000000000a2";
const P3 = "00000000-0000-4000-8000-0000000000a3";
const P4 = "00000000-0000-4000-8000-0000000000a4";
const L1 = "00000000-0000-4000-8000-0000000000b1";
const L2 = "00000000-0000-4000-8000-0000000000b2";
const L3 = "00000000-0000-4000-8000-0000000000b3";
const L4 = "00000000-0000-4000-8000-0000000000b4";

export const pages: Array<{ key: PageKey; label: string; icon: LucideIcon; description: string }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Visão executiva" },
  { key: "crm", label: "CRM", icon: UserRoundPlus, description: "Funil jurídico e conversão" },
  { key: "clientes", label: "Clientes", icon: Users, description: "Carteira, histórico e portal" },
  { key: "processos", label: "Processos", icon: BriefcaseBusiness, description: "Processos e casos" },
  { key: "tarefas", label: "Tarefas", icon: ClipboardCheck, description: "Workflow operacional" },
  { key: "prazos", label: "Prazos", icon: CalendarClock, description: "Controle processual" },
  { key: "agenda", label: "Agenda", icon: CalendarDays, description: "Audiências e compromissos" },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Gestão documental" },
  { key: "financeiro", label: "Financeiro", icon: CircleDollarSign, description: "Honorários, custas e DRE" },
  { key: "precificacao", label: "Precificação", icon: Scale, description: "Honorários técnicos" },
  { key: "portal", label: "Portal do Cliente", icon: Home, description: "Área externa segura" },
  { key: "chat", label: "Comunicação", icon: MessageSquareText, description: "Chat interno e cliente" },
  { key: "ponto", label: "Ponto Corporativo", icon: Fingerprint, description: "Frequência com PIN" },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, description: "BI jurídico e gestão" },
  { key: "equipe", label: "Equipe", icon: Building2, description: "Hierarquia e desempenho" },
  { key: "empresas", label: "Empresas", icon: Building2, description: "Multiempresa, matrícula e suporte" },
  { key: "modulos", label: "Módulos Jurídicos", icon: Network, description: "Áreas especializadas" },
  { key: "folha", label: "Folha gerencial", icon: FileSpreadsheet, description: "Holerites e pagamentos" },
  { key: "automacoes", label: "Automações", icon: Zap, description: "Regras sem IA" },
  { key: "auditoria", label: "Auditoria", icon: ScrollText, description: "Logs e LGPD" },
  { key: "integracoes", label: "Integrações", icon: PlugZap, description: "APIs externas" },
  { key: "status", label: "Status do Sistema", icon: Activity, description: "Diagnóstico comercial e produção" },
  { key: "onboarding", label: "Onboarding", icon: Rocket, description: "Primeira configuração assistida" },
  { key: "assinatura", label: "Assinatura", icon: CreditCard, description: "Planos, Stripe e cobrança" },
  { key: "configuracoes", label: "Configurações", icon: Settings, description: "Segurança e produção" },
];

export const stages = ["Novo lead", "Primeiro contato", "Triagem", "Documentos solicitados", "Análise jurídica", "Proposta enviada", "Negociação", "Contrato enviado", "Cliente convertido", "Perdido"];
export const phases = ["Atendimento inicial", "Análise documental", "Proposta", "Contrato", "Petição inicial", "Distribuição", "Citação", "Contestação", "Réplica", "Instrução", "Audiência", "Sentença", "Recurso", "Execução", "Encerramento"];

export const defaultState: AppState = {
  organizations: [
    { id: ORG1, registrationCode: "3272026", name: "Nex Gestão Jurídica Enterprise", tradeName: "Nex Jurídico Demo", document: "00.000.000/0001-00", email: "contato@nexlabs.app", phone: "(99) 99999-0000", responsibleName: "João Marcos Gomes Pereira", responsibleEmail: "joaomarcosgpp@hotmail.com", city: "Codó", state: "MA", address: "Rua corporativa, 100", plan: "Enterprise", headquartersCity: "Codó-MA", status: "Ativa", accessBlocked: false },
  ],
  units: [
    { id: U1, organizationId: ORG1, name: "Matriz Jurídica", city: "Codó", state: "MA", managerId: E1, status: "Ativa" },
    { id: U2, organizationId: ORG1, name: "Núcleo Corporativo Remoto", city: "São Luís", state: "MA", managerId: E2, status: "Ativa" },
  ],
  departments: [
    { id: D1, organizationId: ORG1, unitId: U1, name: "Controladoria Jurídica", legalArea: "Operações", managerId: E3, status: "Ativo" },
    { id: D2, organizationId: ORG1, unitId: U1, name: "Contencioso e Consultivo", legalArea: "Full service", managerId: E2, status: "Ativo" },
    { id: D3, organizationId: ORG1, unitId: U1, name: "Financeiro/RH", legalArea: "Administrativo", managerId: E4, status: "Ativo" },
  ],
  teams: [
    { id: T1, organizationId: ORG1, unitId: U1, departmentId: D2, name: "Célula Trabalhista e Consumidor", coordinatorId: E2, legalArea: "Trabalhista/Consumidor", capacity: 42, status: "Ativa" },
    { id: T2, organizationId: ORG1, unitId: U1, departmentId: D2, name: "Célula Empresarial, Tributária e Rural", coordinatorId: E1, legalArea: "Empresarial/Tributário/Agrário", capacity: 34, status: "Ativa" },
  ],
  teamMembers: [
    { id: "tm1", teamId: T1, employeeId: E2, role: "Coordenador", workloadPercent: 80 },
    { id: "tm2", teamId: T1, employeeId: E5, role: "Estagiário", workloadPercent: 60 },
    { id: "tm3", teamId: T2, employeeId: E1, role: "Sócio", workloadPercent: 70 },
    { id: "tm4", teamId: T2, employeeId: E3, role: "Controladoria", workloadPercent: 50 },
  ],
  workflowTemplates: [
    { id: WF1, organizationId: ORG1, moduleArea: "Geral", name: "Workflow jurídico padrão", description: "Fluxo base para judicial, administrativo e extrajudicial com automações por etapa.", active: true },
    { id: WF2, organizationId: ORG1, moduleArea: "Agrário/Rural", name: "Regularização fundiária rural", description: "Cadastro, checklist, vistoria, georreferenciamento, protocolos e entrega final.", active: true },
  ],
  workflowSteps: [
    { id: "wfs1", workflowId: WF1, order: 1, name: "Novo caso", createsTask: true, taskTitle: "Triagem inicial do caso", responsibleRole: "Controladoria", requiresDocument: true, notifyClient: false, autoPriority: "Alta" },
    { id: "wfs2", workflowId: WF1, order: 2, name: "Análise documental", createsTask: true, taskTitle: "Validar documentos e pendências", responsibleRole: "Advogado", requiresDocument: true, notifyClient: true, autoPriority: "Alta" },
    { id: "wfs3", workflowId: WF1, order: 3, name: "Peça/ato em elaboração", createsTask: true, taskTitle: "Elaborar ato jurídico", responsibleRole: "Advogado", autoPriority: "Urgente" },
    { id: "wfs4", workflowId: WF1, order: 4, name: "Revisão", createsTask: true, taskTitle: "Revisão técnica pelo responsável", responsibleRole: "Coordenador", autoPriority: "Urgente" },
    { id: "wfs5", workflowId: WF2, order: 1, name: "Cadastro do imóvel", createsTask: true, taskTitle: "Completar matrícula, CAR, CCIR, ITR e CIB", responsibleRole: "Assistente", requiresDocument: true, autoPriority: "Alta" },
    { id: "wfs6", workflowId: WF2, order: 2, name: "Georreferenciamento", createsTask: true, taskTitle: "Acompanhar técnico, memorial e SIGEF", responsibleRole: "Advogado", requiresDocument: true, autoPriority: "Alta" },
    { id: "wfs7", workflowId: WF2, order: 3, name: "Protocolo e exigências", createsTask: true, taskTitle: "Controlar protocolos rurais e exigências", responsibleRole: "Controladoria", notifyClient: true, autoPriority: "Urgente" },
  ],
  workflowRuns: [],
  workflowRunSteps: [],
  legalModuleRecords: [
    { id: "lmr1", organizationId: ORG1, moduleArea: "Trabalhista", processId: P1, clientId: C1, client: "Wallace Pereira", serviceType: "Reclamação trabalhista", stage: "Audiência", status: "Ativo", responsibleId: E2, fieldValues: { Cargo: "Operador", Salário: "R$ 2.300,00", Jornada: "Escala 6x1", "Horas extras": "Sim" }, checklist: [{ label: "Contrato", done: true }, { label: "Holerites", done: true }, { label: "Testemunhas", done: false }], indicators: { risco: "Médio", documentosPendentes: 1 } },
    { id: "lmr2", organizationId: ORG1, moduleArea: "Agrário/Rural", processId: P3, clientId: C3, client: "Loja Saldão LTDA", serviceType: "Regularização fundiária", stage: "Checklist rural", status: "Em análise", responsibleId: E1, fieldValues: { CAR: "Pendente retificação", CCIR: "Atualizado", SIGEF: "Não protocolado" }, checklist: [{ label: "Matrícula", done: true }, { label: "CAR", done: false }, { label: "Memorial", done: false }], indicators: { pendencias: 2, protocolos: 1 } },
  ],
  ruralProperties: [
    { id: "rp1", organizationId: ORG1, clientId: C3, processId: P3, name: "Fazenda Boa Esperança", propertyType: "Fazenda", owner: "Loja Saldão LTDA", possessor: "Diretoria administrativa", municipality: "Codó", state: "MA", locality: "Zona Rural", declaredArea: 215, measuredArea: 212.4, registeredArea: 200, registryNumber: "Matrícula 12.445", notaryOffice: "1º Ofício de Codó", ccir: "CCIR-2026-8871", car: "MA-2103307-AAA", itr: "ITR 2025 entregue", cib: "CIB pendente", nirf: "NIRF 00112233", sigef: "Aguardando memorial", incra: "Atualização cadastral pendente", coordinates: "S 04° / W 43°", memorial: "Memorial em elaboração por técnico credenciado.", boundaries: "Norte: Estrada vicinal; Sul: Rio local; Leste/Oeste: confrontantes rurais.", legalReserve: "Reserva legal declarada", appArea: "APP em validação", productiveArea: "168 ha", preservationArea: "44 ha", environmentalStatus: "CAR com pendência", taxStatus: "ITR regular", registryStatus: "Área medida diverge da matrícula", landStatus: "Regularização fundiária em curso", pendingItems: ["Retificar CAR", "Protocolar SIGEF", "Atualizar CIB"], protocols: ["INCRA: aberto", "Cartório: exigência documental"], technicalResponsible: "Eng. Agrimensor contratado", artRrt: "ART pendente" },
  ],
  documentFolders: [
    { id: "df1", organizationId: ORG1, clientId: C1, processId: P1, name: "Documentos pessoais e procuração", accessLevel: "Cliente" },
    { id: "df2", organizationId: ORG1, clientId: C3, processId: P3, name: "Dossiê rural", accessLevel: "Restrito" },
  ],
  documentVersions: [
    { id: "dv1", documentId: "00000000-0000-4000-8000-0000000000d7", version: "v4", hash: "demo-hash-contrato-v4", changedBy: E1, changeNote: "Versão aprovada para assinatura", createdAt: isoToday },
  ],
  documentTemplates: [
    { id: "dt1", moduleArea: "Geral", name: "Procuração", type: "Procuração", body: "Modelo de procuração com poderes gerais e específicos.", clientVisibleDefault: true },
    { id: "dt2", moduleArea: "Agrário/Rural", name: "Dossiê do imóvel rural", type: "Relatório", body: "Relatório de matrícula, CAR, CCIR, ITR, CIB, SIGEF, memorial e pendências.", clientVisibleDefault: false },
  ],
  feeContracts: [
    { id: "fc1", clientId: C1, processId: P1, title: "Contrato de honorários trabalhistas", feeType: "Contratual", totalAmount: 9500, entryAmount: 2500, installments: 4, successPercent: 20, status: "Ativo", signedAt: isoToday },
    { id: "fc2", clientId: C3, processId: P3, title: "Consultivo tributário e rural", feeType: "Mensal", totalAmount: 18000, entryAmount: 5200, installments: 6, status: "Enviado" },
  ],
  costEntries: [
    { id: "ce1", clientId: C1, processId: P1, category: "Custas", description: "Guia de diligência para audiência", amount: 280, dueDate: tomorrow, status: "Pendente", responsibleId: E4 },
    { id: "ce2", clientId: C3, processId: P3, category: "Correspondente", description: "Protocolo cartório e certidões rurais", amount: 740, dueDate: inSevenDays, status: "Pendente", responsibleId: E1 },
  ],
  pointSchedules: [
    { id: "ps1", employeeId: E1, unitId: U1, departmentId: D2, scheduleType: "Advogado associado", entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00", toleranceMinutes: 15, dailyHours: 8, workDays: ["Seg", "Ter", "Qua", "Qui", "Sex"], managerId: E1, active: true },
    { id: "ps2", employeeId: E4, unitId: U1, departmentId: D3, scheduleType: "Administrativo integral", entrada: "09:00", saida_intervalo: "12:30", retorno_intervalo: "14:00", saida_final: "18:30", toleranceMinutes: 10, dailyHours: 8, workDays: ["Seg", "Ter", "Qua", "Qui", "Sex"], managerId: E4, active: true },
  ],
  pointAdjustments: [
    { id: "pa1", employeeId: E3, date: isoToday, kind: "retorno_intervalo", requestedTime: "14:05", reason: "Esquecimento de retorno do almoço", status: "Pendente" },
  ],
  pointJustifications: [
    { id: "pj1", employeeId: E4, timeRecordId: "00000000-0000-4000-8000-000000000013", date: isoToday, reason: "Trânsito intenso na entrada da cidade", status: "Pendente" },
  ],
  notifications: [
    { id: "n1", userId: E2, clientId: C1, title: "Mensagem de cliente aguardando resposta", body: "Wallace Pereira perguntou sobre audiência no portal.", module: "Portal", priority: "Alta" },
  ],
  employees: [
    { id: E1, organizationId: ORG1, name: "João Marcos Gomes Pereira", cpf: "000.000.000-00", pinHash: "nex_pin_hash_2026_local_demo", role: "Sócio administrador", sector: "Sócios", email: "joaomarcosgpp@hotmail.com", phone: "(99) 99999-0000", oab: "MA 00000", baseSalary: 8500, hourlyRate: 95, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Híbrido", status: "Ativo", score: 94 },
    { id: E2, organizationId: ORG1, name: "Dra. Larissa Almeida", cpf: "111.111.111-11", pinHash: "nex_pin_hash_1234_local_demo", role: "Advogada responsável", sector: "Advocacia", email: "larissa@nexjuridico.com", phone: "(99) 98888-1111", oab: "MA 12345", baseSalary: 7200, hourlyRate: 120, schedule: { entrada: "08:30", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:30" }, mode: "Presencial", status: "Ativo", score: 91 },
    { id: E3, organizationId: ORG1, name: "Carlos Eduardo Lima", cpf: "222.222.222-22", pinHash: "nex_pin_hash_4321_local_demo", role: "Controladoria jurídica", sector: "Controladoria", email: "carlos@nexjuridico.com", phone: "(99) 97777-2222", baseSalary: 4200, hourlyRate: 45, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Presencial", status: "Ativo", score: 86 },
    { id: E4, organizationId: ORG1, name: "Ana Paula Rocha", cpf: "333.333.333-33", pinHash: "nex_pin_hash_1111_local_demo", role: "Financeiro", sector: "Financeiro", email: "ana@nexjuridico.com", phone: "(99) 96666-3333", baseSalary: 3600, hourlyRate: 35, schedule: { entrada: "09:00", saida_intervalo: "12:30", retorno_intervalo: "14:00", saida_final: "18:30" }, mode: "Presencial", status: "Ativo", score: 88 },
    { id: E5, organizationId: ORG1, name: "Rafael Sousa", cpf: "444.444.444-44", pinHash: "nex_pin_hash_2222_local_demo", role: "Estagiário", sector: "Estagiários", email: "rafael@nexjuridico.com", phone: "(99) 95555-4444", baseSalary: 1200, hourlyRate: 18, schedule: { entrada: "14:00", saida_intervalo: "17:00", retorno_intervalo: "17:15", saida_final: "20:00" }, mode: "Presencial", status: "Ativo", score: 79 },
  ],
  leadSources: [
    { id: "00000000-0000-4000-8000-0000000000ls", organizationId: ORG1, provider: "Google Leads", sourceName: "Google Leads principal", status: "prepared", defaultArea: "Civil", defaultResponsibleId: E3, isDefault: true, active: true },
  ],
  leads: [
    { id: L1, name: "Wallace Pereira", phone: "(99) 90000-1001", origin: "Instagram", area: "Trabalhista", stage: "Proposta enviada", value: 6500, nextContact: tomorrow, responsible: E2 },
    { id: L2, name: "Lorraine Lima", phone: "(99) 90000-1002", origin: "Indicação", area: "Família", stage: "Consulta agendada", value: 4200, nextContact: inThreeDays, responsible: E2 },
    { id: L3, name: "Carlos Alberto", phone: "(99) 90000-1003", origin: "Site", area: "Cível", stage: "Contrato em análise", value: 12800, nextContact: inSevenDays, responsible: E1 },
    { id: L4, name: "Loja Saldão LTDA", phone: "(99) 90000-1004", origin: "Google", area: "Empresarial", stage: "Novo lead", value: 9000, nextContact: tomorrow, responsible: E1 },
  ],
  clients: [
    { id: C1, organizationId: ORG1, type: "PF", name: "Wallace Pereira", document: "000.111.222-33", city: "Codó-MA", origin: "Instagram", status: "Ativo", responsible: E2, processes: 2, lifetimeValue: 14800, phone: "(99) 90000-1001" },
    { id: C2, organizationId: ORG1, type: "PF", name: "Lorraine Lima", document: "111.222.333-44", city: "Timbiras-MA", origin: "Indicação", status: "Ativo", responsible: E2, processes: 1, lifetimeValue: 7200, phone: "(99) 90000-1002" },
    { id: C3, organizationId: ORG1, type: "PJ", name: "Loja Saldão LTDA", document: "00.111.222/0001-44", city: "Codó-MA", origin: "Google", status: "Prospecto", responsible: E1, processes: 1, lifetimeValue: 12000, phone: "(99) 90000-1004" },
  ],
  processes: [
    { id: P1, organizationId: ORG1, cnj: "0800123-45.2026.8.10.0034", client: "Wallace Pereira", opposite: "Construtora Norte", area: "Trabalhista", court: "TRT 16ª Região", class: "Reclamação Trabalhista", phase: "Audiência", status: "Audiência marcada", risk: "Médio", successChance: 72, value: 52000, fees: 9500, responsible: E2, nextDeadline: tomorrow, lastMoveDays: 4, progress: 62 },
    { id: P2, organizationId: ORG1, cnj: "0800987-77.2026.8.10.0034", client: "Lorraine Lima", opposite: "Banco Alfa", area: "Consumidor", court: "TJMA", class: "Indenização", phase: "Réplica", status: "Em andamento", risk: "Baixo", successChance: 84, value: 18000, fees: 4800, responsible: E2, nextDeadline: inThreeDays, lastMoveDays: 18, progress: 48 },
    { id: P3, organizationId: ORG1, cnj: "0002451-88.2026.8.10.0001", client: "Loja Saldão LTDA", opposite: "Fisco Municipal", area: "Tributário", court: "TJMA", class: "Mandado de Segurança", phase: "Petição inicial", status: "Em análise", risk: "Alto", successChance: 58, value: 120000, fees: 18000, responsible: E1, nextDeadline: inSevenDays, lastMoveDays: 127, progress: 22 },
    { id: P4, organizationId: ORG1, cnj: "0003020-10.2025.8.10.0034", client: "Carlos Alberto", opposite: "Estado do Maranhão", area: "Criminal", court: "TJMA", class: "Habeas Corpus", phase: "Recurso", status: "Recurso", risk: "Alto", successChance: 51, value: 0, fees: 15500, responsible: E1, nextDeadline: tomorrow, lastMoveDays: 1, progress: 78 },
  ],
  processMovements: [],
  processPhaseHistory: [],
  deadlines: [
    { id: "00000000-0000-4000-8000-0000000000p1", processId: P1, client: "Wallace Pereira", responsible: E2, type: "Manifestação sobre documentos", publicationDate: isoToday, awarenessDate: isoToday, startDate: isoToday, days: 5, countType: "Dias úteis", dueDate: inSevenDays, fatal: true, priority: "Crítica", status: "Pendente", notes: "Validar prazo pelo advogado responsável." },
    { id: "00000000-0000-4000-8000-0000000000p2", processId: P2, client: "Lorraine Lima", responsible: E3, type: "Réplica", publicationDate: isoToday, awarenessDate: tomorrow, startDate: tomorrow, days: 15, countType: "Dias úteis", dueDate: inSevenDays, fatal: false, priority: "Alta", status: "Pendente", notes: "Conferir feriados locais." },
  ],
  tasks: [
    { id: "00000000-0000-4000-8000-0000000000d1", title: "Preparar audiência e roteiro de perguntas", description: "Produzir roteiro, anexar documentos-chave e enviar minuta para revisão.", processId: P1, client: "Wallace Pereira", responsible: E2, delegatedBy: E1, reviewer: E1, workflowStage: "Execução", sector: "Advocacia", priority: "Crítica", status: "Pendente", due: tomorrow, estimatedHours: 4, spentHours: 1.5, slaHours: 24, qualityScore: 91, checklist: ["Confirmar testemunhas", "Separar documentos", "Roteiro de perguntas"] },
    { id: "00000000-0000-4000-8000-0000000000d2", title: "Revisar documentos anexados pelo portal", description: "Conferir legibilidade, validade e pertinência antes de liberar ao advogado responsável.", processId: P2, client: "Lorraine Lima", responsible: E3, delegatedBy: E2, reviewer: E2, workflowStage: "Revisão", sector: "Controladoria", priority: "Alta", status: "Revisão", due: inThreeDays, estimatedHours: 2, spentHours: 0.8, slaHours: 16, qualityScore: 88 },
    { id: "00000000-0000-4000-8000-0000000000d3", title: "Emitir cobrança recorrente de honorários", description: "Gerar cobrança e registrar recibo interno depois da confirmação.", processId: P1, client: "Wallace Pereira", responsible: E4, delegatedBy: E1, reviewer: E1, workflowStage: "Execução", sector: "Financeiro", priority: "Média", status: "Pendente", due: isoToday, estimatedHours: 1, spentHours: 0, slaHours: 8, qualityScore: 84 },
    { id: "00000000-0000-4000-8000-0000000000d4", title: "Protocolar mandado de segurança", description: "Finalizar peça, anexar documentos e confirmar protocolo no tribunal.", processId: P3, client: "Loja Saldão LTDA", responsible: E1, delegatedBy: E1, reviewer: E1, workflowStage: "Protocolo", sector: "Advocacia", priority: "Urgente", status: "Atrasada", due: isoToday, estimatedHours: 5, spentHours: 3, slaHours: 12, qualityScore: 76, blockers: ["Aguardando certidão fiscal"] },
  ],
  finances: [
    { id: "00000000-0000-4000-8000-0000000000f1", type: "Receita", category: "Honorários contratuais", client: "Wallace Pereira", processId: P1, amount: 3200, dueDate: isoToday, status: "Pago", method: "PIX", paidDate: isoToday },
    { id: "00000000-0000-4000-8000-0000000000f2", type: "Receita", category: "Parcela de contrato", client: "Lorraine Lima", processId: P2, amount: 1800, dueDate: tomorrow, status: "Pendente", method: "Boleto" },
    { id: "00000000-0000-4000-8000-0000000000f3", type: "Despesa", category: "Sistemas jurídicos", client: "Escritório", amount: 680, dueDate: isoToday, status: "Pago", method: "Cartão", paidDate: isoToday },
    { id: "00000000-0000-4000-8000-0000000000f4", type: "Despesa", category: "Diligência e deslocamento", client: "Carlos Alberto", processId: P4, amount: 460, dueDate: isoToday, status: "Pendente", method: "PIX" },
    { id: "00000000-0000-4000-8000-0000000000f5", type: "Receita", category: "Consultoria empresarial", client: "Loja Saldão LTDA", processId: P3, amount: 5200, dueDate: inSevenDays, status: "Pendente", method: "Transferência" },
  ],
  contractInstallments: [],
  financialPayments: [],
  timeRecords: [
    { id: "00000000-0000-4000-8000-000000000011", employeeId: E1, employeeName: "João Marcos Gomes Pereira", sector: "Sócios", kind: "entrada", date: isoToday, time: "08:01", status: "normal", mode: "Presencial", location: "Escritório matriz", device: "Chrome Windows" },
    { id: "00000000-0000-4000-8000-000000000012", employeeId: E2, employeeName: "Dra. Larissa Almeida", sector: "Advocacia", kind: "entrada", date: isoToday, time: "08:24", status: "normal", mode: "Presencial", location: "Escritório matriz", device: "Chrome Windows" },
    { id: "00000000-0000-4000-8000-000000000013", employeeId: E4, employeeName: "Ana Paula Rocha", sector: "Financeiro", kind: "entrada", date: isoToday, time: "09:44", status: "justificado", mode: "Presencial", location: "Escritório matriz", device: "Mobile", justification: "Trânsito intenso na entrada da cidade" },
  ],
  documents: [
    { id: "00000000-0000-4000-8000-0000000000d5", name: "Procuração Wallace Pereira", type: "Procuração", client: "Wallace Pereira", processId: P1, status: "Assinatura", origin: "Editor", responsible: E2, version: "v2", createdAt: isoToday },
    { id: "00000000-0000-4000-8000-0000000000d6", name: "Comprovante de residência Lorraine", type: "Comprovante", client: "Lorraine Lima", processId: P2, status: "Em análise", origin: "Câmera", responsible: E3, version: "v1", createdAt: isoToday },
    { id: "00000000-0000-4000-8000-0000000000d7", name: "Contrato de honorários Loja Saldão", type: "Contrato", client: "Loja Saldão LTDA", processId: P3, status: "Aprovado", origin: "Editor", responsible: E1, version: "v4", createdAt: isoToday },
  ],
  protocols: [
    { id: "00000000-0000-4000-8000-0000000000f6", number: "TJMA-2026-001245", body: "TJMA", processId: P3, document: "Mandado de Segurança", status: "Pendente", date: isoToday, responsible: E1 },
    { id: "00000000-0000-4000-8000-0000000000f7", number: "TRT16-2026-7731", body: "TRT16", processId: P1, document: "Rol de testemunhas", status: "Protocolado", date: isoToday, responsible: E2 },
  ],
  signatures: [
    { id: "00000000-0000-4000-8000-0000000000f8", document: "Procuração Wallace Pereira", signer: "Wallace Pereira", role: "Cliente", status: "Solicitada", date: isoToday, ip: "189.20.10.55" },
    { id: "00000000-0000-4000-8000-0000000000f9", document: "Contrato Loja Saldão", signer: "Diretor Loja Saldão", role: "Cliente PJ", status: "Assinada", date: isoToday, ip: "189.20.10.84" },
  ],
  messages: [
    { id: "00000000-0000-4000-8000-0000000000a5", channel: "Chat", client: "Wallace Pereira", clientId: C1, processId: P1, subject: "Dra., qual o horário da audiência?", body: "Bom dia, gostaria de confirmar o horário e os documentos necessários para a audiência.", status: "Pendente", date: isoToday, senderName: "Wallace Pereira", senderRole: "cliente", responsibleId: E2, direction: "cliente_para_escritorio" },
    { id: "00000000-0000-4000-8000-0000000000a6", channel: "Chat", client: "Wallace Pereira", clientId: C1, processId: P1, subject: "Confirmação de audiência", body: "Bom dia, Wallace. A audiência está marcada para 9h. Leve RG, carteira de trabalho e comprovantes enviados no portal.", status: "Respondida", date: isoToday, senderId: E2, senderName: "Dra. Larissa Almeida", senderRole: "advogado", responsibleId: E2, direction: "escritorio_para_cliente", answeredAt: isoToday },
    { id: "00000000-0000-4000-8000-0000000000a7", channel: "Chat", client: "Lorraine Lima", clientId: C2, processId: P2, subject: "Enviei o comprovante pelo portal", body: "Enviei o comprovante solicitado. Precisa de mais algum documento?", status: "Em análise", date: isoToday, senderName: "Lorraine Lima", senderRole: "cliente", responsibleId: E2, direction: "cliente_para_escritorio" },
  ],
  automations: [
    { id: "00000000-0000-4000-8000-0000000000a8", name: "Novo processo gera operação inicial", trigger: "Processo criado", actions: ["Criar checklist documental", "Gerar tarefa para advogado", "Abrir pasta do cliente", "Criar cobrança de entrada"], module: "Processos", status: "Ativa", lastRun: isoToday, executions: 28, successRate: 98 },
    { id: "00000000-0000-4000-8000-0000000000a9", name: "Audiência marcada prepara equipe", trigger: "Audiência cadastrada", actions: ["Criar roteiro de audiência", "Avisar cliente", "Agendar lembrete D-1"], module: "Processos", status: "Ativa", lastRun: tomorrow, executions: 14, successRate: 96 },
    { id: "00000000-0000-4000-8000-0000000000aa", name: "Cobrança automática de honorários", trigger: "Parcela vence em 3 dias", actions: ["Enviar lembrete", "Gerar mensagem", "Marcar cobrança"], module: "Financeiro", status: "Ativa", lastRun: isoToday, executions: 41, successRate: 94 },
    { id: "00000000-0000-4000-8000-0000000000ab", name: "Ponto com atraso abre justificativa", trigger: "Atraso acima de 30 minutos", actions: ["Solicitar justificativa", "Notificar RH", "Criar pendência"], module: "Ponto", status: "Ativa", lastRun: isoToday, executions: 9, successRate: 100 },
    { id: "00000000-0000-4000-8000-0000000000ac", name: "Documento enviado pelo cliente", trigger: "Upload no portal", actions: ["Classificar documento", "Notificar responsável", "Criar tarefa de conferência"], module: "Documentos", status: "Ativa", lastRun: inThreeDays, executions: 19, successRate: 97 },
  ],
  automationRuns: [
    { id: "00000000-0000-4000-8000-0000000000ad", ruleId: "00000000-0000-4000-8000-0000000000a8", ruleName: "Novo processo gera operação inicial", result: "Checklist, tarefa e cobrança criados para Loja Saldão LTDA", date: isoToday, status: "Sucesso" },
    { id: "00000000-0000-4000-8000-0000000000ae", ruleId: "00000000-0000-4000-8000-0000000000ab", ruleName: "Ponto com atraso abre justificativa", result: "Justificativa registrada e enviada ao RH", date: isoToday, status: "Sucesso" },
    { id: "00000000-0000-4000-8000-0000000000af", ruleId: "00000000-0000-4000-8000-0000000000aa", ruleName: "Cobrança automática de honorários", result: "Lembrete financeiro gerado para parcela pendente", date: tomorrow, status: "Atenção" },
  ],
  pricings: [
    { id: "00000000-0000-4000-8000-0000000000e6", title: "Defesa criminal completa", client: "Carlos Alberto", processId: P4, area: "Criminal", service: "Defesa criminal", minimum: 12500, recommended: 18500, premium: 24000, entry: 5550, successFee: 0, status: "Enviada", createdAt: isoToday, version: "v1", oabState: "MA", oabYear: 2026 },
  ],
  payrolls: [
    { id: "00000000-0000-4000-8000-000000000090", employeeId: E2, employeeName: "Dra. Larissa Almeida", month: today.getMonth()+1, year: today.getFullYear(), baseSalary: 7200, workedHours: 176, overtime: 4, absences: 0, delays: 0.5, benefits: 450, discounts: 820, commissions: 600, gross: 8250, net: 7430, status: "Rascunho" },
    { id: "00000000-0000-4000-8000-000000000091", employeeId: E4, employeeName: "Ana Paula Rocha", month: today.getMonth()+1, year: today.getFullYear(), baseSalary: 3600, workedHours: 170, overtime: 2, absences: 0, delays: 1, benefits: 250, discounts: 390, commissions: 0, gross: 3850, net: 3460, status: "Rascunho" },
  ],
  integrations: [
    { id: "00000000-0000-4000-8000-000000000092", provider: "Asaas", status: "Preparado", description: "PIX, boleto e cobrança recorrente. Exige backend seguro e webhook.", requiresBackend: true },
    { id: "00000000-0000-4000-8000-000000000093", provider: "WhatsApp Business", status: "Preparado", description: "Mensagens e notificações para clientes. Exige token seguro fora do frontend.", requiresBackend: true },
    { id: "00000000-0000-4000-8000-000000000094", provider: "Tribunais", status: "Preparado", description: "Consulta processual e intimações automáticas dependem de API/robô homologado.", requiresBackend: true },
  ],
  scheduledEvents: [
    { id: "00000000-0000-4000-8000-0000000000se", organizationId: ORG1, eventType: "manual", title: "Reunião estratégica do escritório", startsAt: `${inThreeDays}T15:00:00`, endsAt: `${inThreeDays}T16:00:00`, responsibleId: E1, status: "scheduled", notes: "Revisão de indicadores e prioridades.", clientVisible: false },
  ],
  hearings: [
    { id: "00000000-0000-4000-8000-0000000000h1", processId: P1, clientId: C1, client: "Wallace Pereira", title: "Audiência de instrução", hearingAt: `${tomorrow}T09:00:00`, type: "Instrução", location: "TRT 16ª Região", responsible: E2, checklist: ["confirmar testemunhas", "separar documentos"], status: "Agendada" },
  ],
  clientConsents: [
    { id: "00000000-0000-4000-8000-0000000000lg", clientId: C1, consentType: "Portal do Cliente", legalBasis: "Execução contratual e legítimo interesse", accepted: true, acceptedAt: isoToday },
  ],
  paymentReceipts: [],
  reportExports: [],
  auditLogs: [
    { id: "00000000-0000-4000-8000-000000000095", module: "Sistema", action: "seed", entityId: "demo", user: "Admin", date: isoToday, detail: "Base inicial carregada para demonstração e validação." },
  ],
};
