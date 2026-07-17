import { buildResult, dateNotBefore, validateRequired, type ValidationResult } from "./common";

export function validateDeadline(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["type", "client", "responsible", "startDate", "dueDate", "status"]).errors];
  if (Number(data.days ?? 0) < 0) errors.push("Quantidade de dias não pode ser negativa.");
  if (!dateNotBefore(String(data.startDate ?? ""), String(data.dueDate ?? ""))) errors.push("Vencimento não pode ser anterior à data inicial.");
  return buildResult(errors);
}
