import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { AuthProfile } from "@/types/app";
import { databaseMode, supabase } from "@/services/supabase";
import { demoProfile, setRuntimeAuthProfile } from "@/services/authContext";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  profile: AuthProfile | null;
  isDemo: boolean;
  error?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: any): AuthProfile {
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
  };
}

async function ensureProfile(session: Session | null): Promise<AuthProfile | null> {
  if (!supabase || !session?.user) return databaseMode === "demo" ? demoProfile : null;
  const user = session.user;
  const { data, error } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const profile = mapProfile(data);
    if (!profile.active) throw new Error("Usuário inativo. Solicite reativação ao administrador do escritório.");
    await supabase.from("users_profiles").update({ last_login_at: new Date().toISOString() }).eq("id", profile.id);
    return profile;
  }

  // Primeiro acesso: tenta criar uma organização e perfil admin. Em bancos com RLS estrita,
  // use o seed/admin SQL documentado em SUPABASE_SETUP.md.
  const organizationId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const name = user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Administrador";
  await supabase.from("organizations").insert({ id: organizationId, name: "Escritório Nex Gestão Jurídica", trade_name: "NexLabs" });
  const { data: created, error: createError } = await supabase
    .from("users_profiles")
    .insert({ id: profileId, organization_id: organizationId, auth_user_id: user.id, name, email: user.email, role: "admin", sector: "Diretoria", active: true })
    .select("*")
    .single();
  if (createError) throw createError;
  await supabase.from("users_profiles").update({ last_login_at: new Date().toISOString(), invitation_status: "primeiro_admin_criado" }).eq("id", created.id);
  return mapProfile(created);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(databaseMode === "demo" ? demoProfile : null);
  const [error, setError] = useState<string | undefined>();
  const isDemo = databaseMode === "demo";

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (isDemo) {
      setRuntimeAuthProfile(demoProfile);
      setProfile(demoProfile);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const loaded = await ensureProfile(nextSession);
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
      setRuntimeAuthProfile(demoProfile);
      setProfile(demoProfile);
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadProfile(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) return;
    const { error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (signUpError) throw signUpError;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (resetError) throw resetError;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRuntimeAuthProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ loading, session, profile, isDemo, error, signIn, signUp, resetPassword, signOut, reloadProfile: () => loadProfile(session) }), [loading, session, profile, isDemo, error, signIn, signUp, resetPassword, signOut, loadProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext precisa estar dentro de AuthProvider");
  return ctx;
}
