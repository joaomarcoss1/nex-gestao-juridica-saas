import { buildResult, validateCpf, validateEmail, validatePhone, validateRequired, type ValidationResult } from "./common";

export function validateEmployee(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["name", "role", "sector", "status"]).errors];
  if (!validateCpf(String(data.cpf ?? ""))) errors.push("CPF do colaborador inválido.");
  if (!validateEmail(String(data.email ?? ""))) errors.push("E-mail do colaborador inválido.");
  if (!validatePhone(String(data.phone ?? ""))) errors.push("Telefone do colaborador inválido.");
  if (Number(data.baseSalary ?? 0) < 0 || Number(data.hourlyRate ?? 0) < 0) errors.push("Salário e valor hora não podem ser negativos.");
  return buildResult(errors);
}
