import type { AppState, AutomationRun, Task } from "@/types/app";
import { todayIso, uid } from "@/utils/format";

export function runOperationalAutomations(state: AppState) {
  const tasks: Task[] = [];
  const runs: AutomationRun[] = [];
  const today = todayIso();
  for (const process of state.processes.filter((p) => p.lastMoveDays >= 30)) {
    tasks.push({ id: uid("task"), title: `Revisar processo parado: ${process.client}`, client: process.client, processId: process.id, responsible: process.responsible, sector: "Controladoria", priority: "Alta", status: "Pendente", due: today, estimatedHours: 1, spentHours: 0 });
  }
  if (tasks.length) runs.push({ id: uid("run"), ruleId: "cron-processos-parados", ruleName: "Processos parados há 30 dias", result: `${tasks.length} tarefa(s) criadas`, date: today, status: "Sucesso" });
  return { tasks, runs };
}
