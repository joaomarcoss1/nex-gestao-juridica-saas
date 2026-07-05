import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type NexDatabaseMode = "demo" | "production";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

function normalizeSupabaseUrl(value?: string) {
  return (value ?? "")
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = rawAnonKey ?? "";

function isValidSupabaseUrl(value?: string) {
  return Boolean(value && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value));
}

function looksLikeSupabasePublicKey(value?: string) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith("eyJ") || trimmed.startsWith("sb_publishable_");
}

export const hasValidSupabaseConfig = isValidSupabaseUrl(supabaseUrl) && looksLikeSupabasePublicKey(supabaseAnonKey);
export const databaseMode: NexDatabaseMode = hasValidSupabaseConfig ? "production" : "demo";

/**
 * Fonte única da verdade: em produção o app só opera com Supabase válido.
 * O modo demo é permitido somente em DEV + VITE_ENABLE_DEMO=true.
 */
export const demoModeEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO === "true" && !hasValidSupabaseConfig;
export function isProductionSupabaseEnabled() {
  return hasValidSupabaseConfig && Boolean(supabase);
}

export const supabaseConfigurationError = hasValidSupabaseConfig
  ? ""
  : "Supabase não configurado no build. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel e faça Redeploy com Clear Build Cache.";

if (rawUrl && !isValidSupabaseUrl(supabaseUrl)) {
  console.warn("VITE_SUPABASE_URL inválida. Use https://SEU-PROJETO.supabase.co, sem /rest/v1.");
}
if (rawAnonKey && !looksLikeSupabasePublicKey(supabaseAnonKey)) {
  console.warn("VITE_SUPABASE_ANON_KEY inválida. Use a anon public legacy ou publishable key, nunca service_role/secret.");
}

export const supabase: SupabaseClient | null = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-nex-app": "nex-gestao-juridica-v40-estabilizacao-enterprise",
        },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigurationError);
  return supabase;
}
