import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Download, Edit3, Eye, FileSignature, FileText, Search, Trash2, Upload, XCircle } from "lucide-react";
import type { AutomationRun, DocumentFolder, DocumentTemplate, FeaturePageProps, LegalDoc, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, todayIso, uid } from "@/utils/format";
import { downloadDataUrl, printDocumentPdf, processScannedImage } from "@/utils/documentScanner";
import { uploadPrivateDocument } from "@/services/storage.service";
import { DocumentViewer } from "@/features/documentos/components/DocumentViewer";

const statuses: LegalDoc["status"][] = ["Recebido", "Em análise", "Pendente correção", "Aprovado", "Protocolado", "Arquivado", "Assinatura", "Recusado"];
const origins: LegalDoc["origin"][] = ["Câmera", "Upload", "Editor", "Scanner do cliente"];
const types = ["RG", "CPF", "CNH", "Comprovante", "Procuração", "Contrato de honorários", "Petição", "Recurso", "Parecer", "Certidão", "Matrícula", "Escritura", "Laudo", "Guia", "Recibo", "Documento processual", "Outro"];

function blankDoc(client: string, processId: string): LegalDoc {
  return { id: uid("doc"), name: "", type: "Documento", client, processId, status: "Recebido", origin: "Upload", responsible: "e3", version: "v1", createdAt: todayIso(), clientVisible: false, validationStatus: "Pendente", accessLevel: "Interno", tags: [] };
}

export function DocumentosPage({ state, commit, remove, notify }: FeaturePageProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"color" | "contrast" | "bw">("contrast");
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [processId, setProcessId] = useState(state.processes[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<LegalDoc | null>(null);
  const [editing, setEditing] = useState<LegalDoc | null>(null);
  const [viewing, setViewing] = useState<LegalDoc | null>(null);
  const [query, setQuery] = useState("");
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.documents.filter((doc) => [doc.name, doc.type, doc.client, doc.status, doc.origin, doc.version, doc.fileName, doc.hash, doc.accessLevel, doc.tags?.join(" ")].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.documents]);

  const fields: FieldConfig<LegalDoc>[] = [
    { key: "name", label: "Nome do documento", required: true },
    { key: "type", label: "Tipo", kind: "select", options: types },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "folderId", label: "Pasta", kind: "select", options: [{ value: "", label: "Sem pasta" }, ...state.documentFolders.map((folder) => ({ value: folder.id, label: folder.name }))] },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "origin", label: "Origem", kind: "select", options: origins },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "version", label: "Versão" },
    { key: "accessLevel", label: "Nível de acesso", kind: "select", options: ["Interno", "Cliente", "Financeiro", "Restrito"] },
    { key: "validationStatus", label: "Validação", kind: "select", options: ["Pendente", "Validado", "Recusado"] },
    { key: "createdAt", label: "Data", kind: "date" },
    { key: "fileName", label: "Nome do arquivo" },
    { key: "hash", label: "Hash SHA-256", readOnly: true },
  ];


  const folderFields: FieldConfig<DocumentFolder>[] = [
    { key: "name", label: "Nome da pasta", required: true },
    { key: "clientId", label: "Cliente", kind: "select", options: [{ value: "", label: "Geral" }, ...state.clients.map((client) => ({ value: client.id, label: client.name }))] },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((process) => ({ value: process.id, label: `${process.client} · ${process.area}` }))] },
    { key: "parentId", label: "Pasta superior", kind: "select", options: [{ value: "", label: "Raiz" }, ...state.documentFolders.map((folder) => ({ value: folder.id, label: folder.name }))] },
    { key: "accessLevel", label: "Nível de acesso", kind: "select", options: ["Interno", "Cliente", "Restrito"] },
  ];
  const templateFields: FieldConfig<DocumentTemplate>[] = [
    { key: "moduleArea", label: "Área jurídica" },
    { key: "name", label: "Nome do modelo", required: true },
    { key: "type", label: "Tipo", kind: "select", options: types },
    { key: "body", label: "Conteúdo base", kind: "textarea" },
  ];

  async function handleFile(file?: File) {
    if (!file) return;
    const dataUrl = await processScannedImage(file, mode);
    const id = uid("doc");
    let storagePath: string | undefined;
    let hash = "";
    try { const uploaded = await uploadPrivateDocument(file, id); storagePath = uploaded.path; hash = uploaded.hash; } catch (e) { console.warn(e); }
    const doc: LegalDoc = { id, name: file.name.replace(/\.[^.]+$/, "") || "Documento digitalizado", type: "Documento", client, processId, status: "Em análise", origin: "Scanner do cliente", responsible: "e3", version: "v1", createdAt: todayIso(), fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl, storagePath, hash, folderId: state.documentFolders.find((folder) => folder.processId === processId)?.id, clientVisible: false, validationStatus: "Pendente", accessLevel: "Interno", tags: [] };
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
    if (!isNew) await commit("documentVersions", { id: uid("version"), documentId: doc.id, version: doc.version, storagePath: doc.storagePath, hash: doc.hash, changedBy: doc.responsible, changeNote: "Metadados atualizados", createdAt: todayIso() });
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Documento criado" : "Documento atualizado", message: "Metadados salvos e disponíveis para o portal." });
  }


  async function approveDoc(doc: LegalDoc) {
    await commit("documents", { ...doc, status: "Aprovado", validationStatus: "Validado", approvedAt: new Date().toISOString(), clientVisible: doc.accessLevel === "Cliente" || doc.clientVisible, releasedAt: doc.accessLevel === "Cliente" || doc.clientVisible ? new Date().toISOString() : doc.releasedAt }, "update");
    notify({ tone: "success", title: "Documento aprovado", message: "A aprovação foi registrada na auditoria." });
  }

  async function rejectDoc(doc: LegalDoc) {
    const reason = prompt("Informe o motivo da recusa/correção:") ?? "Correção solicitada";
    await commit("documents", { ...doc, status: "Recusado", rejectionComment: reason }, "update");
    notify({ tone: "info", title: "Documento recusado", message: reason });
  }

  async function deleteDoc(doc: LegalDoc) {
    if (!confirm(`Excluir documento ${doc.name}?`)) return;
    await remove("documents", doc.id);
    notify({ tone: "info", title: "Documento removido" });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title="Scanner e documentos editáveis" subtitle="Câmera/upload, tratamento, hash, PDF, Storage e edição de metadados." action={<ActionBar><Button variant="ghost" onClick={() => setEditingFolder({ id: uid("folder"), name: "Nova pasta", accessLevel: "Interno", clientId: state.clients.find((item) => item.name === client)?.id, processId })}>Pasta</Button><Button variant="ghost" onClick={() => setEditingTemplate({ id: uid("template"), moduleArea: "Geral", name: "Novo modelo", type: "Documento", body: "", clientVisibleDefault: false })}>Modelo</Button><Button variant="ghost" onClick={() => setEditing(blankDoc(client, processId))}><FileText size={16}/> Novo manual</Button><Button onClick={() => fileInput.current?.click()}><Upload size={16}/> Digitalizar</Button></ActionBar>} />
      <input ref={fileInput} hidden type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="quick-form"><Field label="Cliente"><select value={client} onChange={(e)=>setClient(e.target.value)}>{state.clients.map((c)=><option key={c.id}>{c.name}</option>)}</select></Field><Field label="Processo"><select value={processId} onChange={(e)=>setProcessId(e.target.value)}>{state.processes.map((p)=><option key={p.id} value={p.id}>{p.client} · {p.area}</option>)}</select></Field><Field label="Modo scanner"><select value={mode} onChange={(e)=>setMode(e.target.value as typeof mode)}><option value="color">Colorido</option><option value="contrast">Contraste automático</option><option value="bw">Preto e branco</option></select></Field></div>
      <div className="scanner-box floating-card" onClick={() => fileInput.current?.click()}>{preview ? <img src={preview} /> : <><Camera size={40}/><strong>Clique para abrir câmera ou enviar imagem</strong><span>O arquivo será processado no navegador e salvo no sistema.</span></>}</div>
      {lastDoc && <ActionBar><Button variant="ghost" onClick={() => { if (lastDoc.dataUrl) downloadDataUrl(lastDoc.dataUrl, `${lastDoc.name}.jpg`); }}><Download size={15}/> Baixar imagem</Button><Button variant="gold" onClick={() => { if (lastDoc.dataUrl) printDocumentPdf(lastDoc.name, lastDoc.dataUrl); }}><FileSignature size={15}/> Gerar PDF</Button><Button variant="ghost" onClick={() => setEditing(lastDoc)}><Edit3 size={15}/> Editar metadados</Button></ActionBar>}
    </Panel>
    <Panel><PanelTitle title="Pastas, modelos e versionamento" subtitle="Organização por cliente, processo, tipo documental, controle de acesso e modelos por área, sem IA." />
      <div className="data-grid">
        {state.documentFolders.map((folder) => <article className="data-card floating-card" key={folder.id}><FileText/><strong>{folder.name}</strong><small>{folder.accessLevel} · {state.clients.find((client) => client.id === folder.clientId)?.name ?? "Geral"}</small><Button variant="ghost" onClick={() => setEditingFolder(folder)}>Editar pasta</Button></article>)}
        {state.documentTemplates.map((template) => <article className="data-card floating-card" key={template.id}><FileSignature/><strong>{template.name}</strong><small>{template.moduleArea} · {template.type}</small><Button variant="ghost" onClick={() => setEditingTemplate(template)}>Editar modelo</Button></article>)}
      </div>
    </Panel>
    <Panel><PanelTitle title="Gestão documental" subtitle="Todos os documentos podem ser editados, baixados, aprovados ou removidos." />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar documento, cliente, status, tipo ou hash" /></div>
      <div className="responsive-table"><table><thead><tr><th>Documento</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Origem</th><th>Acesso</th><th>Hash</th><th>Ações</th></tr></thead><tbody>{filtered.map((doc)=><tr key={doc.id}><td>{doc.name}<small>{doc.fileName ?? ""}</small></td><td>{doc.client}</td><td>{doc.type}</td><td><StatusBadge tone={statusTone(doc.status)}>{doc.status}</StatusBadge></td><td>{doc.origin}</td><td><StatusBadge tone={doc.clientVisible ? "green" : "purple"}>{doc.accessLevel ?? "Interno"}</StatusBadge></td><td className="hash-cell">{doc.hash ? `${doc.hash.slice(0, 10)}...` : "-"}</td><td><ActionBar><Button variant="ghost" onClick={() => setViewing(doc)}><Eye size={15}/> Ver</Button>{doc.dataUrl && <Button variant="ghost" onClick={() => downloadDataUrl(doc.dataUrl!, `${doc.name}.jpg`)}>Baixar</Button>}<Button variant="ghost" onClick={() => approveDoc(doc)}><CheckCircle2 size={15}/> Aprovar</Button><Button variant="ghost" onClick={() => rejectDoc(doc)}><XCircle size={15}/> Recusar</Button><Button variant="ghost" onClick={() => setEditing(doc)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteDoc(doc)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    </Panel>
    {viewing && <DocumentViewer document={viewing} />}
    {editing && <EntityFormModal<LegalDoc> open={!!editing} title={state.documents.some((item) => item.id === editing.id) ? "Editar documento" : "Novo documento"} subtitle="Atualize status, tipo, pasta, cliente, processo, responsável, acesso e versão." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveDoc} />}
    {editingFolder && <EntityFormModal<DocumentFolder> open={!!editingFolder} title="Pasta documental" value={editingFolder} fields={folderFields} onClose={() => setEditingFolder(null)} onSave={async (folder) => { const exists = state.documentFolders.some((item) => item.id === folder.id); await commit("documentFolders", folder, exists ? "update" : "create"); setEditingFolder(null); notify({ tone: "success", title: "Pasta salva" }); }} />}
    {editingTemplate && <EntityFormModal<DocumentTemplate> open={!!editingTemplate} title="Modelo documental" subtitle="Modelos por área jurídica: procuração, contrato, declaração, requerimento, notificação, recibo e relatório ao cliente." value={editingTemplate} fields={templateFields} onClose={() => setEditingTemplate(null)} onSave={async (template) => { const exists = state.documentTemplates.some((item) => item.id === template.id); await commit("documentTemplates", template, exists ? "update" : "create"); setEditingTemplate(null); notify({ tone: "success", title: "Modelo salvo" }); }} />}
  </div>;
}
