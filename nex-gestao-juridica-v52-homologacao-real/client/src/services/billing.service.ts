import { authenticatedFetch, readApiJson } from "./apiClient";

export type CheckoutRequest = {
  organizationId: string;
  plan: "starter" | "pro" | "enterprise";
};

type ApiResult = { ok: boolean; url?: string; message?: string; missing?: string[]; mode?: string };

async function postBilling(endpoint: string, payload: Record<string, unknown>): Promise<ApiResult> {
  const response = await authenticatedFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
  return readApiJson<ApiResult>(response);
}

export async function startStripeCheckout(payload: CheckoutRequest) {
  const result = await postBilling("/api/billing/create-checkout-session", payload);
  if (!result.url) throw new Error(result.message || "Checkout Stripe não retornou URL.");
  window.location.assign(result.url);
}

export async function openStripeCustomerPortal(organizationId: string) {
  const result = await postBilling("/api/billing/create-portal-session", { organizationId });
  if (!result.url) throw new Error(result.message || "Portal Stripe não retornou URL.");
  window.location.assign(result.url);
}

export async function testBillingReadiness() {
  return postBilling("/api/billing/readiness", {});
}
