export type BusinessCalendar = { holidays?: string[]; recesses?: Array<{ start: string; end: string }> };

export function isBusinessDay(date: Date, calendar: BusinessCalendar = {}) {
  const iso = date.toISOString().slice(0, 10);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  if (calendar.holidays?.includes(iso)) return false;
  return !(calendar.recesses ?? []).some((period) => iso >= period.start && iso <= period.end);
}

export function addBusinessDays(input: string | Date, days: number, calendar: BusinessCalendar = {}) {
  const date = typeof input === "string" ? new Date(`${input.slice(0, 10)}T12:00:00Z`) : new Date(input);
  const direction = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + direction);
    if (isBusinessDay(date, calendar)) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

export function adjustToBusinessDay(input: string, policy: "keep" | "previous_business_day" | "next_business_day", calendar: BusinessCalendar = {}) {
  if (policy === "keep") return input.slice(0, 10);
  const direction = policy === "previous_business_day" ? -1 : 1;
  const date = new Date(`${input.slice(0, 10)}T12:00:00Z`);
  while (!isBusinessDay(date, calendar)) date.setUTCDate(date.getUTCDate() + direction);
  return date.toISOString().slice(0, 10);
}

export function addCalendarMonths(input: string, months: number) {
  const [year, month, day] = input.slice(0, 10).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}
