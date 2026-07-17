import { env } from "./_stripe";
import { json, requireUser, safeError } from "../_shared/security";

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    await requireUser(request, { roles: ["admin_master_global", "admin_master", "admin_empresa", "admin", "socio"] });
    const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"];
    const missing = required.filter((key) => !env(key) && !(key === "SUPABASE_URL" && env("VITE_SUPABASE_URL")));
    return json({ ok: missing.length === 0, mode: missing.length ? "prepared" : "configured", missing, message: missing.length ? "Cobrança preparada; faltam variáveis no servidor." : "Stripe e Supabase prontos para homologação." });
  } catch (error) {
    const safe = safeError(error, "Não foi possível verificar a cobrança.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
