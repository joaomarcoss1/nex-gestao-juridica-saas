import { appUrl, ensureStripeCustomer, env, getSupabaseAdmin, json, priceForPlan, stripeForm } from "./_stripe";

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const payload = await request.json().catch(() => ({}));
  const organizationId = String(payload.organizationId || "");
  const plan = String(payload.plan || "pro");
  if (!organizationId) return json({ ok: false, message: "Empresa não informada para criar assinatura." }, 400);
  const priceId = String(payload.priceId || priceForPlan(plan));
  if (!priceId) return json({ ok: false, prepared: true, missing: ["STRIPE_PRICE_PRO/STARTER/ENTERPRISE"], message: "Crie os preços no Stripe e configure os Price IDs na Vercel." });

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: organization } = await admin
      .from("organizations")
      .select("id,billing_mode,manual_trial_enabled,billing_exempt_forever,billing_exempt_reason,manual_trial_reason")
      .eq("id", organizationId)
      .maybeSingle();
    if (organization?.billing_exempt_forever) {
      return json({ ok: false, billingExempt: true, message: organization.billing_exempt_reason || "Esta empresa possui isenção permanente de cobrança e não precisa assinar via Stripe." }, 409);
    }
    if (organization?.manual_trial_enabled) {
      return json({ ok: false, manualTrial: true, message: organization.manual_trial_reason || "Esta empresa está em teste gratuito manual. O checkout fica bloqueado até o Admin Master desativar o teste." }, 409);
    }
  }

  const { customerId, supabase } = await ensureStripeCustomer(organizationId, payload.email, payload.organizationName);
  const base = appUrl(request).replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("customer", customerId);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", organizationId);
  params.set("success_url", `${base}/assinatura?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${base}/assinatura?billing=cancel`);
  params.set("allow_promotion_codes", "true");
  params.set("billing_address_collection", "auto");
  params.set("customer_update[name]", "auto");
  params.set("customer_update[address]", "auto");
  params.set("metadata[organization_id]", organizationId);
  params.set("metadata[plan]", plan);
  if (env("STRIPE_TAX_ENABLED") === "true") params.set("automatic_tax[enabled]", "true");

  const result = await stripeForm("checkout/sessions", params);
  if (!result.ok) return json({ ok: false, message: result.data?.error?.message || "Falha ao criar Checkout Session no Stripe." }, 400);
  if (supabase) await supabase.from("payment_events").insert({ organization_id: organizationId, provider: "stripe", event_type: "checkout.session.created", provider_event_id: result.data.id, payload: { plan, priceId }, processed: true });
  return json({ ok: true, url: result.data.url, sessionId: result.data.id });
}
