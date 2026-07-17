import { auditLog } from "./audit";

export type AutomationContext = {
  trigger: string;
  module: string;
  entityId?: string;
  payload?: Record<string, unknown>;
};

export type AutomationResult = {
  ok: boolean;
  actionsExecuted: string[];
  message: string;
};

export async function executeInternalAutomation(context: AutomationContext): Promise<AutomationResult> {
  const actionsExecuted = [
    "validar_condicoes",
    "gerar_log_auditoria",
    "notificar_responsavel",
  ];

  await auditLog("executar_automacao", {
    trigger: context.trigger,
    module: context.module,
    entityId: context.entityId,
    payload: context.payload ?? {},
  });

  return {
    ok: true,
    actionsExecuted,
    message: "Automação interna processada com rastreabilidade e log de auditoria.",
  };
}
