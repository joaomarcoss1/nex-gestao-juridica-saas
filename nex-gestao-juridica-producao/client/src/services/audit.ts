import { supabase } from "./supabase";

export type AuditAction =
  | "login"
  | "create_cliente"
  | "update_cliente"
  | "delete_cliente"
  | "create_processo"
  | "update_processo"
  | "upload_documento"
  | "assinatura"
  | "aprovar_ponto"
  | "gerar_folha"
  | "alterar_financeiro"
  | "exportar_relatorio"
  | "alterar_permissao"
  | "executar_automacao";

export async function auditLog(action: AuditAction, details: Record<string, unknown> = {}) {
  const payload = {
    module: String(details.module ?? "frontend"),
    action,
    entity_id: details.entityId ? String(details.entityId) : details.documentId ? String(details.documentId) : undefined,
    before_data: null,
    after_data: details,
    ip: "capturado no backend/edge em produção",
    device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "server",
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    console.info("[Nex Audit Demo]", payload);
    return;
  }

  const { error } = await supabase.from("audit_logs").insert(payload);
  if (error) throw error;
}
