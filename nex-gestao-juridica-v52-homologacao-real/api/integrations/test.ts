import { json, readJson, requireUser, safeError } from "../_shared/security";

const providers: Record<string, string[]> = {
  "Asaas": ["ASAAS_API_KEY"],
  "Mercado Pago": ["MERCADO_PAGO_ACCESS_TOKEN"],
  "Stripe": ["STRIPE_SECRET_KEY"],
  "Google Leads": ["GOOGLE_LEADS_WEBHOOK_SECRET"],
  "WhatsApp Business": ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  "Evolution API": ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"],
  "E-mail": ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
  "Tribunais": ["TRIBUNAIS_API_URL", "TRIBUNAIS_API_KEY"],
  "ICP-Brasil": ["ICP_API_URL", "ICP_API_KEY"],
};

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    const context = await requireUser(request, { roles: ["admin_master_global", "admin_master", "admin_empresa", "admin", "socio"] });
    const payload = await readJson<Record<string, unknown>>(request);
    const provider = String(payload.provider ?? "Outro");
    const required = providers[provider] ?? [];
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (payload.integrationId) {
      const { error } = await context.admin.from("integrations").update({
        status: missing.length ? "preparado" : "conectado",
        last_sync_at: new Date().toISOString(),
        config: { required, missing, testedAt: new Date().toISOString() },
      }).eq("id", String(payload.integrationId)).eq("organization_id", context.organizationId);
      if (error) throw error;
    }
    return json({ ok: missing.length === 0, status: missing.length ? "prepared" : "configured", provider, required, missing, message: missing.length ? "Integração preparada, mas faltam variáveis de ambiente reais." : "Credenciais mínimas presentes. Homologue webhooks e escopo antes de produção." });
  } catch (error) {
    const safe = safeError(error, "Não foi possível testar a integração.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
