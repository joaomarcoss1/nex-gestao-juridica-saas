export type CheckoutRequest = {
  organizationId: string;
  plan: "starter" | "pro" | "enterprise";
  email?: string;
  organizationName?: string;
};

type ApiResult = { ok: boolean; url?: string; message?: string; missing?: string[]; mode?: string };

async function postBilling(endpoint: string, payload: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Não foi possível iniciar a operação de cobrança.");
  }
  return data as ApiResult;
}

export async function startStripeCheckout(payload: CheckoutRequest) {
  const result = await postBilling("/api/billing/create-checkout-session", payload);
  if (!result.url) throw new Error(result.message || "Checkout Stripe não retornou URL.");
  window.location.href = result.url;
}

export async function openStripeCustomerPortal(organizationId: string) {
  const result = await postBilling("/api/billing/create-portal-session", { organizationId });
  if (!result.url) throw new Error(result.message || "Portal Stripe não retornou URL.");
  window.location.href = result.url;
}

export async function testBillingReadiness() {
  return postBilling("/api/billing/readiness", {});
}
