import { addCalendarMonths, adjustToBusinessDay, type BusinessCalendar } from "./businessDates";

export function toCents(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100); }
export function fromCents(value: number) { return Math.round(value) / 100; }

export function distributeInstallments(totalCents: number, count: number) {
  if (!Number.isInteger(count) || count <= 0) throw new Error("Quantidade de parcelas inválida.");
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("Valor total inválido.");
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index >= count - remainder ? 1 : 0));
}

export function buildInstallmentSchedule(args: { totalCents: number; count: number; firstDueDate: string; policy?: "keep" | "previous_business_day" | "next_business_day"; calendar?: BusinessCalendar }) {
  const amounts = distributeInstallments(args.totalCents, args.count);
  return amounts.map((amountCents, index) => ({
    installmentNumber: index + 1,
    amountCents,
    dueDate: adjustToBusinessDay(addCalendarMonths(args.firstDueDate, index), args.policy ?? "next_business_day", args.calendar),
  }));
}

export function financialBalance(amount: number, paidAmount = 0) {
  return Math.max(0, toCents(amount) - toCents(paidAmount));
}

export function nextFinancialStatus(amountCents: number, paidCents: number, dueDate: string, cancelled = false) {
  if (cancelled) return "Cancelado" as const;
  if (paidCents >= amountCents) return "Pago" as const;
  if (paidCents > 0) return "Parcial" as const;
  return dueDate < new Date().toISOString().slice(0, 10) ? "Atrasado" as const : "Pendente" as const;
}
