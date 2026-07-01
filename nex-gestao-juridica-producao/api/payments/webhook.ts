import { createClient } from "@supabase/supabase-js";
function env(name: string) { return process.env[name]?.trim(); }
function json(body: unknown, status = 200) { return Response.json(body, { status }); }

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const secret = env("PAYMENTS_WEBHOOK_SECRET");
  const received = request.headers.get("x-nex-webhook-secret") || new URL(request.url).searchParams.get("secret");
  if (secret && received !== secret) return json({ ok: false, message: "Unauthorized" }, 401);
  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  if (!url || !serviceRole) return json({ ok: false, prepared: true, message: "Configure Supabase service role para webhook real." });
  const event = await request.json().catch(() => ({}));
  const financeId = String(event.financeId ?? event.external_reference ?? event.metadata?.financeId ?? "");
  const organizationId = String(event.organizationId ?? event.metadata?.organizationId ?? "");
  const amount = Number(event.amount ?? event.value ?? event.paid_amount ?? 0);
  if (!financeId) return json({ ok: false, message: "financeId/external_reference ausente." }, 400);
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  const update: Record<string, unknown> = { status: "pago", paid_date: new Date().toISOString().slice(0, 10) };
  if (amount > 0) update.paid_amount = amount;
  await supabase.from("financial_entries").update(update).eq("id", financeId);
  await supabase.from("audit_logs").insert({ organization_id: organizationId || null, module: "financial_entries", action: "payment_webhook", entity_id: financeId, after_data: event, created_at: new Date().toISOString() });
  return json({ ok: true, financeId, updated: true });
}
