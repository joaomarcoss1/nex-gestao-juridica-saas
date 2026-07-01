import type { AppState, AuditLog, EntityName, FinanceEntry, PricingProposal, Task } from "@/types/app";
import { validateClient } from "@/validation/client.schema";
import { validateDeadline } from "@/validation/deadline.schema";
import { validateDocument } from "@/validation/document.schema";
import { validateEmployee } from "@/validation/employee.schema";
import { validateFinancial } from "@/validation/financial.schema";
import { validateLead } from "@/validation/lead.schema";
import { validatePricing } from "@/validation/pricing.schema";
import { validateProcess } from "@/validation/process.schema";
import { validateTask } from "@/validation/task.schema";
import { todayIso, uid } from "@/utils/format";

export type PendingMutation<K extends EntityName = EntityName> = {
  entity: K;
  value: AppState[K][number];
  action: "create" | "update" | "archive" | "restore";
};

const validators: Partial<Record<EntityName, (data: Record<string, unknown>) => { ok: boolean; errors: string[] }>> = {
  employees: validateEmployee,
  clients: validateClient,
  leads: validateLead,
  processes: validateProcess,
  deadlines: validateDeadline,
  tasks: validateTask,
  finances: validateFinancial,
  documents: validateDocument,
  pricings: validatePricing,
};

export function validateEntityBeforeCommit<K extends EntityName>(entity: K, item: AppState[K][number]) {
  const validator = validators[entity];
  if (!validator) return { ok: true, errors: [] };
  return validator(item as Record<string, unknown>);
}

function auditItem(module: string, action: string, entityId: string, detail: string): AuditLog {
  return { id: uid("audit"), module, action, entityId, user: "Sistema", date: todayIso(), detail };
}

function hasOpenTask(state: AppState, title: string, processId?: string) {
  return state.tasks.some((task) =>
    task.title === title &&
    (!processId || task.processId === processId) &&
    !task.archivedAt &&
    task.status !== "Concluída" &&
    task.status !== "Cancelada"
  );
}

export function buildSideEffects<K extends EntityName>(entity: K, item: AppState[K][number], action: string, state: AppState): PendingMutation[] {
  const effects: PendingMutation[] = [];
  if (entity === "documents" && action === "create") {
    const doc = item as AppState["documents"][number];
    effects.push({
      entity: "tasks",
      action: "create",
      value: {
        id: uid("task"),
        title: `Conferir documento: ${doc.name}`,
        description: `Documento enviado por ${doc.origin}. Validar legibilidade, vínculo processual e cadeia de custódia.`,
        processId: doc.processId,
        client: doc.client,
        clientId: doc.clientId,
        responsible: doc.responsible,
        sector: "Controladoria",
        priority: "Alta",
        status: "Pendente",
        due: todayIso(),
        estimatedHours: 0.5,
        spentHours: 0,
        checklist: ["Conferir legibilidade", "Validar tipo documental", "Aprovar/recusar", "Registrar observação"],
      } as Task,
    });
    effects.push({ entity: "auditLogs", action: "create", value: auditItem("Documentos", "upload_documento", doc.id, `Documento ${doc.name} criado com tarefa de conferência.`) });
  }

  if (entity === "pricings") {
    const proposal = item as PricingProposal;
    const previous = state.pricings.find((p) => p.id === proposal.id);
    if (proposal.status === "Aceita" && previous?.status !== "Aceita") {
      effects.push({
        entity: "finances",
        action: "create",
        value: {
          id: uid("fin"),
          type: "Receita",
          category: "Entrada de honorários",
          client: proposal.client,
          clientId: proposal.clientId,
          processId: proposal.processId,
          amount: proposal.entry || proposal.recommended,
          dueDate: todayIso(),
          status: "Pendente",
          method: "PIX",
          notes: `Cobrança gerada automaticamente pela proposta aceita ${proposal.title}. Valor recomendado: ${proposal.recommended}.`,
        } as FinanceEntry,
      });
      effects.push({ entity: "auditLogs", action: "create", value: auditItem("Precificação", "proposta_aceita_gera_cobranca", proposal.id, `Proposta aceita gerou cobrança para ${proposal.client}.`) });
    }
  }

  if (entity === "finances") {
    const entry = item as FinanceEntry;
    if (entry.status === "Pago" && !entry.paidDate) entry.paidDate = todayIso();
    if (entry.status === "Pago") effects.push({ entity: "auditLogs", action: "create", value: auditItem("Financeiro", "baixar_financeiro", entry.id, `Baixa registrada: ${entry.category} - ${entry.amount}.`) });
    const overdueTitle = `Cobrança vencida: ${entry.client}`;
    if (entry.status !== "Pago" && entry.dueDate < todayIso() && !hasOpenTask(state, overdueTitle, entry.processId)) {
      effects.push({
        entity: "tasks",
        action: "create",
        value: {
          id: uid("task"),
          title: overdueTitle,
          description: `Lançamento ${entry.category} vencido em ${entry.dueDate}.`,
          processId: entry.processId ?? "",
          client: entry.client,
          clientId: entry.clientId,
          responsible: "00000000-0000-4000-8000-0000000000e4",
          sector: "Financeiro",
          priority: "Alta",
          status: "Pendente",
          due: todayIso(),
          estimatedHours: 0.5,
          spentHours: 0,
        } as Task,
      });
    }
  }

  if (entity === "processes") {
    const process = item as AppState["processes"][number];
    const finalReportTitle = `Relatório final do processo: ${process.client}`;
    if (["encerrado", "encerramento", "finalizado"].some((word) => process.status.toLowerCase().includes(word)) && !hasOpenTask(state, finalReportTitle, process.id)) {
      effects.push({
        entity: "tasks",
        action: "create",
        value: {
          id: uid("task"),
          title: finalReportTitle,
          description: "Gerar relatório final, conferir documentos, financeiro e comunicação ao cliente.",
          processId: process.id,
          client: process.client,
          clientId: process.clientId,
          responsible: process.responsible,
          sector: "Controladoria",
          priority: "Média",
          status: "Pendente",
          due: todayIso(),
          estimatedHours: 1.5,
          spentHours: 0,
        } as Task,
      });
    }
  }

  if (entity === "timeRecords") {
    const record = item as AppState["timeRecords"][number];
    if (record.status === "pendente_aprovacao" || record.status === "justificado") {
      effects.push({ entity: "auditLogs", action: "create", value: auditItem("Ponto", "ponto_justificado", record.id, `Registro de ponto ${record.kind} exige/teve justificativa.`) });
    }
  }

  return effects;
}

export function applyMutationToState<K extends EntityName>(current: AppState, entity: K, value: AppState[K][number]) {
  const list = current[entity] as Array<AppState[K][number]>;
  const id = (value as { id: string }).id;
  const exists = list.some((row) => (row as { id: string }).id === id);
  return { ...current, [entity]: exists ? list.map((row) => ((row as { id: string }).id === id ? value : row)) : [value, ...list] } as AppState;
}

export function deriveOperationalStatuses(state: AppState): AppState {
  const today = todayIso();
  return {
    ...state,
    finances: state.finances.map((entry) => entry.status !== "Pago" && entry.dueDate < today ? { ...entry, status: "Atrasado" } : entry),
    deadlines: state.deadlines.map((deadline) => deadline.status === "Pendente" && deadline.dueDate < today ? { ...deadline, status: "Atrasado" } : deadline),
    tasks: state.tasks.map((task) => task.status !== "Concluída" && task.due < today ? { ...task, status: "Atrasada" } : task),
  };
}
