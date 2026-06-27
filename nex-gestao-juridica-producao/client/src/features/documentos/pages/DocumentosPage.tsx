import { useMemo, useRef, useState } from "react";
import { Camera, Download, Edit3, FileSignature, FileText, Search, Trash2, Upload } from "lucide-react";
import type { AutomationRun, FeaturePageProps, LegalDoc, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, todayIso, uid } from "@/utils/format";
import { downloadDataUrl, printDocumentPdf, processScannedImage, sha256File } from "@/utils/documentScanner";
import { uploadDocumentToStorage } from "@/services/normalizedRepository";

const statuses: LegalDoc["status"][] = ["Recebido", "Em análise", "Pendente correção", "Aprovado", "Protocolado", "Arquivado", "Assinatura"];
const origins: LegalDoc["origin"][] = ["Câmera", "Upload", "Editor", "Scanner do cliente"];
const types = ["RG", "CPF", "CNH", "Comprovante", "Procuração", "Contrato", "Petição", "Recurso", "Parecer", "Certidão", "Documento processual", "Outro"];

function blankDoc(client: string, processId: string): LegalDoc {
  return { id: uid("doc"), name: "", type: "Documento", client, processId, status: "Recebido", origin: "Upload", responsible: "e3", version: "v1", createdAt: todayIso() };
}

export function DocumentosPage({ state, commit, remove, notify }: FeaturePageProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"color" | "contrast" | "bw">("contrast");
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [processId, setProcessId] = useState(state.processes[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<LegalDoc | null>(null);
  const [editing, setEditing] = useState<LegalDoc | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.documents.filter((doc) => [doc.name, doc.type, doc.client, doc.status, doc.origin, doc.version, doc.fileName, doc.hash].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.documents]);

  const fields: FieldConfig<LegalDoc>[] = [
    { key: "name", label: "Nome do documento", required: true },
    { key: "type", label: "Tipo", kind: "select", options: types },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "origin", label: "Origem", kind: "select", options: origins },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "version", label: "Versão" },
    { key: "createdAt", label: "Data", kind: "date" },
    { key: "fileName", label: "Nome do arquivo" },
    { key: "hash", label: "Hash SHA-256", readOnly: true },
  ];

  async function handleFile(file?: File) {
    if (!file) return;
    const dataUrl = await processScannedImage(file, mode);
    const hash = await sha256File(file);
    const id = uid("doc");
    let storagePath: string | undefined;
    try { storagePath = await uploadDocumentToStorage(id, dataUrl) ?? undefined; } catch (e) { console.warn(e); }
    const doc: LegalDoc = { id, name: file.name.replace(/\.[^.]+$/, "") || "Documento digitalizado", type: "Documento", client, processId, status: "Em análise", origin: "Scanner do cliente", responsible: "e3", version: "v1", createdAt: todayIso(), fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl, storagePath, hash };
    const task: Task = { id: uid("task"), title: `Conferir documento enviado - ${doc.name}`, processId, client, responsible: "e3", sector: "Controladoria", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 0.5, spentHours: 0 };
    const run: AutomationRun = { id: uid("run"), ruleId: "documento-enviado", ruleName: "Documento enviado pelo cliente", result: `Tarefa de conferência criada para ${doc.name}`, date: todayIso(), status: "Sucesso" };
    await commit("documents", doc);
    await commit("tasks", task);
    await commit("automationRuns", run);
    setPreview(dataUrl);
    setLastDoc(doc);
    notify({ tone: "success", title: "Documento digitalizado", message: "Imagem processada, hash gerado, tarefa criada e upload tentado no Storage." });
  }

  async function saveDoc(doc: LegalDoc) {
    const isNew = !state.documents.some((item) => item.id === doc.id);
    await commit("documents", doc, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Documento criado" : "Documento atualizado", message: "Metadados salvos e disponíveis para o portal." });
  }

  async function deleteDoc(doc: LegalDoc) {
    if (!confirm(`Excluir documento ${doc.name}?`)) return;
    await remove("documents", doc.id);
    notify({ tone: "info", title: "Documento removido" });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title="Scanner e documentos editáveis" subtitle="Câmera/upload, tratamento, hash, PDF, Storage e edição de metadados." action={<ActionBar><Button variant="ghost" onClick={() => setEditing(blankDoc(client, processId))}><FileText size={16}/> Novo manual</Button><Button onClick={() => fileInput.current?.click()}><Upload size={16}/> Digitalizar</Button></ActionBar>} />
      <input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="quick-form"><Field label="Cliente"><select value={client} onChange={(e)=>setClient(e.target.value)}>{state.clients.map((c)=><option key={c.id}>{c.name}</option>)}</select></Field><Field label="Processo"><select value={processId} onChange={(e)=>setProcessId(e.target.value)}>{state.processes.map((p)=><option key={p.id} value={p.id}>{p.client} · {p.area}</option>)}</select></Field><Field label="Modo scanner"><select value={mode} onChange={(e)=>setMode(e.target.value as typeof mode)}><option value="color">Colorido</option><option value="contrast">Contraste automático</option><option value="bw">Preto e branco</option></select></Field></div>
      <div className="scanner-box floating-card" onClick={() => fileInput.current?.click()}>{preview ? <img src={preview} /> : <><Camera size={40}/><strong>Clique para abrir câmera ou enviar imagem</strong><span>O arquivo será processado no navegador e salvo no sistema.</span></>}</div>
      {lastDoc && <ActionBar><Button variant="ghost" onClick={() => { if (lastDoc.dataUrl) downloadDataUrl(lastDoc.dataUrl, `${lastDoc.name}.jpg`); }}><Download size={15}/> Baixar imagem</Button><Button variant="gold" onClick={() => { if (lastDoc.dataUrl) printDocumentPdf(lastDoc.name, lastDoc.dataUrl); }}><FileSignature size={15}/> Gerar PDF</Button><Button variant="ghost" onClick={() => setEditing(lastDoc)}><Edit3 size={15}/> Editar metadados</Button></ActionBar>}
    </Panel>
    <Panel><PanelTitle title="Gestão documental" subtitle="Todos os documentos podem ser editados, baixados, aprovados ou removidos." />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar documento, cliente, status, tipo ou hash" /></div>
      <div className="responsive-table"><table><thead><tr><th>Documento</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Origem</th><th>Hash</th><th>Ações</th></tr></thead><tbody>{filtered.map((doc)=><tr key={doc.id}><td>{doc.name}<small>{doc.fileName ?? ""}</small></td><td>{doc.client}</td><td>{doc.type}</td><td><StatusBadge tone={statusTone(doc.status)}>{doc.status}</StatusBadge></td><td>{doc.origin}</td><td className="hash-cell">{doc.hash ? `${doc.hash.slice(0, 10)}...` : "-"}</td><td><ActionBar>{doc.dataUrl && <Button variant="ghost" onClick={() => downloadDataUrl(doc.dataUrl!, `${doc.name}.jpg`)}>Baixar</Button>}<Button variant="ghost" onClick={() => setEditing(doc)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteDoc(doc)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    </Panel>
    {editing && <EntityFormModal<LegalDoc> open={!!editing} title={state.documents.some((item) => item.id === editing.id) ? "Editar documento" : "Novo documento"} subtitle="Atualize status, tipo, cliente, processo, responsável e versão." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveDoc} />}
  </div>;
}
