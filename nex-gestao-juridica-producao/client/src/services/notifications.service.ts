import { supabase } from "./supabase";
import { getCurrentOrganizationId, getCurrentProfileId } from "./authContext";

export type NexNotification = { id: string; title: string; body?: string; read?: boolean; created_at?: string };

export async function createNotification(title: string, body?: string, userId = getCurrentProfileId()) {
  if (!supabase) return;
  await supabase.from("notifications").insert({ organization_id: getCurrentOrganizationId(), user_id: userId, title, body, read: false });
}

export async function listNotifications() {
  if (!supabase) return [] as NexNotification[];
  const { data, error } = await supabase.from("notifications").select("*").eq("organization_id", getCurrentOrganizationId()).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data as NexNotification[];
}
