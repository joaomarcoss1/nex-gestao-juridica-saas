import { useMemo, useState } from "react";
import { MessageSquareText, Send, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { FeaturePageProps, Message } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { can } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";

type Thread = {
  key: string;
  processId: string;
  clientId?: string;
  client: string;
  responsibleId?: string;
  messages: Message[];
};

function buildThreads(messages: Message[]): Thread[] {
  const map = new Map<string, Thread>();
  for (const message of messages.filter((item) => item.channel === "Chat")) {
    const key = `${message.clientId ?? message.client}-${message.processId}`;
    const existing = map.get(key);
    if (existing) existing.messages.push(message);
    else map.set(key, { key, processId: message.processId, clientId: message.clientId, client: message.client, responsibleId: message.responsibleId, messages: [message] });
  }
  return Array.from(map.values()).map((thread: Thread) => ({ ...thread, messages: thread.messages.sort((a: Message, b: Message) => a.date.localeCompare(b.date)) }));
}

export function ChatJuridicoPage({ state, commit, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const [draft, setDraft] = useState("");
  const [newThreadProcessId, setNewThreadProcessId] = useState(state.processes[0]?.id ?? "");
  const [internalSubject, setInternalSubject] = useState("Alinhamento interno do caso");
  const [priority, setPriority] = useState<Message["priority"]>("Alta");
  const threads = useMemo(() => buildThreads(state.messages), [state.messages]);
  const [selectedKey, setSelectedKey] = useState(threads[0]?.key ?? "");
  const selected = threads.find((thread) => thread.key === selectedKey) ?? threads[0];
  const pending = state.messages.filter((message) => message.channel === "Chat" && ["Pendente", "Em análise"].includes(message.status)).length;
  const answered = state.messages.filter((message) => message.channel === "Chat" && message.status === "Respondida").length;
  const canReply = can(profile, "chat.reply");

  async function openInternalThread() {
    if (!draft.trim() || !profile) return;
    const process = state.processes.find((item) => item.id === newThreadProcessId);
    if (!process) return;
    const msg: Message = {
      id: uid("msg"),
      channel: "Chat",
      threadType: "interno",
      client: process.client,
      clientId: process.clientId,
      processId: process.id,
      subject: internalSubject,
      body: draft.trim(),
      status: "Em análise",
      date: todayIso(),
      senderId: profile.id,
      senderName: profile.name,
      senderRole: profile.role,
      responsibleId: process.responsible,
      direction: "interno",
      priority,
      resolved: false,
    };
    await commit("messages", msg);
    setDraft("");
    notify({ tone: "success", title: "Chat interno aberto", message: "A conversa ficou vinculada ao processo, sem aparecer para o cliente." });
  }

  async function markResolved(message: Message) {
    await commit("messages", { ...message, status: "Respondida", resolved: true, answeredAt: todayIso() }, "update");
    notify({ tone: "success", title: "Mensagem resolvida", message: "A pendência foi baixada no histórico do chat." });
  }

  async function sendReply() {
    if (!selected || !draft.trim() || !profile) return;
    const process = state.processes.find((item) => item.id === selected.processId);
    const responsibleId = selected.responsibleId ?? process?.responsible ?? process?.responsibleId ?? profile.id;
    const reply: Message = {
      id: uid("msg"),
      channel: "Chat",
      client: selected.client,
      clientId: selected.clientId,
      processId: selected.processId,
      subject: draft.trim().slice(0, 80),
      body: draft.trim(),
      status: "Respondida",
      date: todayIso(),
      senderId: profile.id,
      senderName: profile.name,
      senderRole: profile.role,
      responsibleId,
      direction: "escritorio_para_cliente",
      answeredAt: todayIso(),
      threadType: "cliente",
      priority: selected.messages[0]?.priority ?? "Alta",
      resolved: true,
    };
    await commit("messages", reply);
    for (const message of selected.messages.filter((item) => ["Pendente", "Em análise"].includes(item.status))) {
      await commit("messages", { ...message, status: "Respondida", answeredAt: todayIso(), resolved: true }, "update");
    }
    setDraft("");
    notify({ tone: "success", title: "Resposta enviada", message: "O cliente verá a mensagem no portal do cliente." });
  }

  return <div className="page-grid chat-page">
    <div className="kpi-row">
      <Kpi icon={MessageSquareText} label="Conversas" value={threads.length} note="threads por cliente/processo" tone="blue" />
      <Kpi icon={Send} label="Pendentes" value={pending} note="exigem resposta" tone="gold" />
      <Kpi icon={UserRoundCheck} label="Respondidas" value={answered} note="mensagens tratadas" tone="green" />
      <Kpi icon={ShieldCheck} label="Visibilidade" value="Restrita" note="admin ou advogado responsável" tone="purple" />
    </div>
    <Panel>
      <PanelTitle title="Chat interno da equipe" subtitle="Comunicação interna vinculada a processo, cliente, tarefa, documento ou departamento. Não aparece no portal do cliente." />
      <div className="quick-form"><Field label="Processo"><select value={newThreadProcessId} onChange={(event) => setNewThreadProcessId(event.target.value)}>{state.processes.map((process) => <option key={process.id} value={process.id}>{process.client} · {process.area} · {process.cnj || process.class}</option>)}</select></Field><Field label="Assunto"><input value={internalSubject} onChange={(event) => setInternalSubject(event.target.value)} /></Field><Field label="Prioridade"><select value={priority} onChange={(event) => setPriority(event.target.value as Message["priority"])}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select></Field><Button onClick={openInternalThread}><MessageSquareText size={16}/> Abrir conversa interna</Button></div>
    </Panel>
    <Panel>
      <PanelTitle title="Chat jurídico com o cliente" subtitle="Canal interno auditável. Clientes só veem seus próprios processos; advogados veem apenas conversas sob sua responsabilidade." />
      {threads.length === 0 && <div className="empty-state"><MessageSquareText size={34}/><strong>Nenhuma conversa aberta</strong><p>Quando o cliente mandar mensagem pelo portal, a thread aparecerá aqui.</p></div>}
      {threads.length > 0 && <div className="chat-layout">
        <aside className="thread-list">
          {threads.map((thread) => {
            const process = state.processes.find((item) => item.id === thread.processId);
            const last = thread.messages[thread.messages.length - 1];
            return <button key={thread.key} className={selected?.key === thread.key ? "selected" : ""} onClick={() => setSelectedKey(thread.key)}>
              <strong>{thread.client}</strong>
              <span>{process?.area ?? "Processo"} · {getEmployeeName(state, thread.responsibleId ?? process?.responsible)} · {last?.threadType === "interno" ? "interno" : "cliente"}</span>
              <small>{last?.body || last?.subject}</small>
            </button>;
          })}
        </aside>
        <section className="chat-window">
          {selected && <>
            <div className="chat-window-head">
              <div><strong>{selected.client}</strong><span>Processo: {state.processes.find((item) => item.id === selected.processId)?.cnj || "sem CNJ"}</span></div>
              <StatusBadge tone="purple">Advogado: {getEmployeeName(state, selected.responsibleId ?? state.processes.find((item) => item.id === selected.processId)?.responsible)}</StatusBadge>
            </div>
            <div className="message-stream">
              {selected.messages.map((message) => {
                const fromOffice = message.direction === "escritorio_para_cliente" || message.senderRole !== "cliente";
                return <article className={`message-bubble ${fromOffice ? "office" : "client"}`} key={message.id}>
                  <strong>{message.senderName || (fromOffice ? "Escritório" : message.client)}</strong>
                  <p>{message.body || message.subject}</p>
                  <span>{message.date} · {message.status} · {message.priority ?? "Média"}</span>
                  {!message.resolved && canReply && <ActionBar><Button variant="ghost" onClick={() => markResolved(message)}>Marcar resolvida</Button></ActionBar>}
                </article>;
              })}
            </div>
            <div className="chat-reply-box">
              <Field label="Responder ao cliente"><textarea disabled={!canReply} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={canReply ? "Digite a orientação ou solicitação para o cliente..." : "Seu perfil não pode responder conversas."} /></Field>
              <Button disabled={!canReply || !draft.trim()} onClick={sendReply}><Send size={16}/> Enviar resposta</Button>
            </div>
          </>}
        </section>
      </div>}
    </Panel>
  </div>;
}
