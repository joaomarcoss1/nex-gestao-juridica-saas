import { useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, CircleDollarSign, Edit3, FileText, Plus, ShieldAlert } from "lucide-react";
import type { Deadline, FeaturePageProps, FinanceEntry, LegalDoc, Process, Task } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { processesService } from "@/services/processes.service";

function nextDate(days: number) {
  return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10);
}

export function ProcessoDetalhePage({ state, processId, commit, notify, setPage }: FeaturePageProps & { processId: string }) {
  const process = state.processes.find((item) => item.id === processId);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingFinance, setEditingFinance] = useState<FinanceEntry | null>(null);
  const [editingDocument, setEditingDocument] = useState<LegalDoc | null>(null);

  if (!process) return <Panel><PanelTitle title="Processo não encontrado" subtitle="O registro pode ter sido arquivado, removido ou bloqueado pela permissão atual."/><Button onClick={() => setPage("processos")}><ArrowLeft size={15}/> Voltar</Button></Panel>;

  const targetProcess = process;
  const client = state.clients.find((c) => c.id === targetProcess.clientId || c.name === targetProcess.client);
  const deadlines = useMemo(() => state.deadlines.filter((d) => d.processId === targetProcess.id), [state.deadlines, targetProcess.id]);
  const tasks = useMemo(() => state.tasks.filter((t) => t.processId === targetProcess.id), [state.tasks, targetProcess.id]);
  const docs = useMemo(() => state.documents.filter((d) => d.processId === targetProcess.id), [state.documents, targetProcess.id]);
  const finances = useMemo(() => state.finances.filter((f) => f.processId === targetProcess.id), [state.finances, targetProcess.id]);
  const revenue = finances.filter((f) => f.type === "Receita").reduce((s, f) => s + f.amount, 0);
  const expenses = finances.filter((f) => f.type === "Despesa").reduce((s, f) => s + f.amount, 0);
  const responsibleOptions = state.employees.map((e) => ({ value: e.id, label: `${e.name} · ${e.role}` }));

  const processFields: FieldConfig<Process>[] = [
    { key: "cnj", label: "CNJ" },
    { key: "type", label: "Tipo", kind: "select", options: ["Judicial", "Administrativo", "Consultivo", "Extrajudicial", "Contrato", "Acordo", "Serviço avulso"] },
    { key: "area", label: "Área", kind: "select", options: ["Cível", "Criminal", "Trabalhista", "Família", "Consumidor", "Empresarial", "Previdenciário", "Tributário", "Outro"] },
    { key: "court", label: "Tribunal / órgão" },
    { key: "class", label: "Classe" },
    { key: "opposite", label: "Parte contrária" },
    { key: "phase", label: "Fase" },
    { key: "status", label: "Status" },
    { key: "risk", label: "Risco", kind: "select", options: ["Baixo", "Médio", "Alto"] },
    { key: "successChance", label: "Chance de êxito (%)", kind: "number", min: 0, max: 100 },
    { key: "value", label: "Valor da causa", kind: "number", step: 0.01 },
    { key: "fees", label: "Honorários", kind: "number", step: 0.01 },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "nextDeadline", label: "Próximo prazo", kind: "date" },
    { key: "lastMoveDays", label: "Dias sem movimentação", kind: "number" },
    { key: "progress", label: "Progresso (%)", kind: "number", min: 0, max: 100 },
    { key: "clientVisibleSummary", label: "Resumo visível ao cliente", kind: "textarea" },
    { key: "internalStrategy", label: "Estratégia interna sigilosa", kind: "textarea" },
    { key: "notes", label: "Observações internas", kind: "textarea" },
  ];

  const deadlineFields: FieldConfig<Deadline>[] = [
    { key: "type", label: "Tipo do prazo", required: true },
    { key: "publicationDate", label: "Publicação", kind: "date" },
    { key: "awarenessDate", label: "Ciência", kind: "date" },
    { key: "startDate", label: "Início", kind: "date" },
    { key: "days", label: "Quantidade de dias", kind: "number", min: 0 },
    { key: "countType", label: "Contagem", kind: "select", options: ["Dias úteis", "Dias corridos"] },
    { key: "dueDate", label: "Vencimento", kind: "date" },
    { key: "fatal", label: "Prazo fatal", kind: "select", options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] as never },
    { key: "priority", label: "Prioridade", kind: "select", options: ["Baixa", "Média", "Alta", "Urgente", "Crítica"] },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Concluído", "Atrasado", "Cancelado"] },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "proof", label: "Comprovante/baixa" },
    { key: "notes", label: "Observações", kind: "textarea" },
  ];

  const taskFields: FieldConfig<Task>[] = [
    { key: "title", label: "Título", required: true },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "sector", label: "Setor" },
    { key: "priority", label: "Prioridade", kind: "select", options: ["Baixa", "Média", "Alta", "Urgente", "Crítica"] },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Em andamento", "Aguardando cliente", "Aguardando tribunal", "Concluída", "Atrasada", "Cancelada"] },
    { key: "due", label: "Prazo", kind: "date" },
    { key: "estimatedHours", label: "Horas estimadas", kind: "number", step: 0.25 },
    { key: "spentHours", label: "Horas gastas", kind: "number", step: 0.25 },
    { key: "description", label: "Descrição", kind: "textarea" },
  ];

  const financeFields: FieldConfig<FinanceEntry>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["Receita", "Despesa"] },
    { key: "category", label: "Categoria", kind: "select", options: ["Honorários", "Entrada de honorários", "Parcela de contrato", "Custas processuais", "Diligência", "Despesa operacional", "Outro"] },
    { key: "amount", label: "Valor", kind: "number", required: true, step: 0.01 },
    { key: "dueDate", label: "Vencimento", kind: "date" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Pago", "Atrasado", "Cancelado", "Parcial"] },
    { key: "method", label: "Forma", kind: "select", options: ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência", "Recorrente"] },
    { key: "notes", label: "Observações", kind: "textarea" },
  ];

  const documentFields: FieldConfig<LegalDoc>[] = [
    { key: "name", label: "Nome do documento", required: true },
    { key: "type", label: "Tipo", kind: "select", options: ["Procuração", "Contrato", "Documento pessoal", "Comprovante", "Petição", "Prova", "Outro"] },
    { key: "status", label: "Status", kind: "select", options: ["Recebido", "Em análise", "Pendente correção", "Aprovado", "Protocolado", "Assinatura", "Recusado", "Arquivado"] },
    { key: "origin", label: "Origem", kind: "select", options: ["Upload", "Câmera", "Editor", "Scanner do cliente"] },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "version", label: "Versão" },
    { key: "rejectionComment", label: "Comentário de recusa/correção", kind: "textarea" },
  ];

  function back() {
    history.pushState({}, "", "/processos");
    dispatchEvent(new Event("popstate"));
  }

  function deadlineDraft(): Deadline {
    return { id: uid("deadline"), processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id, responsible: targetProcess.responsible, type: "Prazo de conferência", publicationDate: todayIso(), awarenessDate: todayIso(), startDate: todayIso(), days: 5, countType: "Dias úteis", dueDate: nextDate(5), fatal: false, priority: "Alta", status: "Pendente", notes: "Prazo criado pelo detalhe do processo. Validar manualmente." };
  }
  function taskDraft(): Task {
    return { id: uid("task"), title: `Providência do processo ${targetProcess.cnj || targetProcess.area}`, processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id, responsible: targetProcess.responsible, sector: "Advocacia", priority: "Alta", status: "Pendente", due: nextDate(2), estimatedHours: 2, spentHours: 0, description: "" };
  }
  function financeDraft(): FinanceEntry {
    return { id: uid("fin"), type: "Receita", category: "Honorários", client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id, processId: targetProcess.id, amount: targetProcess.fees || 0, dueDate: nextDate(3), status: "Pendente", method: "PIX", notes: "" };
  }
  function documentDraft(): LegalDoc {
    return { id: uid("doc"), name: "Documento do processo", type: "Petição", client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id, processId: targetProcess.id, status: "Recebido", origin: "Upload", responsible: targetProcess.responsible, version: "v1" };
  }

  async function saveProcess(value: Process) {
    await commit("processes", { ...value, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id }, "update");
    setEditingProcess(null);
    notify({ tone: "success", title: "Processo atualizado", message: "Ficha processual e estratégia foram atualizadas." });
  }
  async function saveDeadline(value: Deadline) {
    const isNew = !state.deadlines.some((item) => item.id === value.id);
    await commit("deadlines", { ...value, processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id }, isNew ? "create" : "update");
    setEditingDeadline(null);
    notify({ tone: "success", title: isNew ? "Prazo criado" : "Prazo atualizado" });
  }
  async function saveTask(value: Task) {
    const isNew = !state.tasks.some((item) => item.id === value.id);
    await commit("tasks", { ...value, processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id }, isNew ? "create" : "update");
    setEditingTask(null);
    notify({ tone: "success", title: isNew ? "Tarefa criada" : "Tarefa atualizada" });
  }
  async function saveFinance(value: FinanceEntry) {
    const isNew = !state.finances.some((item) => item.id === value.id);
    await commit("finances", { ...value, processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id }, isNew ? "create" : "update");
    setEditingFinance(null);
    notify({ tone: "success", title: isNew ? "Lançamento criado" : "Financeiro atualizado" });
  }
  async function saveDocument(value: LegalDoc) {
    const isNew = !state.documents.some((item) => item.id === value.id);
    await commit("documents", { ...value, processId: targetProcess.id, client: targetProcess.client, clientId: targetProcess.clientId ?? client?.id }, isNew ? "create" : "update");
    setEditingDocument(null);
    notify({ tone: "success", title: isNew ? "Documento criado" : "Documento atualizado" });
  }
  async function closeProcess() {
    await commit("processes", { ...targetProcess, status: "Encerrado", phase: "Encerramento", progress: 100, closedAt: new Date().toISOString() }, "update");
    notify({ tone: "success", title: "Processo encerrado", message: "Processo finalizado com auditoria e mantendo rastreabilidade." });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title={targetProcess.client} subtitle={`${targetProcess.cnj || "CNJ pendente"} · ${targetProcess.area} · ${targetProcess.court || "tribunal não informado"}`} action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button><Button variant="ghost" onClick={() => setEditingProcess(targetProcess)}><Edit3 size={15}/> Editar processo</Button><Button variant="ghost" onClick={() => processesService.printProcessReport(state, targetProcess)}>Gerar relatório</Button><Button variant="danger" onClick={closeProcess}><CheckCircle2 size={15}/> Encerrar</Button></ActionBar>} /><ProgressBar value={targetProcess.progress} color={targetProcess.risk === "Alto" ? "red" : targetProcess.risk === "Médio" ? "gold" : "green"}/><div className="detail-tabs"><span>Resumo</span><span>Movimentações</span><span>Prazos</span><span>Tarefas</span><span>Audiências</span><span>Documentos</span><span>Financeiro</span><span>Estratégia interna</span><span>Relatório</span></div></Panel>
    <div className="kpi-row"><Kpi icon={ShieldAlert} label="Risco" value={targetProcess.risk} note={`${targetProcess.successChance}% chance estimada`} tone={targetProcess.risk === "Alto" ? "red" : "gold"}/><Kpi icon={CalendarClock} label="Prazos" value={deadlines.length} note="validar pelo advogado" tone="blue"/><Kpi icon={FileText} label="Documentos" value={docs.length} note="vinculados" tone="purple"/><Kpi icon={CircleDollarSign} label="Resultado" value={money(revenue - expenses)} note="rentabilidade estimada" tone="green"/></div>
    <Panel><PanelTitle title="Ações rápidas do processo" subtitle="Crie dados operacionais vinculados diretamente ao processId e clientId." action={<ActionBar><Button onClick={() => setEditingDeadline(deadlineDraft())}><CalendarClock size={15}/> Novo prazo</Button><Button variant="ghost" onClick={() => setEditingTask(taskDraft())}><Plus size={15}/> Tarefa</Button><Button variant="ghost" onClick={() => setEditingFinance(financeDraft())}><CircleDollarSign size={15}/> Financeiro</Button><Button variant="ghost" onClick={() => setEditingDocument(documentDraft())}><FileText size={15}/> Documento</Button></ActionBar>} /></Panel>
    <div className="detail-layout"><Panel><PanelTitle title="Dados do processo" subtitle="Ficha operacional e jurídica."/><div className="info-grid"><div><b>Parte contrária</b><span>{targetProcess.opposite || "Não informada"}</span></div><div><b>Classe</b><span>{targetProcess.class}</span></div><div><b>Fase</b><span>{targetProcess.phase}</span></div><div><b>Status</b><span>{targetProcess.status}</span></div><div><b>Valor da causa</b><span>{money(targetProcess.value)}</span></div><div><b>Honorários</b><span>{money(targetProcess.fees)}</span></div></div></Panel><Panel><PanelTitle title="Estratégia interna" subtitle="Não aparece no portal do cliente."/><div className="security-note">Campo reservado para análise de risco, documentos sensíveis e tese jurídica. Deve ser protegido por permissão e auditoria.</div><p>{targetProcess.internalStrategy || targetProcess.notes || "Sem estratégia registrada."}</p></Panel></div>
    <Panel><PanelTitle title="Prazos jurídicos" subtitle="Controle gerencial com aviso de conferência obrigatória."/><div className="security-note">O cálculo de prazos é ferramenta de apoio gerencial. O advogado responsável deve validar conforme legislação, tribunal e regras processuais vigentes.</div><div className="responsive-table"><table><thead><tr><th>Tipo</th><th>Vencimento</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead><tbody>{deadlines.map(d => <tr key={d.id}><td>{d.type}</td><td>{d.dueDate}</td><td><StatusBadge tone={statusTone(d.priority)}>{d.priority}</StatusBadge></td><td>{d.status}</td><td><Button variant="ghost" onClick={() => setEditingDeadline(d)}>Editar</Button></td></tr>)}</tbody></table></div></Panel>
    <div className="detail-layout"><Panel><PanelTitle title="Tarefas" subtitle="Workflow do processo."/><ul className="timeline-list">{tasks.map(t => <li key={t.id}><b>{t.title}</b><span>{t.status} · {t.due}</span><Button variant="ghost" onClick={() => setEditingTask(t)}>Editar</Button></li>)}</ul></Panel><Panel><PanelTitle title="Financeiro" subtitle="Receitas, despesas e rentabilidade."/><ul className="timeline-list">{finances.map(f => <li key={f.id}><b>{f.category}</b><span>{f.type} · {f.status} · {money(f.amount)}</span><Button variant="ghost" onClick={() => setEditingFinance(f)}>Editar</Button></li>)}</ul></Panel></div>
    <Panel><PanelTitle title="Documentos e histórico" subtitle="Versões, storage e rastreabilidade."/><ul className="timeline-list">{docs.map(d => <li key={d.id}><b>{d.name}</b><span>{d.status} · {d.version} · {d.hash ? "com hash" : "sem hash"}</span><Button variant="ghost" onClick={() => setEditingDocument(d)}>Editar</Button></li>)}</ul></Panel>

    {editingProcess && <EntityFormModal<Process> open={!!editingProcess} title="Editar processo" subtitle="Ficha processual completa." value={editingProcess} fields={processFields} onClose={() => setEditingProcess(null)} onSave={saveProcess} />}
    {editingDeadline && <EntityFormModal<Deadline> open={!!editingDeadline} title={state.deadlines.some((item) => item.id === editingDeadline.id) ? "Editar prazo" : "Novo prazo"} subtitle="Prazo vinculado ao processo." value={editingDeadline} fields={deadlineFields} onClose={() => setEditingDeadline(null)} onSave={saveDeadline} />}
    {editingTask && <EntityFormModal<Task> open={!!editingTask} title={state.tasks.some((item) => item.id === editingTask.id) ? "Editar tarefa" : "Nova tarefa"} subtitle="Tarefa vinculada ao processo." value={editingTask} fields={taskFields} onClose={() => setEditingTask(null)} onSave={saveTask} />}
    {editingFinance && <EntityFormModal<FinanceEntry> open={!!editingFinance} title={state.finances.some((item) => item.id === editingFinance.id) ? "Editar financeiro" : "Novo financeiro"} subtitle="Lançamento vinculado ao processo." value={editingFinance} fields={financeFields} onClose={() => setEditingFinance(null)} onSave={saveFinance} />}
    {editingDocument && <EntityFormModal<LegalDoc> open={!!editingDocument} title={state.documents.some((item) => item.id === editingDocument.id) ? "Editar documento" : "Novo documento"} subtitle="Documento vinculado ao processo." value={editingDocument} fields={documentFields} onClose={() => setEditingDocument(null)} onSave={saveDocument} />}
  </div>;
}
