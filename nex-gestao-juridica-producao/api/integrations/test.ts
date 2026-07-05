import { createClient } from "@supabase/supabase-js";
function env(name: string) { return process.env[name]?.trim(); }
function json(body: unknown, status = 200) { return Response.json(body, { status }); }

const providers: Record<string, string[]> = {
  "Asaas": ["ASAAS_API_KEY"],
  "Mercado Pago": ["MERCADO_PAGO_ACCESS_TOKEN"],
  "Stripe": ["STRIPE_SECRET_KEY"],
  "WhatsApp Business": ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  "Evolution API": ["EVOLUTION_API_URL", "EVOLUTION_API_KEY"],
  "E-mail": ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
  "Tribunais": ["TRIBUNAIS_API_URL", "TRIBUNAIS_API_KEY"],
  "ICP-Brasil": ["ICP_API_URL", "ICP_API_KEY"],
};

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  const payload = await request.json().catch(() => ({}));
  const provider = String(payload.provider ?? "Outro");
  const required = providers[provider] ?? [];
  const missing = required.filter((key) => !env(key));
  const status = missing.length ? "prepared" : "configured";
  if (url && serviceRole && payload.integrationId) {
    const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
    await supabase.from("integrations").update({ status: missing.length ? "preparado" : "conectado", last_sync_at: new Date().toISOString(), config: { required, missing, testedAt: new Date().toISOString() } }).eq("id", payload.integrationId);
  }
  return json({ ok: missing.length === 0, status, provider, required, missing, message: missing.length ? "Integração preparada, mas faltam variáveis de ambiente reais." : "Credenciais mínimas presentes. Homologue webhooks e escopo antes de produção." });
}
