import { enforceRateLimit } from "../_shared/rateLimit";
import { getSupabaseAdmin, json, readJson, safeError } from "../_shared/security";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}
function digits(value: string) {
  return value.replace(/\D/g, "");
}
function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function portalRedirectUrl(request: Request) {
  const configured = process.env.APP_URL?.trim()
    || process.env.PUBLIC_APP_URL?.trim()
    || (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "");
  const origin = configured || request.headers.get("origin")?.trim() || "";
  if (!/^https?:\/\//i.test(origin)) {
    throw Object.assign(new Error("URL pública do aplicativo não configurada."), { status: 503 });
  }
  return `${origin.replace(/\/$/, "")}/portal`;
}

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    const payload = await readJson<Record<string, unknown>>(request, 32_000);
    const fullName = String(payload.fullName ?? "").trim();
    const cpf = digits(String(payload.cpf ?? ""));
    const email = String(payload.email ?? "").trim().toLowerCase();
    const registrationCode = digits(String(payload.registrationCode ?? ""));
    if (fullName.length < 8 || cpf.length !== 11 || !email.includes("@")) {
      throw Object.assign(new Error("Informe nome completo, CPF e e-mail válidos."), { status: 400 });
    }

    const admin = getSupabaseAdmin(true)!;
    await enforceRateLimit(admin, `portal:${requestIp(request)}:${email}`, 5, 900);

    let clientQuery = admin
      .from("clients")
      .select("id, organization_id, name, document, email, status")
      .ilike("email", email)
      .limit(20);
    if (registrationCode) {
      const { data: org } = await admin.from("organizations").select("id").eq("registration_code", registrationCode).maybeSingle();
      if (org?.id) clientQuery = clientQuery.eq("organization_id", org.id);
      else return json({ ok: true, message: "Se os dados estiverem corretos, um link seguro será enviado ao e-mail cadastrado." }, 202);
    }
    const { data: candidates, error } = await clientQuery;
    if (error) throw error;
    const client = (candidates ?? []).find((item) =>
      normalizeName(String(item.name ?? "")) === normalizeName(fullName)
      && digits(String(item.document ?? "")) === cpf
      && !["inativo", "arquivado"].includes(String(item.status ?? "").toLowerCase()),
    );

    if (client) {
      const profilePayload = {
        organization_id: client.organization_id,
        name: client.name,
        email,
        role: "cliente",
        sector: "Portal do Cliente",
        client_id: client.id,
        active: true,
        invitation_status: "portal_magic_link_requested",
        permissions: { "portal.view": true, "chat.view": true, "documents.upload": true },
        updated_at: new Date().toISOString(),
      };
      const { data: existingProfile, error: profileLookupError } = await admin
        .from("users_profiles")
        .select("id")
        .eq("organization_id", client.organization_id)
        .ilike("email", email)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (profileLookupError) throw profileLookupError;
      const profileMutation = existingProfile?.id
        ? admin.from("users_profiles").update(profilePayload).eq("id", existingProfile.id)
        : admin.from("users_profiles").insert({ ...profilePayload, created_at: new Date().toISOString() });
      const { error: profileError } = await profileMutation;
      if (profileError) throw profileError;

      const redirectTo = portalRedirectUrl(request);
      const { error: otpError } = await admin.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (otpError) throw otpError;
      await admin.from("audit_logs").insert({
        organization_id: client.organization_id,
        module: "portal",
        action: "portal_magic_link_requested",
        entity_id: client.id,
        after_data: { emailDomain: email.split("@")[1] || "" },
        created_at: new Date().toISOString(),
      });
    }

    // Resposta deliberadamente genérica para impedir enumeração de clientes.
    return json({ ok: true, message: "Se os dados estiverem corretos, um link seguro será enviado ao e-mail cadastrado." }, 202);
  } catch (error) {
    const safe = safeError(error, "Não foi possível solicitar o acesso ao portal.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
