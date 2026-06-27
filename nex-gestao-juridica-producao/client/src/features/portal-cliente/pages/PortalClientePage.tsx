import { useRef, useState } from "react";
import { Camera, CheckCircle2, Edit3, FileText, Home, Send, Trash2 } from "lucide-react";
import type { FeaturePageProps, LegalDoc, Message, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { todayIso, uid } from "@/utils/format";
import { processScannedImage, sha256File } from "@/utils/documentScanner";
import { uploadDocumentToStorage } from "@/services/normalizedRepository";

export function PortalClientePage({ state, commit, remove, notify }: FeaturePageProps) {
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processes = state.processes.filter((p) => p.client === client);
  const documents = state.documents.filter((d) => d.client === client);
  const messages = state.messages.filter((m) => m.client === client);

  const messageFields: FieldConfig<Message>[] = [
    { key: "channel", label: "Canal", kind: "select", options: ["WhatsApp", "E-mail", "SMS", "Chat"] },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "subject", label: "Mensagem / assunto", kind: "textarea", required: true },
    { key: "status", label: "Status", kind: "select", options: ["Enviada", "Agendada", "Pendente"] },
    { key: "date", label: "Data", kind: "date" },
  ];

  async function sendDocument(file?: File) {
    if (!file) return;
    const dataUrl = await processScannedImage(file, "contrast");
    const hash = await sha256File(file);
    const id = uid("doc");
    let storagePath: string | undefined;
    try { storagePath = await uploadDocumentToStorage(id, dataUrl) ?? undefined; } catch (e) { console.warn(e); }
    const processId = processes[0]?.id ?? "";
    const doc: LegalDoc = { id, name: file.name.replace(/\.[^.]+$/, "") || "Documento do cliente", type: "Documento do cliente", client, processId, status: "Recebido", origin: "Scanner do cliente", responsible: "e3", version: "v1", createdAt: todayIso(), fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl, hash, storagePath };
    const task: Task = { id: uid("task"), title: `Portal: conferir documento de ${client}`, processId, client, responsible: "e3", sector: "Controladoria", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 0.5, spentHours: 0 };
    await commit("documents", doc);
    await commit("tasks", task);
    await commit("automationRuns", { id: uid("run"), ruleId: "portal-documento", ruleName: "Documento enviado pelo portal", result: `${client} enviou ${doc.name} e gerou tarefa de conferência`, date: todayIso(), status: "Sucesso" });
    setPreview(dataUrl);
    notify({ tone: "success", title: "Documento enviado", message: "O escritório recebeu uma tarefa automática de conferência." });
  }

  async function sendMessage() {
    if (!message.trim()) return;
    const msg: Message = { id: uid("msg"), channel: "Chat", client, processId: processes[0]?.id ?? "", subject: message, status: "Pendente", date: todayIso() };
    await commit("messages", msg);
    setMessage("");
    notify({ tone: "success", title: "Mensagem enviada" });
  }

  async function saveMessage(msg: Message) {
    await commit("messages", msg, state.messages.some((item) => item.id === msg.id) ? "update" : "create");
    setEditingMessage(null);
    notify({ tone: "success", title: "Mensagem atualizada" });
  }

  async function deleteMessage(msg: Message) {
    if (!confirm("Excluir esta mensagem?")) return;
    await remove("messages", msg.id);
    notify({ tone: "info", title: "Mensagem removida" });
  }

  return <div className="portal-view page-grid">
    <Panel><PanelTitle title="Portal do cliente" subtitle="Área externa simplificada para documentos, mensagens, cobranças e acompanhamento." /><Field label="Cliente de demonstração"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field></Panel>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Meus processos" subtitle="Andamentos publicados pelo escritório." />{processes.map((process) => <div className="task-row compact" key={process.id}><Home size={18}/><div><strong>{process.area}</strong><small>{process.phase} · {process.court}</small></div><StatusBadge tone="blue">{process.status}</StatusBadge></div>)}</Panel>
      <Panel><PanelTitle title="Digitalizar documento" subtitle="O cliente captura pelo celular e envia direto ao escritório." action={<Button onClick={() => inputRef.current?.click()}><Camera size={16}/> Abrir câmera</Button>} /><input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => sendDocument(e.target.files?.[0])}/><div className="scanner-box small floating-card" onClick={() => inputRef.current?.click()}>{preview ? <img src={preview} /> : <><Camera size={38}/><strong>Enviar RG, comprovante, contrato ou procuração</strong></>}</div></Panel>
    </div>
    <Panel><PanelTitle title="Documentos enviados" subtitle="Acompanhamento de conferência pelo escritório." /> <div className="data-grid">{documents.map((doc) => <article className="data-card" key={doc.id}><FileText/><strong>{doc.name}</strong><small>{doc.type}</small><StatusBadge tone="green">{doc.status}</StatusBadge></article>)}</div></Panel>
    <Panel><PanelTitle title="Mensagens do cliente" subtitle="Histórico editável para simular o portal antes do login real." action={<Button variant="ghost" onClick={() => setEditingMessage({ id: uid("msg"), channel: "Chat", client, processId: processes[0]?.id ?? "", subject: "", status: "Pendente", date: todayIso() })}>Nova mensagem</Button>} /> <div className="quick-form"><Field label="Mensagem"><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua dúvida ou solicitação" /></Field><Button onClick={sendMessage}><Send size={16}/> Enviar</Button></div>{messages.map((msg) => <div className="task-row compact" key={msg.id}><Send size={18}/><div><strong>{msg.subject}</strong><small>{msg.channel} · {msg.date}</small></div><StatusBadge tone="gold">{msg.status}</StatusBadge><ActionBar><Button variant="ghost" onClick={() => setEditingMessage(msg)}><Edit3 size={14}/> Editar</Button><Button variant="danger" onClick={() => deleteMessage(msg)}><Trash2 size={14}/></Button></ActionBar></div>)}<p className="legal-note"><CheckCircle2 size={14}/> Acesso do cliente deve ser isolado por RLS em produção.</p></Panel>
    {editingMessage && <EntityFormModal<Message> open={!!editingMessage} title="Editar mensagem" subtitle="Atualize canal, texto, status e processo vinculado." value={editingMessage} fields={messageFields} onClose={() => setEditingMessage(null)} onSave={saveMessage} />}
  </div>;
}
