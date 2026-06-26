import { useRef, useState } from "react";
import { Camera, Download, FileSignature, FileText, Upload } from "lucide-react";
import type { FeaturePageProps, LegalDoc, Task } from "@/types/app";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { statusTone, todayIso, uid } from "@/utils/format";
import { downloadDataUrl, printDocumentPdf, processScannedImage, sha256File } from "@/utils/documentScanner";
import { uploadDocumentToStorage } from "@/services/normalizedRepository";

export function DocumentosPage({ state, commit, notify }: FeaturePageProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"color" | "contrast" | "bw">("contrast");
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [processId, setProcessId] = useState(state.processes[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<LegalDoc | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    const dataUrl = await processScannedImage(file, mode);
    const hash = await sha256File(file);
    const id = uid("doc");
    let storagePath: string | undefined;
    try { storagePath = await uploadDocumentToStorage(id, dataUrl) ?? undefined; } catch (e) { console.warn(e); }
    const doc: LegalDoc = { id, name: file.name.replace(/\.[^.]+$/, "") || "Documento digitalizado", type: "Documento", client, processId, status: "Em análise", origin: "Scanner do cliente", responsible: "e3", version: "v1", createdAt: todayIso(), fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl, storagePath, hash };
    const task: Task = { id: uid("task"), title: `Conferir documento enviado - ${doc.name}`, processId, client, responsible: "e3", sector: "Controladoria", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 0.5, spentHours: 0 };
    await commit("documents", doc);
    await commit("tasks", task);
    setPreview(dataUrl);
    setLastDoc(doc);
    notify({ tone: "success", title: "Documento digitalizado", message: "Arquivo salvo, hash criado e tarefa de conferência aberta." });
  }

  async function approve(doc: LegalDoc) {
    await commit("documents", { ...doc, status: "Aprovado" }, "update");
    notify({ tone: "success", title: "Documento aprovado" });
  }

  return <div className="page-grid">
    <Panel>
      <PanelTitle title="Scanner e gestão documental" subtitle="Digitalização operacional com prévia, hash SHA-256, PDF, Storage e tarefa automática." action={<Button onClick={() => fileInput.current?.click()}><Camera size={16}/> Digitalizar</Button>} />
      <input ref={fileInput} hidden type="file" accept="image/*,.pdf" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="scanner-layout">
        <div className="scanner-box floating-card" onClick={() => fileInput.current?.click()}>
          {preview ? <img src={preview} alt="Prévia digitalizada" /> : <><Upload size={46}/><strong>Clique para capturar ou enviar documento</strong><p>Use a câmera do celular ou selecione uma imagem/PDF.</p></>}
        </div>
        <div className="scanner-controls">
          <Field label="Cliente"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Processo"><select value={processId} onChange={(e) => setProcessId(e.target.value)}>{state.processes.map((p) => <option key={p.id} value={p.id}>{p.client} · {p.area}</option>)}</select></Field>
          <Field label="Tratamento"><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="color">Colorido</option><option value="contrast">Contraste automático</option><option value="bw">Preto e branco</option></select></Field>
          <div className="toolbar">{lastDoc?.dataUrl && <><Button variant="ghost" onClick={() => downloadDataUrl(`${lastDoc.name}.jpg`, lastDoc.dataUrl!)}><Download size={15}/> Imagem</Button><Button variant="ghost" onClick={() => printDocumentPdf(lastDoc.name, lastDoc.dataUrl!)}><FileText size={15}/> PDF</Button></>}</div>
          {lastDoc && <p className="legal-note">Hash: {lastDoc.hash?.slice(0, 24)}... · {lastDoc.storagePath ? "Storage sincronizado" : "Salvo local/Supabase pendente"}</p>}
        </div>
      </div>
    </Panel>
    <Panel>
      <PanelTitle title="Documentos do escritório" subtitle="Controle por status, cliente, processo, origem e assinatura." />
      <div className="data-grid">
        {state.documents.map((doc) => <article className="data-card floating-card" key={doc.id}>
          <div className="card-top"><FileText size={20}/><StatusBadge tone={statusTone(doc.status)}>{doc.status}</StatusBadge></div>
          <strong>{doc.name}</strong><small>{doc.client} · {doc.type} · {doc.version}</small><p>Origem: {doc.origin}</p>{doc.hash && <small>Hash: {doc.hash.slice(0, 18)}...</small>}
          <div className="row-actions"><Button variant="ghost" onClick={() => approve(doc)}>Aprovar</Button><Button variant="ghost"><FileSignature size={15}/> Assinar</Button></div>
        </article>)}
      </div>
    </Panel>
  </div>;
}
