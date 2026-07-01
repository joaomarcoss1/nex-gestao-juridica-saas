import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type NexDatabaseMode = "demo" | "production";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseUrl = rawUrl?.replace(/\/$/, "");
const supabaseAnonKey = rawAnonKey?.trim();

function isValidSupabaseUrl(value?: string) {
  return Boolean(value && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value));
}

export const databaseMode: NexDatabaseMode = isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey) ? "production" : "demo";

if (rawUrl && !isValidSupabaseUrl(supabaseUrl)) {
  console.warn("VITE_SUPABASE_URL inválida. Use o formato https://SEU-PROJETO.supabase.co, sem /rest/v1 e sem chaves secretas.");
}

export const supabase: SupabaseClient | null = databaseMode === "production"
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-nex-app": "nex-gestao-juridica-v3-producao-segura",
        },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY válidos.");
  return supabase;
}
