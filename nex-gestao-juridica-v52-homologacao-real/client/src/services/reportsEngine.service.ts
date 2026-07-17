import type { AppState } from "@/types/app";
import { money, todayIso } from "@/utils/format";

const excludedFinancialStatuses = new Set(["Cancelado", "Arquivado", "Renegociado", "Estornado", "Baixado como perda"]);
const operationalFinances = (state: AppState) => state.finances.filter((f) => !f.archivedAt && !excludedFinancialStatuses.has(f.status));

export function financialSummary(state: AppState) {
  const rows = operationalFinances(state);
  const receitas = rows.filter((f) => f.type === "Receita").reduce((sum, f) => sum + f.amount, 0);
  const despesas = rows.filter((f) => f.type === "Despesa").reduce((sum, f) => sum + f.amount, 0);
  const recebido = rows.filter((f) => f.type === "Receita").reduce((sum, f) => sum + Math.min(f.amount, f.paidAmount ?? 0), 0);
  const vencido = rows.filter((f) => ["Pendente", "Parcial", "Atrasado"].includes(f.status) && f.dueDate < todayIso()).reduce((sum, f) => sum + Math.max(0, f.amount - (f.paidAmount ?? 0)), 0);
  return { receitas, despesas, resultado: receitas - despesas, recebido, vencido };
}

export function processProfitability(state: AppState, processId: string) {
  const rows = operationalFinances(state).filter((f) => f.processId === processId);
  const receitas = rows.filter((f) => f.type === "Receita").reduce((sum, f) => sum + f.amount, 0);
  const despesas = rows.filter((f) => f.type === "Despesa").reduce((sum, f) => sum + f.amount, 0);
  return { receitas, despesas, resultado: receitas - despesas, margem: receitas ? ((receitas - despesas) / receitas) * 100 : 0 };
}

export function buildClientReport(state: AppState, clientName: string) {
  const client = state.clients.find((c) => c.name === clientName);
  const processes = state.processes.filter((p) => p.client === clientName);
  const documents = state.documents.filter((d) => d.client === clientName);
  const finances = operationalFinances(state).filter((f) => f.client === clientName);
  const revenue = finances.filter((f) => f.type === "Receita").reduce((sum, f) => sum + f.amount, 0);
  return {
    title: `Ficha do cliente - ${clientName}`,
    rows: [
      ["Cliente", client?.name ?? clientName],
      ["Documento", client?.document ?? "-"],
      ["Status", client?.status ?? "-"],
      ["Processos", String(processes.length)],
      ["Documentos", String(documents.length)],
      ["Receita vinculada", money(revenue)],
    ],
  };
}

export function buildProcessReport(state: AppState, processId: string) {
  const process = state.processes.find((p) => p.id === processId);
  const deadlines = state.deadlines.filter((d) => d.processId === processId);
  const tasks = state.tasks.filter((t) => t.processId === processId);
  const documents = state.documents.filter((d) => d.processId === processId);
  const profit = processProfitability(state, processId);
  return {
    title: `Relatório do processo - ${process?.client ?? processId}`,
    rows: [
      ["CNJ", process?.cnj ?? "Sem CNJ"],
      ["Área", process?.area ?? "-"],
      ["Fase", process?.phase ?? "-"],
      ["Risco", process?.risk ?? "-"],
      ["Prazos", String(deadlines.length)],
      ["Tarefas", String(tasks.length)],
      ["Documentos", String(documents.length)],
      ["Resultado", money(profit.resultado)],
      ["Margem", `${profit.margem.toFixed(1)}%`],
    ],
  };
}

export function openPrintableReport(title: string, rows: Array<[string, string]>) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}header{border-bottom:3px solid #c9a24b;margin-bottom:24px}h1{margin:0 0 8px}small{color:#666}table{width:100%;border-collapse:collapse}td{border:1px solid #ddd;padding:10px}td:first-child{font-weight:700;background:#f7f7f7;width:35%}footer{margin-top:24px;color:#666;font-size:12px}</style></head><body><header><h1>${title}</h1><small>Nex Gestão Jurídica · NexLabs · emitido em ${todayIso()}</small></header><table>${rows.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table><footer>Relatório gerencial. Dados sensíveis protegidos por RLS, permissões e auditoria.</footer></body></html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }
}
