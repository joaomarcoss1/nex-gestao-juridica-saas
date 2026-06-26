import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type NexDatabaseMode = "demo" | "production";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const databaseMode: NexDatabaseMode = supabaseUrl && supabaseAnonKey ? "production" : "demo";

export const supabase: SupabaseClient | null = databaseMode === "production"
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-nex-app": "nex-gestao-juridica",
        },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar o modo produção.");
  }
  return supabase;
}
