import type { AppState, AuthProfile, Client, LegalDoc, Message, PricingProposal } from "@/types/app";
import { supabase } from "@/services/supabase";
import { emptyState, hydrateRelations, resolveClientId } from "@/services/normalizedRepository";

const PORTAL_STORAGE_KEY = "nex_public_portal_payload_v41";

export type PublicPortalPayload = {
  organizationId: string;
  client: Client;
  processes?: AppState["processes"];
  documents?: AppState["documents"];
  messages?: AppState["messages"];
  finances?: AppState["finances"];
  pricings?: AppState["pricings"];
  deadlines?: AppState["deadlines"];
  hearings?: AppState["hearings"];
};

export function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function saveStoredPortalPayload(payload: PublicPortalPayload) {
  sessionStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(payload));
}

export function loadStoredPortalPayload(): PublicPortalPayload | null {
  try {
    const raw = sessionStorage.getItem(PORTAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) as PublicPortalPayload : null;
  } catch {
    return null;
  }
}

export function clearStoredPortalPayload() {
  sessionStorage.removeItem(PORTAL_STORAGE_KEY);
}

export function upsertIntoStoredPortalPayload<K extends keyof PublicPortalPayload>(key: K, item: any) {
  const payload = loadStoredPortalPayload();
  if (!payload) return;
  const current = Array.isArray(payload[key]) ? payload[key] as any[] : [];
  const next = current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? item : entry) : [item, ...current];
  saveStoredPortalPayload({ ...payload, [key]: next });
}

export function loadPublicPortalState(): AppState {
  const payload = loadStoredPortalPayload();
  const state = emptyState();
  if (!payload?.client?.id) return state;
  return hydrateRelations({
    ...state,
    organizations: payload.organizationId ? [{ id: payload.organizationId, registrationCode: "PORTAL", name: "Portal do Cliente", tradeName: "Portal do Cliente", document: "", plan: "Enterprise", status: "Ativa", accessBlocked: false }] : [],
    clients: [payload.client],
    processes: payload.processes ?? [],
    documents: payload.documents ?? [],
    messages: payload.messages ?? [],
    finances: payload.finances ?? [],
    pricings: payload.pricings ?? [],
    deadlines: payload.deadlines ?? [],
    hearings: payload.hearings ?? [],
  });
}

export async function portalPersistMessage(message: Message) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("portal_send_message", {
    p_client_id: message.clientId,
    p_process_id: message.processId || null,
    p_body: message.body ?? message.subject,
    p_priority: message.priority ?? "Média",
  });
  if (error) throw error;
  const persisted = (data as Message | null) ?? message;
  upsertIntoStoredPortalPayload("messages", persisted);
  return persisted;
}

export async function portalPersistDocument(document: LegalDoc) {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("portal_upload_document", {
    p_client_id: document.clientId,
    p_process_id: document.processId || null,
    p_name: document.name,
    p_type: document.type,
    p_file_name: document.fileName ?? null,
    p_mime_type: document.mimeType ?? null,
    p_file_size_bytes: document.sizeBytes ?? null,
    p_hash: document.hash ?? null,
    p_storage_path: document.storagePath ?? null,
  });
  if (error) throw error;
  const persisted = (data as LegalDoc | null) ?? document;
  upsertIntoStoredPortalPayload("documents", persisted);
  return persisted;
}

export async function portalPersistProposalStatus(proposal: PricingProposal, status: "Aceita" | "Recusada") {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("client_portal_update_pricing_status", {
    p_client_id: proposal.clientId,
    p_client_name: proposal.client,
    p_proposal_id: proposal.id,
    p_status: status,
  });
  if (error) throw error;
  const persisted = { ...proposal, status };
  upsertIntoStoredPortalPayload("pricings", persisted);
  return data;
}

export function resolvePortalClient(state: AppState, profile: AuthProfile | null): Client | undefined {
  if (profile?.role === "cliente") {
    if (profile.clientId) return state.clients.find((client) => client.id === profile.clientId);
    return state.clients.find((client) => client.email?.toLowerCase() === profile.email?.toLowerCase());
  }
  return state.clients[0];
}

export function isPortalLocked(profile: AuthProfile | null) {
  return profile?.role === "cliente";
}

export function portalDataForClient(state: AppState, client: Client | undefined) {
  const clientId = client?.id;
  const clientName = client?.name ?? "";
  const byClient = (item: { client?: string; clientId?: string }) => (item.clientId ?? resolveClientId(state, item.client)) === clientId || item.client === clientName;
  const processes = state.processes.filter(byClient).map((process) => ({ ...process, internalStrategy: undefined, notes: process.clientVisibleSummary || process.phase || process.status }));
  const processIds = new Set(processes.map((process) => process.id));
  return {
    processes,
    documents: state.documents.filter((doc) => (doc.clientVisible !== false) && (byClient(doc) || processIds.has(doc.processId))),
    messages: state.messages.filter((msg) => byClient(msg) || processIds.has(msg.processId)),
    finances: state.finances.filter(byClient),
    pricings: state.pricings.filter(byClient),
    deadlines: state.deadlines.filter((deadline) => byClient(deadline) || processIds.has(deadline.processId)),
    hearings: state.hearings.filter((hearing) => byClient(hearing) || processIds.has(hearing.processId)),
    consents: state.clientConsents.filter((consent) => consent.clientId === clientId),
  };
}
