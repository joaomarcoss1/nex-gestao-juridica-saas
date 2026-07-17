export type LegalHoliday = {
  date: string;
  name: string;
  scope?: "nacional" | "estadual" | "municipal" | "tribunal";
  state?: string;
  city?: string;
  court?: string;
  active?: boolean;
};

const fixedNationalHolidays = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25"];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date: Date, extra: LegalHoliday[] = []) {
  const iso = toIso(date);
  const monthDay = iso.slice(5);
  return fixedNationalHolidays.includes(monthDay) || extra.some((holiday) => holiday.active !== false && holiday.date === iso);
}

export function calculateDeadline(startDate: string, days: number, countType: "Dias úteis" | "Dias corridos" = "Dias úteis", holidays: LegalHoliday[] = []) {
  const current = new Date(`${startDate}T12:00:00`);
  if (!startDate || Number.isNaN(current.getTime())) return "";
  let counted = 0;
  while (counted < days) {
    current.setDate(current.getDate() + 1);
    const businessDay = !isWeekend(current) && !isHoliday(current, holidays);
    if (countType === "Dias corridos" || businessDay) counted += 1;
  }
  return toIso(current);
}

export function deadlineRisk(dueDate: string) {
  const now = new Date();
  const due = new Date(`${dueDate}T23:59:59`);
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "vencido";
  if (days <= 2) return "critico";
  if (days <= 5) return "atenção";
  return "normal";
}
