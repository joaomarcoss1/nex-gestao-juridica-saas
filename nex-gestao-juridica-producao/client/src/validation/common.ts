export type ValidationResult = { ok: boolean; errors: string[] };
export type ValidationIssue = { field: string; message: string };

export function onlyDigits(value = "") {
  return String(value ?? "").replace(/\D/g, "");
}

export function validateEmail(email?: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function validateCpf(value?: string) {
  const cpf = onlyDigits(value);
  if (!cpf) return true;
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: number) => {
    let sum = 0;
    for (let i = 0; i < base - 1; i += 1) sum += Number(cpf[i]) * (base - i);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

export function validateCnpj(value?: string) {
  const cnpj = onlyDigits(value);
  if (!cnpj) return true;
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(cnpj[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc([5,4,3,2,9,8,7,6,5,4,3,2]) === Number(cnpj[12]) && calc([6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(cnpj[13]);
}

export function validateCpfCnpj(value?: string) {
  const digits = onlyDigits(value);
  if (!digits) return true;
  return digits.length === 11 ? validateCpf(digits) : digits.length === 14 ? validateCnpj(digits) : false;
}

export function validateCnj(value?: string) {
  const digits = onlyDigits(value);
  return !digits || digits.length === 20;
}

export function validatePhone(value?: string) {
  const digits = onlyDigits(value);
  return !digits || (digits.length >= 10 && digits.length <= 13);
}

export function validateRequired(data: Record<string, unknown>, fields: string[]) {
  const errors = fields.filter((field) => !String(data[field] ?? "").trim()).map((field) => `${field} é obrigatório.`);
  return { ok: errors.length === 0, errors };
}

export function moneyPositive(value: unknown) {
  return Number(value ?? 0) >= 0;
}

export function dateNotBefore(start?: string, end?: string) {
  if (!start || !end) return true;
  return new Date(`${end}T12:00:00`).getTime() >= new Date(`${start}T12:00:00`).getTime();
}

export function buildResult(errors: string[]): ValidationResult {
  return { ok: errors.length === 0, errors };
}
