import { appUrl, env, getSupabaseAdmin, json, stripeForm } from "./_stripe";

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const payload = await request.json().catch(() => ({}));
  const organizationId = String(payload.organizationId || "");
  if (!organizationId) return json({ ok: false, message: "Empresa não informada." }, 400);
  const supabase = getSupabaseAdmin();
  let customerId = String(payload.customerId || "");
  if (!customerId && supabase) {
    const { data } = await supabase.from("organizations").select("stripe_customer_id").eq("id", organizationId).maybeSingle();
    customerId = data?.stripe_customer_id || "";
  }
  if (!customerId) return json({ ok: false, message: "Esta empresa ainda não possui cliente Stripe. Crie uma assinatura primeiro." }, 400);
  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", `${appUrl(request).replace(/\/$/, "")}/assinatura`);
  const result = await stripeForm("billing_portal/sessions", params);
  if (!result.ok) return json({ ok: false, message: result.data?.error?.message || "Falha ao abrir portal Stripe." }, 400);
  if (supabase) await supabase.from("payment_events").insert({ organization_id: organizationId, provider: "stripe", event_type: "billing_portal.session.created", payload: { customerId }, processed: true });
  return json({ ok: true, url: result.data.url });
}
