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
  type LucideIcon,
} from "lucide-react";

export const today = new Date();
export const isoToday = today.toISOString().slice(0, 10);
export const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
export const inThreeDays = new Date(today.getTime() + 86400000 * 3).toISOString().slice(0, 10);
export const inSevenDays = new Date(today.getTime() + 86400000 * 7).toISOString().slice(0, 10);


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
  { key: "dashboard", label: "Meu Painel", icon: LayoutDashboard, description: "Visão executiva" },
  { key: "clientes", label: "Clientes e CRM", icon: Users, description: "Captação e carteira" },
  { key: "processos", label: "Processos", icon: BriefcaseBusiness, description: "Controladoria jurídica" },
  { key: "tarefas", label: "Tarefas e prazos", icon: ClipboardCheck, description: "Workflow operacional" },
  { key: "financeiro", label: "Financeiro", icon: CircleDollarSign, description: "Receitas e despesas" },
  { key: "precificacao", label: "Precificação", icon: Scale, description: "Honorários técnicos" },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Storage e assinatura" },
  { key: "ponto", label: "Ponto", icon: Fingerprint, description: "Funcionários" },
  { key: "portal", label: "Portal cliente", icon: Home, description: "Cliente externo" },
  { key: "automacoes", label: "Automações", icon: Zap, description: "Regras internas" },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, description: "BI e exportação" },
  { key: "configuracoes", label: "Configurações", icon: Settings, description: "Segurança e produção" },
];

export const stages = ["Novo lead", "Primeiro contato", "Consulta agendada", "Proposta enviada", "Contrato em análise", "Contrato fechado", "Perdido"];
export const phases = ["Atendimento inicial", "Análise documental", "Proposta", "Contrato", "Petição inicial", "Distribuição", "Citação", "Contestação", "Réplica", "Instrução", "Audiência", "Sentença", "Recurso", "Execução", "Encerramento"];

export const defaultState: AppState = {
  employees: [
    { id: E1, name: "João Marcos Gomes Pereira", cpf: "000.000.000-00", pinHash: "nex_pin_hash_2026_local_demo", role: "Sócio administrador", sector: "Sócios", email: "joaomarcosgpp@hotmail.com", phone: "(99) 99999-0000", oab: "MA 00000", baseSalary: 8500, hourlyRate: 95, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Híbrido", status: "Ativo", score: 94 },
    { id: E2, name: "Dra. Larissa Almeida", cpf: "111.111.111-11", pinHash: "nex_pin_hash_1234_local_demo", role: "Advogada responsável", sector: "Advocacia", email: "larissa@nexjuridico.com", phone: "(99) 98888-1111", oab: "MA 12345", baseSalary: 7200, hourlyRate: 120, schedule: { entrada: "08:30", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:30" }, mode: "Presencial", status: "Ativo", score: 91 },
    { id: E3, name: "Carlos Eduardo Lima", cpf: "222.222.222-22", pinHash: "nex_pin_hash_4321_local_demo", role: "Controladoria jurídica", sector: "Controladoria", email: "carlos@nexjuridico.com", phone: "(99) 97777-2222", baseSalary: 4200, hourlyRate: 45, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Presencial", status: "Ativo", score: 86 },
    { id: E4, name: "Ana Paula Rocha", cpf: "333.333.333-33", pinHash: "nex_pin_hash_1111_local_demo", role: "Financeiro", sector: "Financeiro", email: "ana@nexjuridico.com", phone: "(99) 96666-3333", baseSalary: 3600, hourlyRate: 35, schedule: { entrada: "09:00", saida_intervalo: "12:30", retorno_intervalo: "14:00", saida_final: "18:30" }, mode: "Presencial", status: "Ativo", score: 88 },
    { id: E5, name: "Rafael Sousa", cpf: "444.444.444-44", pinHash: "nex_pin_hash_2222_local_demo", role: "Estagiário", sector: "Estagiários", email: "rafael@nexjuridico.com", phone: "(99) 95555-4444", baseSalary: 1200, hourlyRate: 18, schedule: { entrada: "14:00", saida_intervalo: "17:00", retorno_intervalo: "17:15", saida_final: "20:00" }, mode: "Presencial", status: "Ativo", score: 79 },
  ],
  leads: [
    { id: L1, name: "Wallace Pereira", phone: "(99) 90000-1001", origin: "Instagram", area: "Trabalhista", stage: "Proposta enviada", value: 6500, nextContact: tomorrow, responsible: E2 },
    { id: L2, name: "Lorraine Lima", phone: "(99) 90000-1002", origin: "Indicação", area: "Família", stage: "Consulta agendada", value: 4200, nextContact: inThreeDays, responsible: E2 },
    { id: L3, name: "Carlos Alberto", phone: "(99) 90000-1003", origin: "Site", area: "Cível", stage: "Contrato em análise", value: 12800, nextContact: inSevenDays, responsible: E1 },
    { id: L4, name: "Loja Saldão LTDA", phone: "(99) 90000-1004", origin: "Google", area: "Empresarial", stage: "Novo lead", value: 9000, nextContact: tomorrow, responsible: E1 },
  ],
  clients: [
    { id: C1, type: "PF", name: "Wallace Pereira", document: "000.111.222-33", city: "Codó-MA", origin: "Instagram", status: "Ativo", responsible: E2, processes: 2, lifetimeValue: 14800, phone: "(99) 90000-1001" },
    { id: C2, type: "PF", name: "Lorraine Lima", document: "111.222.333-44", city: "Timbiras-MA", origin: "Indicação", status: "Ativo", responsible: E2, processes: 1, lifetimeValue: 7200, phone: "(99) 90000-1002" },
    { id: C3, type: "PJ", name: "Loja Saldão LTDA", document: "00.111.222/0001-44", city: "Codó-MA", origin: "Google", status: "Prospecto", responsible: E1, processes: 1, lifetimeValue: 12000, phone: "(99) 90000-1004" },
  ],
  processes: [
    { id: P1, cnj: "0800123-45.2026.8.10.0034", client: "Wallace Pereira", opposite: "Construtora Norte", area: "Trabalhista", court: "TRT 16ª Região", class: "Reclamação Trabalhista", phase: "Audiência", status: "Audiência marcada", risk: "Médio", successChance: 72, value: 52000, fees: 9500, responsible: E2, nextDeadline: tomorrow, lastMoveDays: 4, progress: 62 },
    { id: P2, cnj: "0800987-77.2026.8.10.0034", client: "Lorraine Lima", opposite: "Banco Alfa", area: "Consumidor", court: "TJMA", class: "Indenização", phase: "Réplica", status: "Em andamento", risk: "Baixo", successChance: 84, value: 18000, fees: 4800, responsible: E2, nextDeadline: inThreeDays, lastMoveDays: 18, progress: 48 },
    { id: P3, cnj: "0002451-88.2026.8.10.0001", client: "Loja Saldão LTDA", opposite: "Fisco Municipal", area: "Tributário", court: "TJMA", class: "Mandado de Segurança", phase: "Petição inicial", status: "Em análise", risk: "Alto", successChance: 58, value: 120000, fees: 18000, responsible: E1, nextDeadline: inSevenDays, lastMoveDays: 127, progress: 22 },
    { id: P4, cnj: "0003020-10.2025.8.10.0034", client: "Carlos Alberto", opposite: "Estado do Maranhão", area: "Criminal", court: "TJMA", class: "Habeas Corpus", phase: "Recurso", status: "Recurso", risk: "Alto", successChance: 51, value: 0, fees: 15500, responsible: E1, nextDeadline: tomorrow, lastMoveDays: 1, progress: 78 },
  ],
  tasks: [
    { id: "00000000-0000-4000-8000-0000000000d1", title: "Preparar audiência e roteiro de perguntas", processId: P1, client: "Wallace Pereira", responsible: E2, sector: "Advocacia", priority: "Crítica", status: "Pendente", due: tomorrow, estimatedHours: 4, spentHours: 1.5, checklist: ["Confirmar testemunhas", "Separar documentos", "Roteiro de perguntas"] },
    { id: "00000000-0000-4000-8000-0000000000d2", title: "Revisar documentos anexados pelo portal", processId: P2, client: "Lorraine Lima", responsible: E3, sector: "Controladoria", priority: "Alta", status: "Em andamento", due: inThreeDays, estimatedHours: 2, spentHours: 0.8 },
    { id: "00000000-0000-4000-8000-0000000000d3", title: "Emitir cobrança recorrente de honorários", processId: P1, client: "Wallace Pereira", responsible: E4, sector: "Financeiro", priority: "Média", status: "Pendente", due: isoToday, estimatedHours: 1, spentHours: 0 },
    { id: "00000000-0000-4000-8000-0000000000d4", title: "Protocolar mandado de segurança", processId: P3, client: "Loja Saldão LTDA", responsible: E1, sector: "Advocacia", priority: "Urgente", status: "Atrasada", due: isoToday, estimatedHours: 5, spentHours: 3 },
  ],
  finances: [
    { id: "00000000-0000-4000-8000-0000000000f1", type: "Receita", category: "Honorários contratuais", client: "Wallace Pereira", processId: P1, amount: 3200, dueDate: isoToday, status: "Pago", method: "PIX", paidDate: isoToday },
    { id: "00000000-0000-4000-8000-0000000000f2", type: "Receita", category: "Parcela de contrato", client: "Lorraine Lima", processId: P2, amount: 1800, dueDate: tomorrow, status: "Pendente", method: "Boleto" },
    { id: "00000000-0000-4000-8000-0000000000f3", type: "Despesa", category: "Sistemas jurídicos", client: "Escritório", amount: 680, dueDate: isoToday, status: "Pago", method: "Cartão", paidDate: isoToday },
    { id: "00000000-0000-4000-8000-0000000000f4", type: "Despesa", category: "Diligência e deslocamento", client: "Carlos Alberto", processId: P4, amount: 460, dueDate: isoToday, status: "Pendente", method: "PIX" },
    { id: "00000000-0000-4000-8000-0000000000f5", type: "Receita", category: "Consultoria empresarial", client: "Loja Saldão LTDA", processId: P3, amount: 5200, dueDate: inSevenDays, status: "Pendente", method: "Transferência" },
  ],
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
    { id: "00000000-0000-4000-8000-0000000000a5", channel: "WhatsApp", client: "Wallace Pereira", processId: P1, subject: "Lembrete de audiência", status: "Agendada", date: tomorrow },
    { id: "00000000-0000-4000-8000-0000000000a6", channel: "E-mail", client: "Lorraine Lima", processId: P2, subject: "Solicitação de documentos complementares", status: "Enviada", date: isoToday },
    { id: "00000000-0000-4000-8000-0000000000a7", channel: "SMS", client: "Loja Saldão LTDA", processId: P3, subject: "Cobrança de honorários", status: "Pendente", date: inSevenDays },
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
    { id: "00000000-0000-4000-8000-0000000000e6", title: "Defesa criminal completa", client: "Carlos Alberto", processId: P4, area: "Criminal", service: "Defesa criminal", minimum: 12500, recommended: 18500, premium: 24000, entry: 5550, successFee: 0, status: "Enviada", createdAt: isoToday },
  ],
};
