import crypto from "node:crypto";
import { appUrl, ensureStripeCustomer, priceForPlan, stripeForm } from "./_stripe";
import { json, readJson, requireUser, resolveOrganization, safeError } from "../_shared/security";

const BILLING_ROLES = ["admin_master_global", "admin_master", "admin_empresa", "admin", "socio"];
const ALLOWED_PLANS = new Set(["starter", "pro", "enterprise"]);

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    const context = await requireUser(request, { roles: BILLING_ROLES });
    const payload = await readJson<Record<string, unknown>>(request);
    const organizationId = resolveOrganization(context, payload.organizationId);
    const plan = String(payload.plan || "pro").toLowerCase();
    if (!ALLOWED_PLANS.has(plan)) throw Object.assign(new Error("Plano inválido."), { status: 400 });
    const priceId = priceForPlan(plan);
    if (!priceId) throw Object.assign(new Error(`Price ID do plano ${plan} não configurado no servidor.`), { status: 503 });

    const { data: organization, error: orgError } = await context.admin
      .from("organizations")
      .select("id, billing_mode, manual_trial_enabled, billing_exempt_forever, billing_exempt_reason, manual_trial_reason, status, access_blocked")
      .eq("id", organizationId)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!organization) throw Object.assign(new Error("Empresa não encontrada."), { status: 404 });
    if (organization.access_blocked || ["bloqueada", "suspensa", "inativa"].includes(String(organization.status).toLowerCase())) {
      throw Object.assign(new Error("A empresa está bloqueada para operações de cobrança."), { status: 409 });
    }
    if (organization.billing_exempt_forever) {
      throw Object.assign(new Error(organization.billing_exempt_reason || "Esta empresa possui isenção permanente de cobrança."), { status: 409 });
    }
    if (organization.manual_trial_enabled) {
      throw Object.assign(new Error(organization.manual_trial_reason || "Esta empresa está em teste gratuito manual."), { status: 409 });
    }

    const { customerId } = await ensureStripeCustomer(context.admin, organizationId);
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
    params.set("metadata[requested_by]", context.profileId);
    if (process.env.STRIPE_TAX_ENABLED?.trim() === "true") params.set("automatic_tax[enabled]", "true");

    const nonce = crypto.createHash("sha256").update(`${organizationId}:${plan}:${Math.floor(Date.now() / 300000)}`).digest("hex");
    const result = await stripeForm("checkout/sessions", params, `nex-checkout-${nonce}`);
    await context.admin.from("audit_logs").insert({
      organization_id: organizationId,
      user_id: context.profileId,
      module: "billing",
      action: "stripe_checkout_created",
      entity_id: String(result.id),
      after_data: { plan },
      created_at: new Date().toISOString(),
    });
    return json({ ok: true, url: result.url, sessionId: result.id });
  } catch (error) {
    const safe = safeError(error, "Não foi possível iniciar a assinatura.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
