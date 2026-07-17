import { buildResult, validateCnj, validateRequired, type ValidationResult } from "./common";

export function validateProcess(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["client", "area", "phase", "status", "risk", "responsible"]).errors];
  if (!validateCnj(String(data.cnj ?? ""))) errors.push("CNJ inválido. Use 20 dígitos ou deixe em branco até receber numeração.");
  const chance = Number(data.successChance ?? 0);
  if (chance < 0 || chance > 100) errors.push("Chance de êxito deve ficar entre 0 e 100%.");
  if (Number(data.value ?? 0) < 0 || Number(data.fees ?? 0) < 0) errors.push("Valores de causa/honorários não podem ser negativos.");
  return buildResult(errors);
}
