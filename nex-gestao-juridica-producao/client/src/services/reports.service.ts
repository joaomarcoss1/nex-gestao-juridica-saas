import type { AppState } from "@/types/app";
export const reportsService = {
  financeiro: (state: AppState) => state.finances,
  processos: (state: AppState) => state.processes,
  prazos: (state: AppState) => state.deadlines,
  auditoria: (state: AppState) => state.auditLogs,
};
