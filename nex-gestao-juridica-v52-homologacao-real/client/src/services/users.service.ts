import { supabase } from "./supabase";
import { getCurrentOrganizationId, getCurrentProfileId, getCurrentProfileRole } from "./authContext";
import type { AuthProfile } from "@/types/app";
import { auditLog } from "@/services/audit";

export type InvitePayload = {
  name: string;
  email: string;
  role: AuthProfile["role"];
  sector?: string;
  clientId?: string;
};

function mapUser(row: any): AuthProfile {
  return { id: row.id, organizationId: row.organization_id, authUserId: row.auth_user_id, name: row.name, email: row.email, phone: row.phone, cpf: row.cpf, role: row.role, sector: row.sector, oab: row.oab, active: row.active !== false, clientId: row.client_id ?? undefined, permissions: row.permissions ?? {} };
}

function demoUsers(): AuthProfile[] {
  const org = getCurrentOrganizationId();
  return [
    { id: "00000000-0000-4000-8000-0000000000ad", organizationId: org, name: "Admin Master NexLabs", email: "admin@nexlabs.app", role: "admin_master", sector: "Diretoria", active: true },
    { id: "00000000-0000-4000-8000-0000000000e2", organizationId: org, name: "Dra. Larissa Almeida", email: "larissa@nexjuridico.com", role: "advogado", sector: "Advocacia", active: true },
    { id: "00000000-0000-4000-8000-0000000000e5", organizationId: org, name: "Rafael Sousa", email: "funcionario@nexlabs.app", role: "funcionario", sector: "Operacional", active: true },
    { id: "00000000-0000-4000-8000-0000000000c1", organizationId: org, name: "Wallace Pereira", email: "cliente@nexlabs.app", role: "cliente", sector: "Portal", active: true, clientId: "00000000-0000-4000-8000-0000000000c1" },
  ];
}

export async function listUsers(): Promise<AuthProfile[]> {
  if (!supabase) return demoUsers();
  const { data, error } = await supabase.from("users_profiles").select("*").eq("organization_id", getCurrentOrganizationId()).order("name");
  if (error) throw error;
  return (data ?? []).map(mapUser);
}

export async function inviteUser(payload: InvitePayload): Promise<AuthProfile | null> {
  if (!payload.email.includes("@")) throw new Error("Informe um e-mail válido.");
  if (payload.role === "cliente" && !payload.clientId) throw new Error("Perfil cliente exige cliente vinculado.");
  if (payload.role === "admin_master" && getCurrentProfileRole() !== "admin_master") throw new Error("Somente Admin Master pode criar outro Admin Master.");
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) {
    const response = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...payload, redirectTo: location.origin }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body?.ok && body.profile) return mapUser(body.profile);
    if (response.status >= 400) throw new Error(body?.message || "Falha no convite serverless.");
  }

  const { data, error } = await supabase.from("users_profiles").insert({
    organization_id: getCurrentOrganizationId(),
    name: payload.name || payload.email.split("@")[0],
    email: payload.email,
    role: payload.role,
    sector: payload.sector ?? "",
    client_id: payload.role === "cliente" ? payload.clientId ?? null : null,
    active: true,
    invited_at: new Date().toISOString(),
    invitation_status: "perfil_preparado_sem_backend",
    permissions: {},
  }).select("*").single();
  if (error) throw error;
  await auditLog("invite_user_profile_only", { module: "users_profiles", entityId: data.id, invitedBy: getCurrentProfileId(), email: payload.email, role: payload.role });
  return mapUser(data);
}

export async function setUserActive(userId: string, active: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from("users_profiles").update({ active }).eq("id", userId).eq("organization_id", getCurrentOrganizationId());
  if (error) throw error;
  await auditLog(active ? "activate_user" : "deactivate_user", { module: "users_profiles", entityId: userId });
}

export async function promoteToMasterAdmin(userId: string) {
  if (getCurrentProfileRole() !== "admin_master") throw new Error("Somente Admin Master pode tornar outro usuário Admin Master.");
  if (!supabase) return;
  const { error } = await supabase.from("users_profiles").update({ role: "admin_master", permissions: {} }).eq("id", userId).eq("organization_id", getCurrentOrganizationId());
  if (error) throw error;
  await auditLog("promote_admin_master", { module: "users_profiles", entityId: userId, promotedBy: getCurrentProfileId() });
}
