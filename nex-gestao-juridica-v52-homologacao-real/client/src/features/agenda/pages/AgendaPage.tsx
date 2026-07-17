import { useMemo, useState } from "react";
import { Banknote, CalendarDays, Gavel, MapPin, Plus, UsersRound, WalletCards } from "lucide-react";
import type { FeaturePageProps, FinanceEntry, Hearing, ScheduledEvent } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";
import { deduplicateEvents, normalizedSourceType } from "@/lib/schedulingIntegrity";

function daysUntil(date: string) {
  if (!date) return 999;
  const now = new Date(`${todayIso()}T00:00:00`).getTime();
  const due = new Date(`${date.slice(0, 10)}T00:00:00`).getTime();
  return Math.ceil((due - now) / 86400000);
}
function addDays(days: number) { return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10); }
function blankMeeting(client = "", processId = "", responsible = ""): Hearing {
  return { id: uid("meeting"), processId, client, title: "Reunião de acompanhamento", hearingAt: `${addDays(1)}T09:00`, type: "Reunião com cliente", location: "Online ou escritório", link: "", responsible, checklist: ["Confirmar participantes", "Preparar pauta", "Registrar ata"], status: "Agendada", durationMinutes: 60, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Fortaleza" };
}
function blankPaymentSchedule(client = "Escritório"): FinanceEntry {
  return { id: uid("fin"), type: "Despesa", category: "Pagamento agendado", client, amount: 0, dueDate: addDays(5), status: "Pendente", method: "PIX", notes: "Pagamento agendado pela agenda financeira." };
}
function blankEvent(responsibleId = ""): ScheduledEvent {
  return { id: uid("event"), eventType: "manual", title: "Novo compromisso", responsibleId, startsAt: `${addDays(1)}T09:00`, endsAt: `${addDays(1)}T10:00`, status: "scheduled", location: "", notes: "", clientVisible: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Fortaleza", syncStatus: "local" };
}
function eventDate(event: ScheduledEvent) { return (event.startsAt || event.dueDate || event.createdAt || "").slice(0, 10); }
function eventTime(event: ScheduledEvent) { return event.startsAt?.slice(11, 16) || ""; }

export function AgendaPage({ state, commit, executeAtomic, notify }: FeaturePageProps) {
  const [tab, setTab] = useState<"agenda" | "reunioes" | "pagamentos">("agenda");
  const [editingMeeting, setEditingMeeting] = useState<Hearing | null>(null);
  const [editingPayment, setEditingPayment] = useState<FinanceEntry | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);

  const deadlines = state.deadlines.filter((item) => item.status !== "Concluído").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tasks = state.tasks.filter((item) => item.status !== "Concluída").sort((a, b) => a.due.localeCompare(b.due));
  const meetings = [...state.hearings].sort((a, b) => a.hearingAt.localeCompare(b.hearingAt));
  const paymentSchedules = state.finances.filter((item) => !item.archivedAt && ["Pendente", "Parcial", "Atrasado"].includes(item.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const unifiedEvents = useMemo(() => {
    const events = [...state.scheduledEvents.filter((item) => !item.archivedAt)];
    const sourceKeys = new Set(events.map((item) => `${normalizedSourceType(item.sourceType)}:${item.sourceId}`));
    const pushFallback = (event: ScheduledEvent) => { const key = `${normalizedSourceType(event.sourceType)}:${event.sourceId}`; if (!sourceKeys.has(key)) { sourceKeys.add(key); events.push(event); } };
    meetings.forEach((item) => pushFallback({ id: `hearing-${item.id}`, eventType: item.type?.toLowerCase().includes("audi") ? "hearing" : "meeting", sourceType: "meeting", sourceId: item.id, title: item.title, clientId: item.clientId, processId: item.processId, responsibleId: item.responsible, startsAt: item.hearingAt, location: item.location, meetingLink: item.link, status: item.status, notes: item.client, clientVisible: true }));
    deadlines.forEach((item) => pushFallback({ id: `deadline-${item.id}`, eventType: "deadline", sourceType: "deadline", sourceId: item.id, title: item.type, clientId: item.clientId, processId: item.processId, responsibleId: item.responsible, dueDate: item.dueDate, status: item.status, notes: item.client, clientVisible: true }));
    tasks.forEach((item) => pushFallback({ id: `task-${item.id}`, eventType: "task", sourceType: "task", sourceId: item.id, title: item.title, clientId: item.clientId, processId: item.processId, responsibleId: item.responsible, dueDate: item.due, status: item.status, notes: item.client, clientVisible: false }));
    paymentSchedules.forEach((item) => pushFallback({ id: `finance-${item.id}`, eventType: "payment", sourceType: "financial_entry", sourceId: item.id, title: item.category, clientId: item.clientId, processId: item.processId, financeId: item.id, dueDate: item.dueDate, amount: item.amount, status: item.status, notes: item.client, visibility: item.type === "Receita" && item.clientId ? "client" : "internal", clientVisible: item.type === "Receita" && Boolean(item.clientId) }));
    return deduplicateEvents(events).sort((a, b) => eventDate(a).localeCompare(eventDate(b)) || eventTime(a).localeCompare(eventTime(b)));
  }, [deadlines, meetings, paymentSchedules, state.scheduledEvents, tasks]);

  const weekly = unifiedEvents.filter((item) => daysUntil(eventDate(item)) >= 0 && daysUntil(eventDate(item)) <= 7).length;
  const teamMeetings = meetings.filter((item) => item.type?.toLowerCase().includes("equipe") || item.type?.toLowerCase().includes("intern"));
  const clientMeetings = meetings.filter((item) => item.type?.toLowerCase().includes("cliente") || item.client);
  const paymentsThisWeek = paymentSchedules.filter((item) => daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 7).reduce((sum, item) => sum + item.amount, 0);

  const meetingFields: FieldConfig<Hearing>[] = [
    { key: "title", label: "Título", required: true }, { key: "type", label: "Tipo", kind: "select", options: ["Reunião com cliente", "Reunião de equipe", "Audiência", "Perícia", "Alinhamento financeiro", "Retorno comercial"] },
    { key: "client", label: "Cliente", kind: "select", options: ["Equipe interna", ...state.clients.map((item) => item.name)] },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((item) => ({ value: item.id, label: `${item.client} · ${item.area}` }))] },
    { key: "hearingAt", label: "Data e horário", kind: "datetime-local", required: true }, { key: "durationMinutes", label: "Duração (minutos)", kind: "number", required: true }, { key: "timezone", label: "Fuso horário" }, { key: "recurrenceRule", label: "Recorrência (RRULE)" }, { key: "location", label: "Local" }, { key: "link", label: "Link da reunião" },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((item) => ({ value: item.id, label: item.name })) }, { key: "status", label: "Status", kind: "select", options: ["Agendada", "Realizada", "Cancelada"] },
  ];
  const paymentFields: FieldConfig<FinanceEntry>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["Despesa", "Receita"] }, { key: "category", label: "Categoria", kind: "select", options: ["Salário", "Benefício", "Imposto", "Fornecedor", "Sistema jurídico", "Diligência", "Custas", "Honorários", "Pagamento agendado"] },
    { key: "client", label: "Cliente/Centro", kind: "select", options: ["Escritório", "Folha de pagamento", ...state.clients.map((item) => item.name)] }, { key: "amount", label: "Valor", kind: "number", step: 0.01, required: true },
    { key: "dueDate", label: "Data de pagamento", kind: "date", required: true }, { key: "status", label: "Status", kind: "select", options: ["Pendente", "Pago", "Atrasado", "Cancelado", "Parcial"] },
    { key: "method", label: "Forma", kind: "select", options: ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência", "Recorrente"] }, { key: "notes", label: "Observações", kind: "textarea" },
  ];
  const eventFields: FieldConfig<ScheduledEvent>[] = [
    { key: "title", label: "Título", required: true }, { key: "eventType", label: "Tipo", kind: "select", options: ["manual", "meeting", "hearing"] },
    { key: "clientId", label: "Cliente", kind: "select", options: [{ value: "", label: "Sem cliente" }, ...state.clients.map((item) => ({ value: item.id, label: item.name }))] },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((item) => ({ value: item.id, label: `${item.client} · ${item.area}` }))] },
    { key: "responsibleId", label: "Responsável", kind: "select", options: state.employees.map((item) => ({ value: item.id, label: item.name })) },
    { key: "startsAt", label: "Início", kind: "datetime-local", required: true }, { key: "endsAt", label: "Fim", kind: "datetime-local" }, { key: "location", label: "Local" }, { key: "meetingLink", label: "Link" },
    { key: "status", label: "Status", kind: "select", options: ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"] }, { key: "timezone", label: "Fuso horário" }, { key: "recurrenceRule", label: "Recorrência (RRULE)" }, { key: "clientVisible", label: "Visível para o cliente", kind: "checkbox" }, { key: "notes", label: "Observações", kind: "textarea" },
  ];

  async function saveMeeting(meeting: Hearing) {
    const process = state.processes.find((item) => item.id === meeting.processId);
    const normalized = { ...meeting, client: meeting.client || process?.client || "Equipe interna", clientId: meeting.clientId || process?.clientId };
    await executeAtomic({ type: "saveMeeting", meeting: normalized, idempotencyKey: `meeting:${normalized.id}:${normalized.hearingAt}` });
    setEditingMeeting(null);
    notify({ tone: "success", title: "Agendamento sincronizado", message: "Reunião, evento e tarefa de preparação permanecerão vinculados." });
  }
  async function savePayment(payment: FinanceEntry) {
    const isNew = !state.finances.some((item) => item.id === payment.id);
    await commit("finances", { ...payment, sourceType: payment.sourceType || "manual", version: (payment.version ?? 0) + 1 }, isNew ? "create" : "update");
    setEditingPayment(null);
    notify({ tone: "success", title: "Lançamento agendado", message: "Somente cobranças do próprio cliente poderão ser exibidas no portal; despesas permanecem internas." });
  }
  async function saveEvent(event: ScheduledEvent) {
    const isNew = !state.scheduledEvents.some((item) => item.id === event.id); await commit("scheduledEvents", { ...event, sourceType: event.sourceType || "manual", sourceId: event.sourceId || event.id }, isNew ? "create" : "update");
    setEditingEvent(null); notify({ tone: "success", title: isNew ? "Compromisso criado" : "Compromisso atualizado", message: "Evento manual salvo na camada unificada da agenda." });
  }

  return <div className="page-grid agenda-page agenda-page-v50">
    <div className="kpi-row"><Kpi icon={CalendarDays} label="Itens da semana" value={weekly} note="agenda unificada" tone="blue"/><Kpi icon={UsersRound} label="Reuniões de equipe" value={teamMeetings.length} note="alinhamentos internos" tone="purple"/><Kpi icon={Gavel} label="Clientes e audiências" value={clientMeetings.length} note="compromissos externos" tone="gold"/><Kpi icon={Banknote} label="Pagamentos da semana" value={money(paymentsThisWeek)} note="previsão financeira" tone="green"/></div>
    <Panel><PanelTitle title="Agenda integrada" subtitle="Uma única linha do tempo para eventos manuais, reuniões, audiências, tarefas, prazos e pagamentos, com referência à origem." action={<ActionBar><Button variant="ghost" onClick={() => setEditingPayment(blankPaymentSchedule())}><WalletCards size={15}/> Pagamento</Button><Button variant="ghost" onClick={() => setEditingMeeting(blankMeeting(state.clients[0]?.name ?? "Equipe interna", state.processes[0]?.id ?? "", state.employees[0]?.id ?? ""))}><UsersRound size={15}/> Reunião</Button><Button onClick={() => setEditingEvent(blankEvent(state.employees[0]?.id ?? ""))}><Plus size={16}/> Compromisso</Button></ActionBar>}/><div className="module-tabs"><button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}>Lista operacional</button><button className={tab === "reunioes" ? "active" : ""} onClick={() => setTab("reunioes")}>Reuniões</button><button className={tab === "pagamentos" ? "active" : ""} onClick={() => setTab("pagamentos")}>Pagamentos</button></div></Panel>

    {tab === "agenda" && <Panel><PanelTitle title="Próximos compromissos" subtitle="No celular, a agenda usa uma lista cronológica legível em vez de comprimir uma grade desktop."/><div className="timeline-list agenda-unified-list">{unifiedEvents.slice(0, 40).map((event) => <article key={event.id} className="timeline-item"><span className="timeline-date">{eventDate(event)}{eventTime(event) ? <small>{eventTime(event)}</small> : null}</span><div><strong>{event.title}</strong><small>{event.notes || event.location || "Sem observações"} · {getEmployeeName(state, event.responsibleId ?? "")}</small><div className="card-tags"><StatusBadge tone="blue">{event.eventType}</StatusBadge>{event.sourceType && <StatusBadge tone="purple">origem: {event.sourceType}</StatusBadge>}{event.amount != null && <StatusBadge tone="green">{money(event.amount)}</StatusBadge>}</div></div><div className="agenda-item-action"><StatusBadge tone={statusTone(event.status)}>{event.status}</StatusBadge>{event.sourceType === "manual" && <Button variant="ghost" onClick={() => setEditingEvent(event)}>Editar</Button>}</div></article>)}</div></Panel>}

    {tab === "reunioes" && <Panel><PanelTitle title="Reuniões, audiências e atendimentos" subtitle="Ao salvar, o banco sincroniza a referência em scheduled_events por trigger idempotente."/><div className="stack-list">{meetings.map((meeting) => <div className="data-card agenda-meeting-card" key={meeting.id}><strong>{meeting.title}</strong><small>{new Date(meeting.hearingAt).toLocaleString("pt-BR")} · {meeting.client}</small><small><MapPin size={13}/> {meeting.location || meeting.link || "Local a confirmar"}</small><div className="card-tags"><StatusBadge tone={statusTone(meeting.status)}>{meeting.status}</StatusBadge><StatusBadge tone="purple">{meeting.type ?? "Compromisso"}</StatusBadge></div><Button variant="ghost" onClick={() => setEditingMeeting(meeting)}>Editar</Button></div>)}</div></Panel>}

    {tab === "pagamentos" && <Panel><PanelTitle title="Agenda de pagamentos" subtitle="Despesas, salários, custas e cobranças por vencimento."/><div className="stack-list agenda-payment-mobile">{paymentSchedules.map((entry) => <article className="data-card" key={`mobile-${entry.id}`}><strong>{entry.category}</strong><small>{entry.client} · {entry.dueDate}</small><div className="card-tags"><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge><StatusBadge tone={entry.type === "Receita" ? "green" : "red"}>{money(entry.amount)}</StatusBadge></div><Button variant="ghost" onClick={() => setEditingPayment(entry)}>Editar</Button></article>)}</div><div className="responsive-table agenda-payment-desktop"><table><thead><tr><th>Data</th><th>Categoria</th><th>Centro/Cliente</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{paymentSchedules.map((entry) => <tr key={entry.id}><td data-label="Data">{entry.dueDate}</td><td data-label="Categoria">{entry.category}</td><td data-label="Centro/Cliente">{entry.client}</td><td data-label="Valor">{money(entry.amount)}</td><td data-label="Status"><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></td><td data-label="Ações"><Button variant="ghost" onClick={() => setEditingPayment(entry)}>Editar</Button></td></tr>)}</tbody></table></div></Panel>}

    {editingMeeting && <EntityFormModal<Hearing> open title="Agendamento" subtitle="Reunião de equipe, atendimento, audiência ou compromisso jurídico." value={editingMeeting} fields={meetingFields} onClose={() => setEditingMeeting(null)} onSave={saveMeeting} saveLabel="Salvar agendamento"/>}
    {editingPayment && <EntityFormModal<FinanceEntry> open title="Agendamento financeiro" subtitle="Crie ou edite o lançamento e sua referência na agenda." value={editingPayment} fields={paymentFields} onClose={() => setEditingPayment(null)} onSave={savePayment} saveLabel="Salvar pagamento"/>}
    {editingEvent && <EntityFormModal<ScheduledEvent> open title="Compromisso manual" subtitle="Evento independente com cliente, processo, responsável e visibilidade controlada." value={editingEvent} fields={eventFields} onClose={() => setEditingEvent(null)} onSave={saveEvent} saveLabel="Salvar compromisso"/>}
  </div>;
}
