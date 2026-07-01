import { buildResult, validateRequired, type ValidationResult } from "./common";

export function validateTask(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["title", "client", "responsible", "sector", "priority", "status"]).errors];
  if (Number(data.estimatedHours ?? 0) < 0 || Number(data.spentHours ?? 0) < 0) errors.push("Horas estimadas/gastas não podem ser negativas.");
  return buildResult(errors);
}
