import crypto from "node:crypto";
import { appUrl, stripeForm } from "./_stripe";
import { json, readJson, requireUser, resolveOrganization, safeError } from "../_shared/security";

const BILLING_ROLES = ["admin_master_global", "admin_master", "admin_empresa", "admin", "socio"];

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    const context = await requireUser(request, { roles: BILLING_ROLES });
    const payload = await readJson<Record<string, unknown>>(request);
    const organizationId = resolveOrganization(context, payload.organizationId);
    const { data: organization, error } = await context.admin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", organizationId)
      .maybeSingle();
    if (error) throw error;
    const customerId = String(organization?.stripe_customer_id || "");
    if (!customerId) throw Object.assign(new Error("Esta empresa ainda não possui cliente Stripe."), { status: 400 });

    const params = new URLSearchParams();
    params.set("customer", customerId);
    params.set("return_url", `${appUrl(request).replace(/\/$/, "")}/assinatura`);
    const nonce = crypto.createHash("sha256").update(`${organizationId}:${context.profileId}:${Math.floor(Date.now() / 300000)}`).digest("hex");
    const result = await stripeForm("billing_portal/sessions", params, `nex-portal-${nonce}`);
    await context.admin.from("audit_logs").insert({
      organization_id: organizationId,
      user_id: context.profileId,
      module: "billing",
      action: "stripe_billing_portal_created",
      entity_id: String(result.id),
      after_data: {},
      created_at: new Date().toISOString(),
    });
    return json({ ok: true, url: result.url });
  } catch (error) {
    const safe = safeError(error, "Não foi possível abrir o portal de cobrança.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
