import type { AppState, Process } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { buildProcessReport, openPrintableReport, processProfitability } from "./reportsEngine.service";

export const processesService = {
  ...createCrudService("processes"),
  getProcess360(state: AppState, processId: string) {
    return {
      process: state.processes.find((item) => item.id === processId),
      deadlines: state.deadlines.filter((item) => item.processId === processId),
      tasks: state.tasks.filter((item) => item.processId === processId),
      documents: state.documents.filter((item) => item.processId === processId),
      finances: state.finances.filter((item) => item.processId === processId),
      messages: state.messages.filter((item) => item.processId === processId),
      profitability: processProfitability(state, processId),
    };
  },
  printProcessReport(state: AppState, process: Process) {
    const report = buildProcessReport(state, process.id);
    openPrintableReport(report.title, report.rows as Array<[string, string]>);
  },
};
