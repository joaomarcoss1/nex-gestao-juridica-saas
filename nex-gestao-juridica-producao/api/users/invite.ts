import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  return process.env[name]?.trim();
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export default async function handler(request: Request) {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  if (!url || !serviceRole) {
    return json({ ok: false, prepared: true, message: "Configure SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para convite real." }, 200);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const userJwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!userJwt) return json({ ok: false, message: "Sessão ausente." }, 401);

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const userClient = createClient(url, serviceRole, { global: { headers: { Authorization: `Bearer ${userJwt}` } }, auth: { persistSession: false } });

  const { data: userData, error: userError } = await userClient.auth.getUser(userJwt);
  if (userError || !userData.user) return json({ ok: false, message: "Sessão inválida." }, 401);

  const { data: requester, error: requesterError } = await admin
    .from("users_profiles")
    .select("id, organization_id, role, active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (requesterError) return json({ ok: false, message: requesterError.message }, 500);
  if (!requester?.active || !["admin_master", "admin", "socio"].includes(String(requester.role))) {
    return json({ ok: false, message: "Somente Admin Master, admin ou sócio pode convidar usuários." }, 403);
  }

  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email ?? "").trim().toLowerCase();
  const name = String(payload.name ?? email.split("@")[0] ?? "Usuário Nex").trim();
  const role = String(payload.role ?? "funcionario");
  const sector = String(payload.sector ?? "");
  const clientId = payload.clientId ? String(payload.clientId) : null;

  if (!email.includes("@")) return json({ ok: false, message: "E-mail inválido." }, 400);
  if (role === "cliente" && !clientId) return json({ ok: false, message: "Perfil cliente exige client_id vinculado." }, 400);
  if (role === "admin_master" && String(requester.role) !== "admin_master") return json({ ok: false, message: "Somente Admin Master pode criar outro Admin Master." }, 403);

  const redirectTo = String(payload.redirectTo ?? request.headers.get("origin") ?? "");
  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, redirectTo ? { redirectTo } : undefined);
  if (inviteError && !inviteError.message.toLowerCase().includes("already")) {
    return json({ ok: false, message: inviteError.message }, 400);
  }

  const authUserId = invite?.user?.id ?? null;
  const { data: profile, error: upsertError } = await admin
    .from("users_profiles")
    .upsert({
      organization_id: requester.organization_id,
      auth_user_id: authUserId,
      name,
      email,
      role,
      sector,
      client_id: role === "cliente" ? clientId : null,
      active: true,
      invited_at: new Date().toISOString(),
      invitation_status: authUserId ? "convite_enviado" : "perfil_preparado",
      permissions: {},
    }, { onConflict: "organization_id,email" })
    .select("*")
    .single();

  if (upsertError) return json({ ok: false, message: upsertError.message }, 400);

  await admin.from("audit_logs").insert({
    organization_id: requester.organization_id,
    user_id: requester.id,
    module: "users_profiles",
    action: "invite_user_backend",
    entity_id: profile.id,
    after_data: { email, role, clientId, status: profile.invitation_status },
    created_at: new Date().toISOString(),
  });

  return json({ ok: true, profile, inviteSent: Boolean(authUserId), message: authUserId ? "Convite enviado pelo Supabase Auth." : "Perfil preparado; usuário já existente ou convite não retornou ID." });
}
