import { buildResult, validateEmail, validatePhone, validateRequired, type ValidationResult } from "./common";

export function validateLead(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["name", "phone", "origin", "area", "stage"]).errors];
  if (!validatePhone(String(data.phone ?? ""))) errors.push("Telefone do lead inválido.");
  if (!validateEmail(String(data.email ?? ""))) errors.push("E-mail do lead inválido.");
  if (Number(data.value ?? 0) < 0) errors.push("Valor estimado do lead não pode ser negativo.");
  return buildResult(errors);
}
