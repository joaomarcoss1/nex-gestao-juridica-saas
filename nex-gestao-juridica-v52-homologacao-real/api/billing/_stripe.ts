import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, getSupabaseAdmin, json } from "../_shared/security";

export { env, getSupabaseAdmin, json };

export function appUrl(request: Request) {
  const configured = env("APP_URL");
  const vercel = env("VERCEL_PROJECT_PRODUCTION_URL");
  const origin = request.headers.get("origin");
  const candidate = configured || (vercel ? `https://${vercel}` : "") || origin || "http://localhost:3000";
  try {
    const url = new URL(candidate);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("protocol");
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function stripeForm(path: string, params: URLSearchParams, idempotencyKey?: string) {
  const secret = env("STRIPE_SECRET_KEY");
  if (!secret) throw Object.assign(new Error("Stripe não configurado no servidor."), { status: 503 });
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : "Falha na comunicação com o Stripe.";
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 400 });
  }
  return data;
}

export function priceForPlan(plan: string) {
  const normalized = plan.toLowerCase();
  const key = normalized === "starter" ? "STRIPE_PRICE_STARTER" : normalized === "enterprise" ? "STRIPE_PRICE_ENTERPRISE" : normalized === "pro" ? "STRIPE_PRICE_PRO" : "";
  return key ? env(key) || "" : "";
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > toleranceSeconds) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => {
    try {
      const left = Buffer.from(signature, "hex");
      const right = Buffer.from(expected, "hex");
      return left.length === right.length && crypto.timingSafeEqual(left, right);
    } catch {
      return false;
    }
  });
}

export async function ensureStripeCustomer(admin: SupabaseClient, organizationId: string) {
  const { data: organization, error } = await admin
    .from("organizations")
    .select("id, name, trade_name, email, billing_email, stripe_customer_id")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!organization) throw Object.assign(new Error("Empresa não encontrada."), { status: 404 });
  if (organization.stripe_customer_id) return { customerId: String(organization.stripe_customer_id), organization };

  const params = new URLSearchParams();
  const email = String(organization.billing_email || organization.email || "").trim();
  if (email) params.set("email", email);
  params.set("name", String(organization.trade_name || organization.name || "Nex Gestão Jurídica"));
  params.set("metadata[organization_id]", organizationId);
  const created = await stripeForm("customers", params, `nex-customer-${organizationId}`);
  const customerId = String(created.id);
  const { error: updateError } = await admin.from("organizations").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("id", organizationId);
  if (updateError) throw updateError;
  return { customerId, organization };
}
