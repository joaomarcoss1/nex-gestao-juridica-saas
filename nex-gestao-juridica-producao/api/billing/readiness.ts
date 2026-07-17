import { env, json } from "./_stripe";
export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO", "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL"];
  const missing = required.filter((key) => !env(key));
  return json({ ok: missing.length === 0, mode: missing.length ? "prepared" : "configured", missing, message: missing.length ? "Cobrança preparada; faltam variáveis na Vercel." : "Stripe e Supabase prontos para homologação." });
}
