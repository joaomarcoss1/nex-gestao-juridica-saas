import { useRef, useState } from "react";
import { Camera, CheckCircle2, FileText, Home, Send } from "lucide-react";
import type { FeaturePageProps, LegalDoc, Message, Task } from "@/types/app";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { todayIso, uid } from "@/utils/format";
import { processScannedImage, sha256File } from "@/utils/documentScanner";
import { uploadDocumentToStorage } from "@/services/normalizedRepository";

export function PortalClientePage({ state, commit, notify }: FeaturePageProps) {
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processes = state.processes.filter((p) => p.client === client);
  const documents = state.documents.filter((d) => d.client === client);

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

  return <div className="portal-view page-grid">
    <Panel>
      <PanelTitle title="Portal do cliente" subtitle="Área externa simplificada para documentos, mensagens, cobranças e acompanhamento." />
      <Field label="Cliente de demonstração"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
    </Panel>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Meus processos" subtitle="Andamentos publicados pelo escritório." />{processes.map((process) => <div className="task-row compact" key={process.id}><Home size={18}/><div><strong>{process.area}</strong><small>{process.phase} · {process.court}</small></div><StatusBadge tone="blue">{process.status}</StatusBadge></div>)}</Panel>
      <Panel><PanelTitle title="Digitalizar documento" subtitle="O cliente captura pelo celular e envia direto ao escritório." action={<Button onClick={() => inputRef.current?.click()}><Camera size={16}/> Abrir câmera</Button>} /><input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => sendDocument(e.target.files?.[0])}/><div className="scanner-box small floating-card" onClick={() => inputRef.current?.click()}>{preview ? <img src={preview} /> : <><Camera size={38}/><strong>Enviar RG, comprovante, contrato ou procuração</strong></>}</div></Panel>
    </div>
    <Panel><PanelTitle title="Documentos enviados" subtitle="Acompanhamento de conferência pelo escritório." /> <div className="data-grid">{documents.map((doc) => <article className="data-card" key={doc.id}><FileText/><strong>{doc.name}</strong><small>{doc.type}</small><StatusBadge tone="green">{doc.status}</StatusBadge></article>)}</div></Panel>
    <Panel><PanelTitle title="Mensagem ao escritório" subtitle="Registra no histórico do cliente e cria trilha auditável." /> <div className="quick-form"><Field label="Mensagem"><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua dúvida ou solicitação" /></Field><Button onClick={sendMessage}><Send size={16}/> Enviar</Button></div><p className="legal-note"><CheckCircle2 size={14}/> Acesso do cliente deve ser isolado por RLS em produção.</p></Panel>
  </div>;
}
