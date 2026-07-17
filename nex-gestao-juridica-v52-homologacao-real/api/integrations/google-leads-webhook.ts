import { claimWebhookEvent, getSupabaseAdmin, json, markWebhookProcessed, readJson, requireSharedSecret, safeError } from "../_shared/security";

function pick(payload: Record<string, any>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    requireSharedSecret(request, "GOOGLE_LEADS_WEBHOOK_SECRET");
    const payload = await readJson<Record<string, any>>(request, 256_000);
    const eventId = pick(payload, ["lead_id", "id", "event_id", "google_key"], request.headers.get("x-google-event-id") || "");
    if (!eventId) throw Object.assign(new Error("Identificador do lead ausente."), { status: 400 });

    const organizationCode = pick(payload, ["organization_code", "registration_code", "codigo_escritorio", "empresa"], process.env.GOOGLE_LEADS_DEFAULT_ORG_CODE?.trim() || "");
    if (!organizationCode) throw Object.assign(new Error("Código da organização ausente."), { status: 400 });

    const admin = getSupabaseAdmin(true)!;
    const { data: organization, error: orgError } = await admin.from("organizations").select("id, status, access_blocked").eq("registration_code", organizationCode.replace(/\D/g, "")).maybeSingle();
    if (orgError) throw orgError;
    if (!organization || organization.access_blocked || String(organization.status).toLowerCase() !== "ativa") {
      throw Object.assign(new Error("Organização não autorizada para receber leads."), { status: 403 });
    }

    const claim = await claimWebhookEvent(admin, "google_leads", eventId, "lead.received", String(organization.id), payload);
    if (claim.duplicate) return json({ ok: true, duplicate: true });

    const name = pick(payload, ["full_name", "name", "nome", "contact_name", "lead_name"], "Lead Google");
    const phone = pick(payload, ["phone", "telefone", "whatsapp", "mobile"], "");
    const email = pick(payload, ["email", "email_address"], "").toLowerCase();
    const campaign = pick(payload, ["campaign", "campaign_name", "utm_campaign", "campanha"], "Google Leads");
    const { data: source } = await admin.from("crm_lead_sources").select("id, default_area, default_responsible_id, status").eq("organization_id", organization.id).eq("provider", "Google Leads").eq("active", true).neq("status", "inactive").order("is_default", { ascending: false }).limit(1).maybeSingle();
    const area = pick(payload, ["area", "legal_area", "servico", "service"], source?.default_area || "Civil");
    const notes = pick(payload, ["message", "mensagem", "notes", "observacoes"], "Lead recebido por Google Leads.");

    const record = {
      organization_id: organization.id,
      name,
      phone,
      email,
      origin: "Google Leads",
      area,
      demand_type: campaign,
      stage: "Novo lead",
      estimated_value: 0,
      next_contact: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      responsible_id: source?.default_responsible_id || null,
      notes: `${notes}\nOrigem: ${campaign}`,
      source_payload: payload,
      source_campaign: campaign,
      source_id: source?.id || null,
      external_source_id: eventId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin.from("leads").insert(record).select("id, name, origin").single();
    if (error) throw error;
    if (source?.id) await admin.from("crm_lead_sources").update({ last_received_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", source.id);
    await admin.from("audit_logs").insert({
      organization_id: organization.id,
      action: "google_lead_received",
      module: "leads",
      entity_id: data.id,
      after_data: { campaign, source: "Google Leads", eventId },
      created_at: new Date().toISOString(),
    });
    await markWebhookProcessed(admin, claim.id, { leadId: data.id });
    return json({ ok: true, lead: data });
  } catch (error) {
    const safe = safeError(error, "Lead não processado.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
