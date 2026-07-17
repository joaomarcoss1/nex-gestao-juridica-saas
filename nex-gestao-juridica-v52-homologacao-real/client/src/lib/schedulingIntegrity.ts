import type { ScheduledEvent } from "@/types/app";

export function normalizedSourceType(value?: string): ScheduledEvent["sourceType"] {
  if (!value) return "manual";
  if (value === "finance" || value === "payment") return "financial_entry";
  const allowed = ["manual", "meeting", "hearing", "task", "deadline", "financial_entry", "process", "google_calendar"];
  return (allowed.includes(value) ? value : "manual") as ScheduledEvent["sourceType"];
}

export function eventIdentity(event: Pick<ScheduledEvent, "sourceType" | "sourceId" | "eventType" | "id">) {
  return `${normalizedSourceType(event.sourceType)}:${event.sourceId || event.id}:${event.eventType}`;
}

export function deduplicateEvents(events: ScheduledEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => { const key = eventIdentity(event); if (seen.has(key)) return false; seen.add(key); return true; });
}

export function intervalsOverlap(startA?: string, endA?: string, startB?: string, endB?: string) {
  if (!startA || !startB) return false;
  const a1 = new Date(startA).getTime(); const a2 = new Date(endA || startA).getTime();
  const b1 = new Date(startB).getTime(); const b2 = new Date(endB || startB).getTime();
  return a1 < b2 && b1 < a2;
}

export function findScheduleConflicts(candidate: ScheduledEvent, events: ScheduledEvent[]) {
  if (candidate.status === "cancelled") return [];
  return events.filter((event) => event.id !== candidate.id && event.status !== "cancelled" &&
    Boolean(candidate.responsibleId) && candidate.responsibleId === event.responsibleId &&
    intervalsOverlap(candidate.startsAt, candidate.endsAt, event.startsAt, event.endsAt));
}
