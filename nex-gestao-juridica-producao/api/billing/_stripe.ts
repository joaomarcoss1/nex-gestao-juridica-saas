import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function env(name: string) { return process.env[name]?.trim(); }
export function json(body: unknown, status = 200) { return Response.json(body, { status }); }

export function appUrl(request: Request) {
  return env("APP_URL") || env("VERCEL_PROJECT_PRODUCTION_URL") && `https://${env("VERCEL_PROJECT_PRODUCTION_URL")}` || request.headers.get("origin") || "http://localhost:3000";
}

export function getSupabaseAdmin() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function stripeForm(path: string, params: URLSearchParams) {
  const secret = env("STRIPE_SECRET_KEY");
  if (!secret) return { ok: false, status: 200, data: { ok: false, prepared: true, missing: ["STRIPE_SECRET_KEY"], message: "Stripe preparado, mas STRIPE_SECRET_KEY não está configurada na Vercel." } };
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export function priceForPlan(plan: string) {
  const key = plan === "starter" ? "STRIPE_PRICE_STARTER" : plan === "enterprise" ? "STRIPE_PRICE_ENTERPRISE" : "STRIPE_PRICE_PRO";
  return env(key) || env("STRIPE_PRICE_PRO") || "";
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const values = Object.fromEntries(header.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  const timestamp = values.t;
  const signature = values.v1;
  if (!timestamp || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); } catch { return false; }
}

export async function ensureStripeCustomer(organizationId: string, fallbackEmail?: string, fallbackName?: string) {
  const supabase = getSupabaseAdmin();
  let organization: any = null;
  if (supabase && organizationId) {
    const { data } = await supabase.from("organizations").select("id, name, trade_name, email, stripe_customer_id").eq("id", organizationId).maybeSingle();
    organization = data;
    if (organization?.stripe_customer_id) return { customerId: organization.stripe_customer_id as string, organization, supabase };
  }
  const params = new URLSearchParams();
  params.set("email", organization?.email || fallbackEmail || "financeiro@nexlabs.app");
  params.set("name", organization?.trade_name || organization?.name || fallbackName || "Nex Gestão Jurídica");
  params.set("metadata[organization_id]", organizationId);
  const created = await stripeForm("customers", params);
  if (!created.ok) throw new Error(created.data?.error?.message || created.data?.message || "Falha ao criar cliente no Stripe.");
  const customerId = String(created.data.id);
  if (supabase && organizationId) await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", organizationId);
  return { customerId, organization, supabase };
}
