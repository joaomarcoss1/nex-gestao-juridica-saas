import type { AppState, AuthProfile, Client } from "@/types/app";
import { resolveClientId } from "@/services/normalizedRepository";

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
  const processes = state.processes.filter(byClient).map((process) => ({ ...process, internalStrategy: undefined, notes: process.clientVisibleSummary || process.notes }));
  const processIds = new Set(processes.map((process) => process.id));
  return {
    processes,
    documents: state.documents.filter((doc) => byClient(doc) || processIds.has(doc.processId)),
    messages: state.messages.filter((msg) => byClient(msg) || processIds.has(msg.processId)),
    finances: state.finances.filter(byClient),
    pricings: state.pricings.filter(byClient),
    deadlines: state.deadlines.filter((deadline) => byClient(deadline) || processIds.has(deadline.processId)),
    hearings: state.hearings.filter((hearing) => byClient(hearing) || processIds.has(hearing.processId)),
    consents: state.clientConsents.filter((consent) => consent.clientId === clientId),
  };
}
