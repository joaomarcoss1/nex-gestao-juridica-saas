import { buildResult, validateCpfCnpj, validateEmail, validatePhone, validateRequired, type ValidationResult } from "./common";

export function validateClient(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["name", "type"]).errors];
  if (!validateCpfCnpj(String(data.document ?? ""))) errors.push("CPF/CNPJ inválido. Confira os dígitos antes de salvar o cliente.");
  if (!validateEmail(String(data.email ?? ""))) errors.push("E-mail do cliente inválido.");
  if (!validatePhone(String(data.phone ?? data.whatsapp ?? ""))) errors.push("Telefone/WhatsApp inválido.");
  if (String(data.type ?? "PF") === "PJ" && String(data.document ?? "").replace(/\D/g, "").length === 11) errors.push("Cliente PJ precisa de CNPJ, não CPF.");
  return buildResult(errors);
}
