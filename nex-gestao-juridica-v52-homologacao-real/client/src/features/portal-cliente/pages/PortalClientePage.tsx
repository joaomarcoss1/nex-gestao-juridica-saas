import { useEffect, useRef, useState } from "react";
import { Banknote, Camera, CheckCircle2, FileText, Home, LockKeyhole, Send } from "lucide-react";
import type { FeaturePageProps, LegalDoc, Message, PricingProposal, Task } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { todayIso, uid, money, statusTone } from "@/utils/format";
import { processScannedImage, sha256File } from "@/utils/documentScanner";
import { uploadDocumentToStorage } from "@/services/normalizedRepository";
import { useAuth } from "@/hooks/useAuth";
import { isPortalLocked, portalDataForClient, resolvePortalClient } from "@/services/portal.service";

export function PortalClientePage({ state, commit, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const publicPortal = profile?.role === "cliente";
  const locked = isPortalLocked(profile);
  const resolved = resolvePortalClient(state, profile);
  const [clientId, setClientId] = useState(resolved?.id ?? state.clients[0]?.id ?? "");
  useEffect(() => { if (resolved?.id) setClientId(resolved.id); }, [resolved?.id]);
  const client = locked ? resolved : state.clients.find((item) => item.id === clientId) ?? state.clients[0];
  const data = portalDataForClient(state, client);
  const [selectedProcessId, setSelectedProcessId] = useState(data.processes[0]?.id ?? "");
  useEffect(() => { if (!selectedProcessId && data.processes[0]?.id) setSelectedProcessId(data.processes[0].id); }, [data.processes, selectedProcessId]);
  const selectedProcess = data.processes.find((process) => process.id === selectedProcessId) ?? data.processes[0];
  const [messagePriority, setMessagePriority] = useState<Message["priority"]>("Alta");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendDocument(file?: File) {
    if (!file || !client) return;
    const dataUrl = await processScannedImage(file, "contrast");
    const hash = await sha256File(file);
    const id = uid("doc");
    const processId = selectedProcess?.id ?? "";
    let storagePath: string | undefined;
    try { storagePath = await uploadDocumentToStorage(id, dataUrl, client.id, processId) ?? undefined; } catch (error) { notify({ tone: "error", title: "Documento não enviado", message: error instanceof Error ? error.message : "Falha no armazenamento seguro." }); return; }
    const doc: LegalDoc = { id, name: file.name.replace(/\.[^.]+$/, "") || "Documento do cliente", type: "Documento do cliente", client: client.name, clientId: client.id, processId, status: "Recebido", origin: "Scanner do cliente", responsible: selectedProcess?.responsible ?? profile?.id ?? "portal", version: "v1", createdAt: todayIso(), fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl, hash, storagePath, clientVisible: true, validationStatus: "Pendente", accessLevel: "Cliente" };
    const task: Task = { id: uid("task"), title: `Portal: conferir documento de ${client.name}`, processId, client: client.name, clientId: client.id, responsible: selectedProcess?.responsible ?? "", sector: "Controladoria", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 0.5, spentHours: 0 };
    await commit("documents", doc);
    if (!publicPortal) {
      await commit("tasks", task);
      await commit("automationRuns", { id: uid("run"), ruleId: "portal-documento", ruleName: "Documento enviado pelo portal", result: `${client.name} enviou ${doc.name} e gerou tarefa de conferência`, date: todayIso(), status: "Sucesso" });
    }
    setPreview(dataUrl);
    notify({ tone: "success", title: "Documento enviado", message: "O escritório recebeu uma tarefa automática de conferência." });
  }

  async function sendMessage() {
    if (!message.trim() || !client) return;
    const process = selectedProcess;
    if (!process) { notify({ tone: "error", title: "Selecione um processo", message: "O chat do cliente precisa estar vinculado a um processo/caso específico." }); return; }
    const responsibleId = process.responsible ?? process.responsibleId ?? "";
    const msg: Message = {
      id: uid("msg"),
      channel: "Chat",
      client: client.name,
      clientId: client.id,
      processId: process?.id ?? "",
      subject: message.trim().slice(0, 80),
      body: message.trim(),
      status: "Pendente",
      date: todayIso(),
      senderName: client.name,
      senderRole: "cliente",
      responsibleId,
      direction: "cliente_para_escritorio",
      threadType: "cliente",
      priority: messagePriority,
      resolved: false,
    };
    const task: Task = {
      id: uid("task"),
      title: `Responder mensagem do cliente ${client.name}`,
      description: message.trim(),
      processId: process?.id ?? "",
      client: client.name,
      clientId: client.id,
      responsible: responsibleId,
      sector: "Advocacia",
      priority: messagePriority === "Urgente" ? "Urgente" : "Alta",
      status: "Pendente",
      due: todayIso(),
      estimatedHours: 0.25,
      spentHours: 0,
      workflowStage: "Cliente",
      slaHours: 4,
    };
    await commit("messages", msg);
    if (!publicPortal) await commit("tasks", task);
    setMessage("");
    notify({ tone: "success", title: "Mensagem enviada", message: "O advogado responsável recebeu uma tarefa de resposta." });
  }

  async function updateProposal(proposal: PricingProposal, status: "Aceita" | "Recusada") {
    if (!client) return;
    await commit("pricings", { ...proposal, status }, "update");
    if (status === "Aceita" && !publicPortal) {
      await commit("finances", { id: uid("fin"), type: "Receita", category: "Entrada de honorários", client: client.name, clientId: client.id, processId: proposal.processId, amount: proposal.entry || proposal.recommended, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: `Gerado pela aprovação da proposta ${proposal.title}` });
    }
    notify({ tone: "success", title: status === "Aceita" ? "Proposta aceita" : "Proposta recusada", message: status === "Aceita" ? "Cobrança inicial gerada automaticamente." : "O escritório será notificado." });
  }

  if (!client) {
    return <Panel><PanelTitle title="Portal não vinculado" subtitle="Este usuário cliente ainda não possui client_id no perfil. Vincule o cliente em users_profiles.client_id para liberar o portal real."/></Panel>;
  }

  return <div className="portal-view page-grid">
    <Panel><PanelTitle title="Portal do cliente" subtitle="Área externa segura, filtrada por client_id e sem exposição de estratégia interna." />
      {locked ? <p className="security-note"><LockKeyhole size={15}/> Acesso bloqueado ao cliente vinculado: <b>{client.name}</b>. Não há seleção manual de outros clientes.</p> : <Field label="Visualizar como cliente"><select value={client.id} onChange={(e) => setClientId(e.target.value)}>{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
    </Panel>
    <div className="kpi-row"><Kpi icon={Home} label="Processos" value={data.processes.length} note="visíveis ao cliente" tone="blue"/><Kpi icon={FileText} label="Documentos" value={data.documents.length} note="enviados/solicitados" tone="purple"/><Kpi icon={Banknote} label="Cobranças" value={money(data.finances.reduce((sum, f)=>sum+f.amount,0))} note="vinculadas ao cliente" tone="gold"/><Kpi icon={CheckCircle2} label="Propostas" value={data.pricings.length} note="aprovar ou recusar" tone="green"/></div>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Meus processos" subtitle="Somente resumo liberado pelo escritório." />{data.processes.map((process) => <div className="task-row compact" key={process.id}><Home size={18}/><div><strong>{process.area}</strong><small>{process.clientVisibleSummary || process.phase || process.court}</small></div><StatusBadge tone="blue">{process.status}</StatusBadge></div>)}</Panel>
      <Panel><PanelTitle title="Digitalizar documento" subtitle="Upload protegido por organização, cliente e hash." action={<Button onClick={() => inputRef.current?.click()}><Camera size={16}/> Abrir câmera</Button>} /><input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => sendDocument(e.target.files?.[0])}/><div className="scanner-box small floating-card" onClick={() => inputRef.current?.click()}>{preview ? <img src={preview} /> : <><Camera size={38}/><strong>Enviar documento</strong><span>O envio gera tarefa de conferência.</span></>}</div></Panel>
    </div>
    <Panel><PanelTitle title="Propostas" subtitle="Aprovação gera cobrança e auditoria." />{data.pricings.map((proposal)=><div className="task-row compact" key={proposal.id}><FileText size={18}/><div><strong>{proposal.title}</strong><small>{money(proposal.recommended)} · entrada {money(proposal.entry)}</small></div><StatusBadge tone={statusTone(proposal.status)}>{proposal.status}</StatusBadge><ActionBar>{proposal.status !== "Aceita" && <Button variant="gold" onClick={() => updateProposal(proposal, "Aceita")}>Aceitar</Button>}{proposal.status !== "Recusada" && <Button variant="ghost" onClick={() => updateProposal(proposal, "Recusada")}>Recusar</Button>}</ActionBar></div>)}</Panel>
    <Panel><PanelTitle title="Documentos enviados" subtitle="Status de análise e solicitações." /> <div className="data-grid">{data.documents.map((doc) => <article className="data-card" key={doc.id}><FileText/><strong>{doc.name}</strong><small>{doc.type}</small><StatusBadge tone={statusTone(doc.status)}>{doc.status}</StatusBadge></article>)}</div></Panel>
    <Panel><PanelTitle title="Cobranças" subtitle="Valores vinculados ao cliente; pagamento real depende de integração financeira configurada." />{data.finances.map((fin)=><div className="task-row compact" key={fin.id}><Banknote size={18}/><div><strong>{fin.category}</strong><small>{money(fin.amount)} · vencimento {fin.dueDate}</small></div><StatusBadge tone={statusTone(fin.status)}>{fin.status}</StatusBadge></div>)}</Panel>
    <Panel><PanelTitle title="Chat com o advogado responsável" subtitle="A mensagem vai direto para o responsável do processo escolhido; somente ele e o Admin Master/Admin visualizam e respondem." /> <div className="quick-form"><Field label="Processo/caso"><select value={selectedProcess?.id ?? ""} onChange={(e) => setSelectedProcessId(e.target.value)}>{data.processes.map((process) => <option key={process.id} value={process.id}>{process.area} · {process.cnj || process.class} · responsável {state.employees.find((employee) => employee.id === process.responsible)?.name ?? "não definido"}</option>)}</select></Field><Field label="Prioridade"><select value={messagePriority} onChange={(e) => setMessagePriority(e.target.value as Message["priority"])}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select></Field><Field label="Mensagem"><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua dúvida ou solicitação" /></Field><Button onClick={sendMessage}><Send size={16}/> Enviar</Button></div><div className="message-stream portal-stream">{data.messages.filter((msg) => msg.channel === "Chat" && (!selectedProcess?.id || msg.processId === selectedProcess.id)).map((msg) => <article className={`message-bubble ${msg.direction === "escritorio_para_cliente" ? "office" : "client"}`} key={msg.id}><strong>{msg.senderName || (msg.direction === "escritorio_para_cliente" ? "Escritório" : client.name)}</strong><p>{msg.body || msg.subject}</p><span>{msg.date} · {msg.status} · {msg.priority ?? "Média"}</span></article>)}</div></Panel>
  </div>;
}
