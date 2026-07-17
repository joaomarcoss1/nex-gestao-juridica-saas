import { env, getSupabaseAdmin, json, verifyStripeSignature } from "./_stripe";
import { claimWebhookEvent, markWebhookFailed, markWebhookProcessed, safeError } from "../_shared/security";

export const config = { api: { bodyParser: false } };

async function processSubscriptionEvent(event: Record<string, any>) {
  const admin = getSupabaseAdmin(true)!;
  const object = event.data?.object ?? {};
  const eventType = String(event.type || "stripe.event");
  const organizationId = String(object.metadata?.organization_id || object.client_reference_id || "");
  const claim = await claimWebhookEvent(admin, "stripe", String(event.id || ""), eventType, organizationId || undefined, event);
  if (claim.duplicate) return { duplicate: true };

  try {
    if (eventType === "checkout.session.completed") {
      if (!organizationId) throw Object.assign(new Error("Evento Stripe sem organization_id."), { status: 400 });
      const { data: org, error: orgError } = await admin.from("organizations").select("billing_exempt_forever, manual_trial_enabled").eq("id", organizationId).maybeSingle();
      if (orgError) throw orgError;
      if (!org) throw Object.assign(new Error("Organização do evento não encontrada."), { status: 404 });
      if (!org.billing_exempt_forever) {
        const { error } = await admin.from("organizations").update({
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.subscription,
          plan: object.metadata?.plan || "Pro",
          status: "Ativa",
          access_blocked: false,
          subscription_status: "active",
          billing_mode: "stripe",
          manual_trial_enabled: false,
          updated_at: new Date().toISOString(),
        }).eq("id", organizationId);
        if (error) throw error;
        const { error: subscriptionError } = await admin.from("billing_subscriptions").upsert({
          organization_id: organizationId,
          provider: "stripe",
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.subscription,
          status: "active",
          plan: object.metadata?.plan || "pro",
          current_period_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "provider,stripe_subscription_id" });
        if (subscriptionError) throw subscriptionError;
      }
    }

    if (eventType.startsWith("customer.subscription.")) {
      const subscriptionId = String(object.id || "");
      const status = String(object.status || "unknown");
      const customerId = String(object.customer || "");
      if (!subscriptionId || !customerId) throw Object.assign(new Error("Assinatura Stripe incompleta."), { status: 400 });
      const periodEnd = object.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null;
      const { error: upsertError } = await admin.from("billing_subscriptions").upsert({
        provider: "stripe",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(object.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,stripe_subscription_id" });
      if (upsertError) throw upsertError;
      const shouldBlock = ["canceled", "unpaid"].includes(status);
      const { error: orgError } = await admin.from("organizations").update({
        stripe_subscription_id: subscriptionId,
        subscription_status: status,
        access_blocked: shouldBlock,
        updated_at: new Date().toISOString(),
      }).eq("stripe_customer_id", customerId).eq("billing_exempt_forever", false).eq("manual_trial_enabled", false);
      if (orgError) throw orgError;
    }

    if (["invoice.paid", "invoice.payment_failed"].includes(eventType)) {
      const customerId = String(object.customer || "");
      const { error: invoiceError } = await admin.from("billing_invoices").upsert({
        provider: "stripe",
        stripe_invoice_id: object.id,
        stripe_customer_id: customerId,
        status: object.status || eventType,
        amount_due: Number(object.amount_due || 0) / 100,
        amount_paid: Number(object.amount_paid || 0) / 100,
        hosted_invoice_url: object.hosted_invoice_url,
        invoice_pdf: object.invoice_pdf,
        payload: object,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,stripe_invoice_id" });
      if (invoiceError) throw invoiceError;
      if (eventType === "invoice.payment_failed") {
        const { error } = await admin.from("organizations").update({ subscription_status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_customer_id", customerId).eq("billing_exempt_forever", false).eq("manual_trial_enabled", false);
        if (error) throw error;
      }
    }

    await markWebhookProcessed(admin, claim.id, { status: "processed", eventType });
    return { duplicate: false };
  } catch (error) {
    await markWebhookFailed(admin, claim.id, error);
    throw error;
  }
}

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    const secret = env("STRIPE_WEBHOOK_SECRET");
    if (!secret) throw Object.assign(new Error("STRIPE_WEBHOOK_SECRET não configurado. Webhook bloqueado."), { status: 503 });
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1_000_000) throw Object.assign(new Error("Payload excede o limite permitido."), { status: 413 });
    if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
      throw Object.assign(new Error("Assinatura Stripe inválida ou expirada."), { status: 400 });
    }
    let event: Record<string, any>;
    try { event = JSON.parse(raw); } catch { throw Object.assign(new Error("Evento Stripe inválido."), { status: 400 }); }
    const result = await processSubscriptionEvent(event);
    return json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    const safe = safeError(error, "Webhook Stripe não processado.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
