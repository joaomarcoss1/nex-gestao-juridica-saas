import type { AppState } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";

export const timeRecordsService = {
  ...createCrudService("timeRecords"),
  monthlyMirror(state: AppState, employeeId: string, month: number, year: number) {
    const rows = state.timeRecords.filter((r) => r.employeeId === employeeId && new Date(`${r.date}T12:00:00`).getMonth() + 1 === month && new Date(`${r.date}T12:00:00`).getFullYear() === year);
    const justified = rows.filter((r) => r.status === "justificado").length;
    const pending = rows.filter((r) => r.status === "pendente_aprovacao").length;
    return { rows, justified, pending, total: rows.length };
  },
};
