import { createCrudService } from "./crudServiceFactory";
export const automationRulesService = createCrudService("automations");
export const automationRunsService = createCrudService("automationRuns");
