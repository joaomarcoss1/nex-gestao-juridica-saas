import { buildResult, validateRequired, type ValidationResult } from "./common";

export function validatePricing(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["title", "client", "area", "service", "recommended", "status"]).errors];
  if (Number(data.minimum ?? 0) < 0 || Number(data.recommended ?? 0) < 0 || Number(data.premium ?? 0) < 0) errors.push("Valores de proposta não podem ser negativos.");
  if (Number(data.recommended ?? 0) < Number(data.minimum ?? 0)) errors.push("Valor recomendado não pode ficar abaixo do mínimo técnico.");
  return buildResult(errors);
}
