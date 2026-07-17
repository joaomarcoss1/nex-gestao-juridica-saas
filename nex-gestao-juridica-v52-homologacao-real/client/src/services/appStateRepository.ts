import { supabase } from "./supabase";

const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const STATE_ID = "00000000-0000-0000-0000-0000000000aa";

export async function loadProductionState<T>(): Promise<T | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_state_snapshots")
    .select("state")
    .eq("id", STATE_ID)
    .maybeSingle();
  if (error) throw error;
  return (data?.state as T | undefined) ?? null;
}

export async function saveProductionState<T>(state: T): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("app_state_snapshots")
    .upsert({
      id: STATE_ID,
      company_id: DEMO_COMPANY_ID,
      state,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
