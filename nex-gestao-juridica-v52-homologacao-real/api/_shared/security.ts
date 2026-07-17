import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type UserContext = {
  userId: string;
  profileId: string;
  organizationId: string;
  role: string;
  email: string;
  clientId?: string;
  permissions: Record<string, boolean>;
  admin: SupabaseClient;
};

export function env(name: string) {
  return process.env[name]?.trim();
}

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...(headers ?? {}),
    },
  });
}

export function getSupabaseAdmin(required = false) {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  if (!url || !key) {
    if (required) throw new Error("Configuração segura do Supabase ausente no servidor.");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-nex-server": "v50" } },
  });
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export async function requireUser(request: Request, options?: { roles?: string[]; requireOrganization?: boolean }) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Sessão ausente."), { status: 401 });
  const admin = getSupabaseAdmin(true)!;
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw Object.assign(new Error("Sessão inválida ou expirada."), { status: 401 });

  const { data: profile, error: profileError } = await admin
    .from("users_profiles")
    .select("id, organization_id, role, email, active, client_id, permissions")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError) throw Object.assign(new Error("Não foi possível validar o perfil de acesso."), { status: 500 });
  if (!profile?.active) throw Object.assign(new Error("Perfil inativo ou não vinculado."), { status: 403 });
  if (options?.requireOrganization !== false && !profile.organization_id) {
    throw Object.assign(new Error("Perfil sem organização vinculada."), { status: 403 });
  }

  const role = String(profile.role ?? "").toLowerCase();
  if (options?.roles?.length && !options.roles.map((item) => item.toLowerCase()).includes(role)) {
    throw Object.assign(new Error("Seu perfil não possui permissão para esta operação."), { status: 403 });
  }

  return {
    userId: authData.user.id,
    profileId: String(profile.id),
    organizationId: String(profile.organization_id ?? ""),
    role,
    email: String(profile.email ?? authData.user.email ?? ""),
    clientId: profile.client_id ? String(profile.client_id) : undefined,
    permissions: (profile.permissions ?? {}) as Record<string, boolean>,
    admin,
  } satisfies UserContext;
}

export function isGlobalMaster(role: string) {
  return ["admin_master", "admin_master_global"].includes(role.toLowerCase());
}

export function resolveOrganization(context: UserContext, requestedOrganizationId?: unknown) {
  const requested = String(requestedOrganizationId ?? "").trim();
  if (isGlobalMaster(context.role) && requested) return requested;
  if (requested && requested !== context.organizationId) {
    throw Object.assign(new Error("A organização solicitada não pertence ao usuário autenticado."), { status: 403 });
  }
  return context.organizationId;
}

export async function readJson<T extends Record<string, unknown>>(request: Request, maxBytes = 128_000): Promise<T> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw Object.assign(new Error("Payload excede o limite permitido."), { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw Object.assign(new Error("Payload excede o limite permitido."), { status: 413 });
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw Object.assign(new Error("JSON inválido."), { status: 400 });
  }
}

export function constantTimeEqual(received: string | null | undefined, expected: string | null | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function requireSharedSecret(request: Request, envName: string, headerName = "x-nex-webhook-secret") {
  const expected = env(envName);
  if (!expected) throw Object.assign(new Error(`${envName} não configurado. Endpoint bloqueado por segurança.`), { status: 503 });
  const received = headerName.toLowerCase() === "authorization"
    ? bearerToken(request)
    : request.headers.get(headerName) ?? bearerToken(request);
  if (!constantTimeEqual(received, expected)) throw Object.assign(new Error("Assinatura ou segredo inválido."), { status: 401 });
  return expected;
}

export function safeError(error: unknown, fallback = "Operação não concluída.") {
  const status = Number((error as { status?: number })?.status ?? 500);
  const exposed = status >= 400 && status < 500;
  const message = exposed && error instanceof Error ? error.message : fallback;
  return { status, message };
}

export function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function claimWebhookEvent(
  admin: SupabaseClient,
  provider: string,
  eventId: string,
  eventType: string,
  organizationId?: string,
  payload?: unknown,
) {
  if (!eventId) throw Object.assign(new Error("Identificador idempotente do evento ausente."), { status: 400 });
  const { data: existing, error: readError } = await admin
    .from("payment_events")
    .select("id, processed, created_at, processing_error")
    .eq("provider", provider)
    .eq("provider_event_id", eventId)
    .maybeSingle();
  if (readError && !String(readError.message).toLowerCase().includes("does not exist")) throw readError;
  if (existing) {
    if (existing.processed) return { duplicate: true, id: existing.id as string };
    const createdAt = Date.parse(String(existing.created_at ?? ""));
    const stale = !Number.isFinite(createdAt) || Date.now() - createdAt >= 5 * 60_000;
    if (!stale && !existing.processing_error) return { duplicate: true, id: existing.id as string };
    const { error: retryError } = await admin
      .from("payment_events")
      .update({
        payload: payload ?? {},
        event_type: eventType,
        organization_id: organizationId || null,
        processing_error: null,
        processed_at: null,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("processed", false);
    if (retryError) throw retryError;
    return { duplicate: false, id: String(existing.id), retry: true };
  }

  const { data, error } = await admin
    .from("payment_events")
    .insert({
      provider,
      provider_event_id: eventId,
      event_type: eventType,
      organization_id: organizationId || null,
      payload: payload ?? {},
      processed: false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    if (["23505", "409"].includes(String(error.code))) return { duplicate: true, id: "duplicate" };
    throw error;
  }
  return { duplicate: false, id: String(data.id) };
}

export async function markWebhookProcessed(admin: SupabaseClient, id: string, result?: unknown) {
  if (!id || id === "duplicate") return;
  const { error } = await admin
    .from("payment_events")
    .update({ processed: true, processed_at: new Date().toISOString(), processing_result: result ?? null, processing_error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markWebhookFailed(admin: SupabaseClient, id: string, error: unknown) {
  if (!id || id === "duplicate") return;
  const safeMessage = error instanceof Error ? error.message.slice(0, 300) : "Falha no processamento";
  await admin
    .from("payment_events")
    .update({ processed: false, processed_at: null, processing_error: safeMessage })
    .eq("id", id);
}
