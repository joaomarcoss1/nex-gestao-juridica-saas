import type { AppState, FinanceEntry } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { financialSummary, openPrintableReport } from "./reportsEngine.service";
import { money, receiptNumber, todayIso } from "@/utils/format";

export const financialService = {
  ...createCrudService("finances"),
  summary: financialSummary,
  markPaid(entry: FinanceEntry, paidAmount = entry.amount): FinanceEntry {
    const number = entry.receiptNumber ?? receiptNumber("REC");
    const payment = { amount: paidAmount, paidAt: todayIso(), method: entry.method, receiptNumber: number };
    const totalPaid = (entry.partialPayments ?? []).reduce((sum, row) => sum + row.amount, 0) + paidAmount;
    return { ...entry, status: totalPaid >= entry.amount ? "Pago" : "Parcial", paidAmount: totalPaid, paidDate: todayIso(), receiptNumber: number, partialPayments: [...(entry.partialPayments ?? []), payment] };
  },
  printReceipt(entry: FinanceEntry) {
    openPrintableReport(`Recibo - ${entry.client}`, [
      ["Cliente", entry.client],
      ["Categoria", entry.category],
      ["Valor", money(entry.paidAmount ?? entry.amount)],
      ["Método", entry.method],
      ["Data", entry.paidDate ?? todayIso()],
      ["Observações", entry.notes ?? "-"],
    ]);
  },
  dreRows(state: AppState) {
    const summary = financialSummary(state);
    return [
      ["Receita bruta", money(summary.receitas)],
      ["Despesas operacionais", money(summary.despesas)],
      ["Resultado gerencial", money(summary.resultado)],
      ["Recebido", money(summary.recebido)],
      ["Vencido", money(summary.vencido)],
    ] as Array<[string, string]>;
  },
};
