import type { SupabaseClient } from "@supabase/supabase-js";
import { hashText } from "./security";

export async function enforceRateLimit(admin: SupabaseClient, key: string, limit: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const hashedKey = hashText(`${key}:${bucket}`);
  const { data, error } = await admin.rpc("nex_consume_rate_limit", {
    p_key_hash: hashedKey,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    const missingFunction = String(error.message).toLowerCase().includes("does not exist");
    if (missingFunction) {
      throw Object.assign(new Error("Proteção contra tentativas excessivas indisponível. Aplique a migration v5.0."), { status: 503 });
    }
    throw error;
  }
  if (data === false) throw Object.assign(new Error("Muitas tentativas. Aguarde e tente novamente."), { status: 429 });
}
