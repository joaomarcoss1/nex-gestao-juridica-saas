import type { AppState, Client } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { buildClientReport, openPrintableReport } from "./reportsEngine.service";

export const clientsService = {
  ...createCrudService("clients"),
  getClient360(state: AppState, clientId: string) {
    const client = state.clients.find((item) => item.id === clientId);
    const clientName = client?.name ?? "";
    return {
      client,
      processes: state.processes.filter((item) => item.client === clientName),
      documents: state.documents.filter((item) => item.client === clientName),
      finances: state.finances.filter((item) => item.client === clientName),
      tasks: state.tasks.filter((item) => item.client === clientName),
      proposals: state.pricings.filter((item) => item.client === clientName),
      messages: state.messages.filter((item) => item.client === clientName),
    };
  },
  printClientFicha(state: AppState, client: Client) {
    const report = buildClientReport(state, client.name);
    openPrintableReport(report.title, report.rows as Array<[string, string]>);
  },
};
