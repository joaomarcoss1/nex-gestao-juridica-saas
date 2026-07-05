import { getCurrentOrganizationId, getCurrentProfileId } from "./authContext";
import { supabase } from "./supabase";

export type AuditAction =
  | "login"
  | "logout"
  | "create_cliente"
  | "update_cliente"
  | "delete_cliente"
  | "archive_cliente"
  | "restore_cliente"
  | "create_processo"
  | "update_processo"
  | "archive_processo"
  | "upload_documento"
  | "download_documento_url_assinada"
  | "upload_documento_privado"
  | "visualizar_documento"
  | "aprovar_documento"
  | "recusar_documento"
  | "assinatura"
  | "aprovar_ponto"
  | "gerar_folha"
  | "alterar_financeiro"
  | "baixar_financeiro"
  | "exportar_relatorio"
  | "alterar_permissao"
  | "executar_automacao"
  | string;

export async function auditLog(action: AuditAction, details: Record<string, unknown> = {}) {
  const payload = {
    organization_id: getCurrentOrganizationId(),
    user_id: getCurrentProfileId(),
    module: String(details.module ?? "frontend"),
    action,
    entity_id: details.entityId ? String(details.entityId) : details.documentId ? String(details.documentId) : undefined,
    before_data: details.before ?? null,
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
