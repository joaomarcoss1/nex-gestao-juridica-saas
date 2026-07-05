import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { AuthProfile } from "@/types/app";
import { databaseMode, demoModeEnabled, supabase, supabaseConfigurationError } from "@/services/supabase";
import { demoProfile, setRuntimeAuthProfile } from "@/services/authContext";
import { clearStoredPortalPayload, loadStoredPortalPayload, saveStoredPortalPayload, type PublicPortalPayload } from "@/services/portal.service";

type DemoRole = "admin_master" | "funcionario" | "cliente";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  profile: AuthProfile | null;
  isDemo: boolean;
  error?: string;
  signIn: (email: string, password: string, options?: { demoRole?: DemoRole; registrationCode?: string }) => Promise<void>;
  signInClientPortal: (fullName: string, cpf: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function demoProfileForRole(role: DemoRole, email?: string): AuthProfile {
  const baseEmail = email || (role === "cliente" ? "cliente@nexlabs.app" : role === "funcionario" ? "funcionario@nexlabs.app" : demoProfile.email);
  const base = { ...demoProfile, email: baseEmail };
  if (role === "cliente") return { ...base, id: "00000000-0000-4000-8000-0000000000c1", name: "Cliente demonstração", role: "cliente", sector: "Portal do Cliente", clientId: "00000000-0000-4000-8000-0000000000c1" };
  if (role === "funcionario") return { ...base, id: "00000000-0000-4000-8000-0000000000e5", name: "Funcionário demonstração", role: "funcionario", sector: "Operacional", organizationRegistrationCode: "3272026", organizationName: "Nex Jurídico Demo" };
  return { ...base, id: demoProfile.id, name: "Admin Master NexLabs", role: "admin_master_global", sector: "Diretoria e Configurações", organizationRegistrationCode: "GLOBAL", organizationName: "NexLabs" };
}

function storedDemoProfile() {
  if (!demoModeEnabled) return null;
  const demoActive = localStorage.getItem("nex_demo_session") === "active";
  if (!demoActive) return null;
  const demoRole = (localStorage.getItem("nex_demo_role") || "admin_master") as DemoRole;
  const demoEmail = localStorage.getItem("nex_demo_email") || undefined;
  return demoProfileForRole(demoRole, demoEmail);
}

function profileFromPortalPayload(payload: PublicPortalPayload): AuthProfile {
  return {
    id: `portal-${payload.client.id}`,
    organizationId: payload.organizationId,
    authUserId: "portal-name-access",
    name: payload.client.name,
    email: payload.client.email ?? "",
    phone: payload.client.phone ?? "",
    role: "cliente",
    sector: "Portal do Cliente",
    active: true,
    clientId: payload.client.id,
    permissions: { "portal.view": true, "chat.view": true, "documents.upload": true },
  };
}

function mapProfile(row: any): AuthProfile {
  const organization = row.organizations ?? row.organization ?? null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    authUserId: row.auth_user_id,
    name: row.name ?? row.email ?? "Usuário Nex",
    email: row.email ?? "",
    phone: row.phone ?? "",
    cpf: row.cpf ?? "",
    role: row.role ?? "funcionario",
    sector: row.sector ?? "",
    oab: row.oab ?? "",
    active: row.active !== false,
    clientId: row.client_id ?? undefined,
    permissions: row.permissions ?? {},
    organizationRegistrationCode: row.organization_registration_code ?? organization?.registration_code ?? row.registration_code ?? undefined,
    organizationName: organization?.trade_name ?? organization?.name ?? row.organization_name ?? undefined,
  };
}

function firstRow(data: unknown): any | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function isGlobalMasterRole(role?: string) {
  return ["admin_master", "admin_master_global"].includes(String(role ?? "").toLowerCase());
}

async function validateCompanyRegistration(profile: AuthProfile, registrationCode?: string): Promise<AuthProfile> {
  if (!supabase || isGlobalMasterRole(profile.role)) return profile;
  const normalized = (registrationCode ?? localStorage.getItem("nex_company_registration") ?? "").replace(/\D/g, "").trim();
  if (!normalized) throw new Error("Informe a matrícula da empresa para acessar como admin, funcionário ou equipe interna.");

  const { data: organization, error } = await supabase.from("organizations").select("id, name, trade_name, registration_code, status, access_blocked, blocked_reason").eq("registration_code", normalized).maybeSingle();
  if (error) throw error;
  if (!organization) throw new Error("Matrícula da empresa inválida para este usuário.");
  if (organization.id !== profile.organizationId) throw new Error("Este usuário não pertence à empresa informada.");
  if (organization.access_blocked || ["bloqueada", "suspensa", "inativa"].includes(String(organization.status ?? "").toLowerCase())) {
    throw new Error(organization.blocked_reason || "O acesso desta empresa está bloqueado. Entre em contato com o suporte NexLabs.");
  }
  localStorage.setItem("nex_company_registration", normalized);
  return { ...profile, organizationRegistrationCode: normalized, organizationName: organization.trade_name || organization.name };
}

async function ensureProfile(session: Session | null, registrationCode?: string): Promise<AuthProfile | null> {
  if (!supabase || !session?.user) return null;
  const user = session.user;
  const name = user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuário Nex";

  const { data: rpcData, error: rpcError } = await supabase.rpc("ensure_current_user_profile", { p_name: name });
  if (!rpcError) {
    const row = firstRow(rpcData);
    if (row) {
      const profile = mapProfile(row);
      if (!profile.active) throw new Error("Usuário inativo. Solicite reativação ao administrador do escritório.");
      return validateCompanyRegistration(profile, registrationCode);
    }
  }

  const { data, error } = await supabase.from("users_profiles").select("*, organizations(id, name, trade_name, registration_code, status, access_blocked, blocked_reason)").eq("auth_user_id", user.id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar o perfil. ${rpcError?.message ?? error.message}`);
  if (!data) throw new Error("Usuário autenticado, mas sem perfil vinculado. Rode a migration v39 ou vincule este usuário em users_profiles.auth_user_id.");
  const profile = mapProfile(data);
  if (!profile.active) throw new Error("Usuário inativo. Solicite reativação ao administrador do escritório.");
  return validateCompanyRegistration(profile, registrationCode);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | undefined>();
  const isDemo = databaseMode === "demo" && demoModeEnabled;

  const loadProfile = useCallback(async (nextSession: Session | null, registrationCode?: string) => {
    if (isDemo) {
      const activeProfile = storedDemoProfile();
      setRuntimeAuthProfile(activeProfile);
      setProfile(activeProfile);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const loaded = await ensureProfile(nextSession, registrationCode);
      setProfile(loaded);
      setRuntimeAuthProfile(loaded);
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar o perfil.";
      setError(message);
      setProfile(null);
      setRuntimeAuthProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (!supabase) {
      localStorage.removeItem("nex_demo_session");
      localStorage.removeItem("nex_demo_role");
      localStorage.removeItem("nex_demo_email");
      clearStoredPortalPayload();
      setRuntimeAuthProfile(null);
      setProfile(null);
      setError(demoModeEnabled ? undefined : supabaseConfigurationError);
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        void loadProfile(data.session, localStorage.getItem("nex_company_registration") ?? undefined);
        return;
      }
      const portalPayload = loadStoredPortalPayload();
      if (portalPayload) {
        const portalProfile = profileFromPortalPayload(portalPayload);
        setProfile(portalProfile);
        setRuntimeAuthProfile(portalProfile);
        setError(undefined);
        setLoading(false);
        return;
      }
      setProfile(null);
      setRuntimeAuthProfile(null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession) => {
      setSession(nextSession);
      if (nextSession) clearStoredPortalPayload();
      void loadProfile(nextSession, localStorage.getItem("nex_company_registration") ?? undefined);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string, options?: { demoRole?: DemoRole; registrationCode?: string }) => {
    if (!supabase) {
      if (!demoModeEnabled) throw new Error(supabaseConfigurationError);
      const demoRole = options?.demoRole ?? "admin_master";
      localStorage.setItem("nex_demo_session", "active");
      localStorage.setItem("nex_demo_role", demoRole);
      if (email) localStorage.setItem("nex_demo_email", email);
      if (options?.registrationCode) localStorage.setItem("nex_company_registration", options.registrationCode.replace(/\D/g, ""));
      const namedDemoProfile = demoProfileForRole(demoRole, email);
      setProfile(namedDemoProfile);
      setRuntimeAuthProfile(namedDemoProfile);
      history.pushState({}, "", demoRole === "cliente" ? "/portal" : "/");
      window.dispatchEvent(new Event("popstate"));
      void password;
      return;
    }
    clearStoredPortalPayload();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) throw signInError;
    await loadProfile(data.session, options?.registrationCode);
  }, [loadProfile]);

  const signInClientPortal = useCallback(async (fullName: string, cpf: string) => {
    const normalized = fullName.trim().replace(/\s+/g, " ");
    const normalizedCpf = cpf.replace(/\D/g, "");
    if (!normalized) throw new Error("Informe o nome completo cadastrado no escritório.");
    if (normalizedCpf.length < 11) throw new Error("Informe o CPF completo do cliente.");
    if (!supabase) throw new Error(supabaseConfigurationError);

    await supabase.auth.signOut();
    const { data, error: portalError } = await supabase.rpc("client_portal_by_name_cpf", { p_full_name: normalized, p_cpf: normalizedCpf });
    if (portalError) throw new Error(portalError.message);
    const payload = data as PublicPortalPayload | null;
    if (!payload?.client?.id) throw new Error("Cliente não encontrado. Confira nome completo e CPF cadastrados no escritório.");

    saveStoredPortalPayload(payload);
    const portalProfile = profileFromPortalPayload(payload);
    setSession(null);
    setProfile(portalProfile);
    setRuntimeAuthProfile(portalProfile);
    setError(undefined);
    history.pushState({}, "", "/portal");
    window.dispatchEvent(new Event("popstate"));
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error(supabaseConfigurationError);
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name } } });
    if (signUpError) throw signUpError;
    if (data.session) await ensureProfile(data.session, localStorage.getItem("nex_company_registration") ?? undefined);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error(supabaseConfigurationError);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
    if (resetError) throw resetError;
  }, []);

  const signOut = useCallback(async () => {
    clearStoredPortalPayload();
    if (!supabase) {
      localStorage.removeItem("nex_demo_session");
      localStorage.removeItem("nex_demo_role");
      localStorage.removeItem("nex_demo_email");
      setSession(null);
      setProfile(null);
      setRuntimeAuthProfile(null);
      history.pushState({}, "", "/");
      window.dispatchEvent(new Event("popstate"));
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRuntimeAuthProfile(null);
    history.pushState({}, "", "/");
    window.dispatchEvent(new Event("popstate"));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ loading, session, profile, isDemo, error, signIn, signInClientPortal, signUp, resetPassword, signOut, reloadProfile: () => loadProfile(session, localStorage.getItem("nex_company_registration") ?? undefined) }), [loading, session, profile, isDemo, error, signIn, signInClientPortal, signUp, resetPassword, signOut, loadProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext precisa estar dentro de AuthProvider");
  return ctx;
}
