import { buildResult, dateNotBefore, validateRequired, type ValidationResult } from "./common";

export function validateFinancial(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["type", "category", "client", "amount", "dueDate", "status", "method"]).errors];
  if (Number(data.amount ?? 0) <= 0) errors.push("Valor financeiro precisa ser maior que zero.");
  if (Number(data.paidAmount ?? 0) < 0) errors.push("Valor pago não pode ser negativo.");
  if (String(data.status ?? "") === "Pago" && !String(data.paidDate ?? "").trim()) errors.push("Informe a data de pagamento ao dar baixa total.");
  if (String(data.paidDate ?? "") && !dateNotBefore("1900-01-01", String(data.paidDate))) errors.push("Data de pagamento inválida.");
  return buildResult(errors);
}
