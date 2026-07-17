import { describe, expect, it } from "vitest";
import { addBusinessDays, addCalendarMonths, adjustToBusinessDay, isBusinessDay } from "@/lib/businessDates";
import { buildInstallmentSchedule, distributeInstallments, financialBalance, nextFinancialStatus, toCents } from "@/lib/financialIntegrity";
import { deduplicateEvents, findScheduleConflicts, intervalsOverlap, normalizedSourceType } from "@/lib/schedulingIntegrity";
import type { ScheduledEvent } from "@/types/app";

describe("integridade monetária", () => {
  it("distribui centavos sem alterar o total", () => {
    const parts = distributeInstallments(10_001, 3);
    expect(parts).toEqual([3333, 3334, 3334]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10_001);
  });

  it("gera parcelas mensais preservando o último dia válido", () => {
    const schedule = buildInstallmentSchedule({ totalCents: 30_000, count: 3, firstDueDate: "2026-01-31", policy: "keep" });
    expect(schedule.map((item) => item.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(schedule.reduce((sum, item) => sum + item.amountCents, 0)).toBe(30_000);
  });

  it("calcula saldo somente em centavos", () => {
    expect(financialBalance(100.05, 40.02)).toBe(6003);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("não transforma cancelado em atraso", () => {
    expect(nextFinancialStatus(10_000, 0, "2020-01-01", true)).toBe("Cancelado");
    expect(nextFinancialStatus(10_000, 5_000, "2020-01-01")).toBe("Parcial");
    expect(nextFinancialStatus(10_000, 10_000, "2020-01-01")).toBe("Pago");
  });
});

describe("calendário de dias úteis", () => {
  it("ignora final de semana, feriado e recesso", () => {
    const calendar = { holidays: ["2026-07-14"], recesses: [{ start: "2026-07-16", end: "2026-07-17" }] };
    expect(addBusinessDays("2026-07-13", 2, calendar)).toBe("2026-07-20");
  });

  it("ajusta vencimento para o próximo ou anterior dia útil", () => {
    expect(adjustToBusinessDay("2026-07-18", "next_business_day")).toBe("2026-07-20");
    expect(adjustToBusinessDay("2026-07-18", "previous_business_day")).toBe("2026-07-17");
  });

  it("soma meses sem ultrapassar o mês-alvo", () => {
    expect(addCalendarMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(isBusinessDay(new Date("2026-07-13T12:00:00Z"))).toBe(true);
  });
});

describe("integridade da agenda", () => {
  const base: ScheduledEvent = {
    id: "event-1", eventType: "meeting", sourceType: "meeting", sourceId: "meeting-1", title: "Reunião", startsAt: "2026-07-14T14:00:00Z", endsAt: "2026-07-14T15:00:00Z", responsibleId: "employee-1", status: "scheduled", clientVisible: false,
  };

  it("normaliza origens financeiras legadas", () => {
    expect(normalizedSourceType("finance")).toBe("financial_entry");
    expect(normalizedSourceType("payment")).toBe("financial_entry");
  });

  it("remove evento financeiro duplicado mesmo com origem legada", () => {
    const events = [
      { ...base, id: "f1", eventType: "financial_entry" as const, sourceType: "finance" as never, sourceId: "entry-1" },
      { ...base, id: "f2", eventType: "financial_entry" as const, sourceType: "financial_entry" as const, sourceId: "entry-1" },
    ];
    expect(deduplicateEvents(events)).toHaveLength(1);
  });

  it("detecta conflito apenas para o mesmo responsável", () => {
    const candidate = { ...base, id: "candidate", startsAt: "2026-07-14T14:30:00Z", endsAt: "2026-07-14T15:30:00Z" };
    expect(findScheduleConflicts(candidate, [base])).toHaveLength(1);
    expect(findScheduleConflicts({ ...candidate, responsibleId: "employee-2" }, [base])).toHaveLength(0);
    expect(intervalsOverlap(base.startsAt, base.endsAt, candidate.startsAt, candidate.endsAt)).toBe(true);
  });
});
