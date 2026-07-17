import { claimWebhookEvent, getSupabaseAdmin, json, markWebhookProcessed, readJson, requireSharedSecret, safeError } from "../_shared/security";

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    requireSharedSecret(request, "PAYMENTS_WEBHOOK_SECRET");
    const event = await readJson<Record<string, any>>(request, 256_000);
    const financeId = String(event.financeId ?? event.external_reference ?? event.metadata?.financeId ?? "");
    const eventId = String(event.id ?? event.event_id ?? event.payment_id ?? event.transaction_id ?? "");
    const provider = String(event.provider ?? request.headers.get("x-payment-provider") ?? "payments").toLowerCase();
    const eventType = String(event.type ?? event.event ?? event.status ?? "payment.updated");
    if (!financeId) throw Object.assign(new Error("Referência financeira ausente."), { status: 400 });
    if (!eventId) throw Object.assign(new Error("Identificador do evento ausente."), { status: 400 });

    const admin = getSupabaseAdmin(true)!;
    const { data: entry, error: entryError } = await admin.from("financial_entries").select("id, organization_id, amount, status").eq("id", financeId).maybeSingle();
    if (entryError) throw entryError;
    if (!entry) throw Object.assign(new Error("Lançamento financeiro não encontrado."), { status: 404 });

    const claim = await claimWebhookEvent(admin, provider, eventId, eventType, String(entry.organization_id), event);
    if (claim.duplicate) return json({ ok: true, duplicate: true });

    const amount = Number(event.amount ?? event.value ?? event.paid_amount ?? 0);
    const status = String(event.status ?? event.payment_status ?? "paid").toLowerCase();
    const paid = ["paid", "approved", "pago", "confirmed", "received"].includes(status);
    const failed = ["failed", "rejected", "cancelled", "canceled", "refused"].includes(status);
    const update: Record<string, unknown> = {
      status: paid ? "pago" : failed ? "cancelado" : String(entry.status || "pendente"),
      updated_at: new Date().toISOString(),
    };
    if (paid) update.paid_date = new Date().toISOString().slice(0, 10);
    if (paid && amount > 0) update.paid_amount = amount;
    const { error: updateError } = await admin.from("financial_entries").update(update).eq("id", financeId).eq("organization_id", entry.organization_id);
    if (updateError) throw updateError;

    await admin.from("audit_logs").insert({
      organization_id: entry.organization_id,
      module: "financial_entries",
      action: "payment_webhook",
      entity_id: financeId,
      after_data: { provider, eventType, status, amount },
      created_at: new Date().toISOString(),
    });
    await markWebhookProcessed(admin, claim.id, { financeId, status: update.status });
    return json({ ok: true, financeId, updated: true });
  } catch (error) {
    const safe = safeError(error, "Webhook de pagamento não processado.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
