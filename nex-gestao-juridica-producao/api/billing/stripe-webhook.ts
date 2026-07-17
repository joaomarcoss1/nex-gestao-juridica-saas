import { env, getSupabaseAdmin, json, verifyStripeSignature } from "./_stripe";

export const config = { api: { bodyParser: false } };

async function upsertSubscription(event: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const object = event.data?.object ?? {};
  const eventType = String(event.type || "stripe.event");
  const organizationId = String(object.metadata?.organization_id || object.client_reference_id || "");
  await supabase.from("payment_events").upsert({ provider: "stripe", provider_event_id: event.id, event_type: eventType, organization_id: organizationId || null, payload: event, processed: true, processed_at: new Date().toISOString() }, { onConflict: "provider,provider_event_id" });

  if (eventType === "checkout.session.completed") {
    const orgId = organizationId;
    const { data: org } = await supabase.from("organizations").select("billing_exempt_forever").eq("id", orgId).maybeSingle();
    if (!org?.billing_exempt_forever) {
      await supabase.from("organizations").update({ stripe_customer_id: object.customer, stripe_subscription_id: object.subscription, plan: object.metadata?.plan || "Pro", status: "Ativa", access_blocked: false, subscription_status: "active", billing_mode: "stripe", manual_trial_enabled: false }).eq("id", orgId);
      await supabase.from("billing_subscriptions").upsert({ organization_id: orgId, provider: "stripe", stripe_customer_id: object.customer, stripe_subscription_id: object.subscription, status: "active", plan: object.metadata?.plan || "pro", current_period_end: null, updated_at: new Date().toISOString() }, { onConflict: "provider,stripe_subscription_id" });
    }
  }

  if (eventType.startsWith("customer.subscription.")) {
    const subscriptionId = String(object.id || "");
    const status = String(object.status || "unknown");
    const customerId = String(object.customer || "");
    const periodEnd = object.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null;
    await supabase.from("billing_subscriptions").upsert({ provider: "stripe", stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, status, current_period_end: periodEnd, cancel_at_period_end: Boolean(object.cancel_at_period_end), updated_at: new Date().toISOString() }, { onConflict: "provider,stripe_subscription_id" });
    const shouldBlock = ["canceled", "unpaid"].includes(status);
    await supabase.from("organizations").update({ stripe_subscription_id: subscriptionId, subscription_status: status, access_blocked: shouldBlock }).eq("stripe_customer_id", customerId).eq("billing_exempt_forever", false).eq("manual_trial_enabled", false);
  }

  if (["invoice.paid", "invoice.payment_failed"].includes(eventType)) {
    const customerId = String(object.customer || "");
    await supabase.from("billing_invoices").upsert({ provider: "stripe", stripe_invoice_id: object.id, stripe_customer_id: customerId, status: object.status || eventType, amount_due: Number(object.amount_due || 0) / 100, amount_paid: Number(object.amount_paid || 0) / 100, hosted_invoice_url: object.hosted_invoice_url, invoice_pdf: object.invoice_pdf, payload: object, updated_at: new Date().toISOString() }, { onConflict: "provider,stripe_invoice_id" });
    if (eventType === "invoice.payment_failed") await supabase.from("organizations").update({ subscription_status: "past_due" }).eq("stripe_customer_id", customerId).eq("billing_exempt_forever", false).eq("manual_trial_enabled", false);
  }
}

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const raw = await request.text();
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (secret && !verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) return json({ ok: false, message: "Webhook Stripe com assinatura inválida." }, 400);
  const event = JSON.parse(raw);
  await upsertSubscription(event);
  return json({ received: true });
}
