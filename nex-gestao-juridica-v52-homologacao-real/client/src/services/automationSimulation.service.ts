import type { AppState } from "@/types/app";
export function simulateAutomationImpact(state: AppState) {
  return {
    processosParados: state.processes.filter((p) => p.lastMoveDays >= 30).length,
    prazosCriticos: state.deadlines.filter((d) => d.status === "Pendente" && d.priority === "Crítica").length,
    tarefasAtrasadas: state.tasks.filter((t) => t.status === "Atrasada").length,
    cobrancasVencidas: state.finances.filter((f) => f.status === "Atrasado").length,
  };
}
