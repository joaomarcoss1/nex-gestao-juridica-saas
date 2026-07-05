import { useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, CircleDollarSign, Edit3, FileText, Mail, MessageCircle, Plus, ShieldCheck } from "lucide-react";
import type { Client, FeaturePageProps, FinanceEntry, LegalDoc, Message, Process, Task } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { clientsService } from "@/services/clients.service";

const clientStatus = ["Ativo", "Prospecto", "Inativo", "Arquivado"];
const clientTypes = ["PF", "PJ"];
const processAreas = ["Cível", "Criminal", "Trabalhista", "Família", "Consumidor", "Empresarial", "Previdenciário", "Tributário", "Outro"];
const financeCategories = ["Honorários", "Entrada de honorários", "Parcela de contrato", "Custas processuais", "Diligência", "Despesa operacional", "Outro"];
const documentTypes = ["Procuração", "Contrato", "Documento pessoal", "Comprovante", "Petição", "Prova", "Outro"];

function nextDate(days: number) {
  return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10);
}

export function ClienteDetalhePage({ state, clientId, commit, notify, setPage }: FeaturePageProps & { clientId: string }) {
  const client = state.clients.find((item) => item.id === clientId);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [editingFinance, setEditingFinance] = useState<FinanceEntry | null>(null);
  const [editingDocument, setEditingDocument] = useState<LegalDoc | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (!client) return <Panel><PanelTitle title="Cliente não encontrado" subtitle="O registro pode ter sido arquivado, removido ou bloqueado pela permissão atual."/><Button onClick={() => setPage("clientes")}><ArrowLeft size={15}/> Voltar</Button></Panel>;

  const targetClient = client;
  const matchesClient = (item: { client?: string; clientId?: string }) => item.clientId === targetClient.id || item.client === targetClient.name;
  const processes = useMemo(() => state.processes.filter(matchesClient), [state.processes, targetClient.id, targetClient.name]);
  const docs = useMemo(() => state.documents.filter(matchesClient), [state.documents, targetClient.id, targetClient.name]);
  const finances = useMemo(() => state.finances.filter(matchesClient), [state.finances, targetClient.id, targetClient.name]);
  const tasks = useMemo(() => state.tasks.filter(matchesClient), [state.tasks, targetClient.id, targetClient.name]);
  const pricings = useMemo(() => state.pricings.filter(matchesClient), [state.pricings, targetClient.id, targetClient.name]);
  const messages = useMemo(() => state.messages.filter(matchesClient), [state.messages, targetClient.id, targetClient.name]);
  const revenue = finances.filter((f) => f.type === "Receita").reduce((sum, item) => sum + item.amount, 0);

  const responsibleOptions = state.employees.map((e) => ({ value: e.id, label: `${e.name} · ${e.role}` }));
  const processOptions = [{ value: "", label: "Sem processo vinculado" }, ...processes.map((p) => ({ value: p.id, label: `${p.cnj || p.area} · ${p.area}` }))];

  const clientFields: FieldConfig<Client>[] = [
    { key: "type", label: "Tipo", kind: "select", options: clientTypes },
    { key: "name", label: "Nome / razão social", required: true },
    { key: "document", label: "CPF/CNPJ" },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "phone", label: "Telefone" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "city", label: "Cidade" },
    { key: "address", label: "Endereço", kind: "textarea" },
    { key: "origin", label: "Origem" },
    { key: "status", label: "Status", kind: "select", options: clientStatus },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "notes", label: "Observações internas", kind: "textarea" },
  ];

  const processFields: FieldConfig<Process>[] = [
    { key: "cnj", label: "CNJ" },
    { key: "type", label: "Tipo", kind: "select", options: ["Judicial", "Administrativo", "Consultivo", "Extrajudicial", "Contrato", "Acordo", "Serviço avulso"] },
    { key: "area", label: "Área", kind: "select", options: processAreas },
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
    { key: "progress", label: "Progresso (%)", kind: "number", min: 0, max: 100 },
    { key: "notes", label: "Estratégia interna", kind: "textarea" },
  ];

  const financeFields: FieldConfig<FinanceEntry>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["Receita", "Despesa"] },
    { key: "category", label: "Categoria", kind: "select", options: financeCategories },
    { key: "processId", label: "Processo vinculado", kind: "select", options: processOptions },
    { key: "amount", label: "Valor", kind: "number", required: true, step: 0.01 },
    { key: "dueDate", label: "Vencimento", kind: "date" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Pago", "Atrasado", "Cancelado", "Parcial"] },
    { key: "method", label: "Forma", kind: "select", options: ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência", "Recorrente"] },
    { key: "notes", label: "Observações", kind: "textarea" },
  ];

  const documentFields: FieldConfig<LegalDoc>[] = [
    { key: "name", label: "Nome do documento", required: true },
    { key: "type", label: "Tipo", kind: "select", options: documentTypes },
    { key: "processId", label: "Processo vinculado", kind: "select", options: processOptions },
    { key: "status", label: "Status", kind: "select", options: ["Recebido", "Em análise", "Pendente correção", "Aprovado", "Protocolado", "Assinatura", "Recusado", "Arquivado"] },
    { key: "origin", label: "Origem", kind: "select", options: ["Upload", "Câmera", "Editor", "Scanner do cliente"] },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "version", label: "Versão" },
    { key: "rejectionComment", label: "Comentário de recusa/correção", kind: "textarea" },
  ];

  const messageFields: FieldConfig<Message>[] = [
    { key: "channel", label: "Canal", kind: "select", options: ["WhatsApp", "E-mail", "SMS", "Chat"] },
    { key: "processId", label: "Processo vinculado", kind: "select", options: processOptions },
    { key: "subject", label: "Assunto", required: true },
    { key: "body", label: "Mensagem", kind: "textarea" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Agendada", "Enviada"] },
    { key: "date", label: "Data", kind: "date" },
  ];

  const taskFields: FieldConfig<Task>[] = [
    { key: "title", label: "Título", required: true },
    { key: "processId", label: "Processo vinculado", kind: "select", options: processOptions },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "sector", label: "Setor" },
    { key: "priority", label: "Prioridade", kind: "select", options: ["Baixa", "Média", "Alta", "Urgente", "Crítica"] },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Em andamento", "Aguardando cliente", "Aguardando tribunal", "Concluída", "Atrasada", "Cancelada"] },
    { key: "due", label: "Prazo", kind: "date" },
    { key: "estimatedHours", label: "Horas estimadas", kind: "number", step: 0.25 },
    { key: "spentHours", label: "Horas gastas", kind: "number", step: 0.25 },
    { key: "description", label: "Descrição", kind: "textarea" },
  ];

  function back() {
    history.pushState({}, "", "/clientes");
    dispatchEvent(new Event("popstate"));
  }

  function processDraft(): Process {
    return { id: uid("proc"), cnj: "", type: "Judicial", client: targetClient.name, clientId: targetClient.id, opposite: "", area: "Cível", court: "", class: "", phase: "Atendimento inicial", status: "Em análise", risk: "Médio", successChance: 50, value: 0, fees: 0, responsible: targetClient.responsible, nextDeadline: nextDate(7), lastMoveDays: 0, progress: 10, notes: "" };
  }
  function financeDraft(): FinanceEntry {
    return { id: uid("fin"), type: "Receita", category: "Honorários", client: targetClient.name, clientId: targetClient.id, processId: processes[0]?.id ?? "", amount: 0, dueDate: nextDate(3), status: "Pendente", method: "PIX", notes: "" };
  }
  function documentDraft(): LegalDoc {
    return { id: uid("doc"), name: "Novo documento", type: "Documento pessoal", client: targetClient.name, clientId: targetClient.id, processId: processes[0]?.id ?? "", status: "Recebido", origin: "Upload", responsible: targetClient.responsible, version: "v1" };
  }
  function messageDraft(): Message {
    return { id: uid("msg"), channel: "WhatsApp", client: targetClient.name, clientId: targetClient.id, processId: processes[0]?.id ?? "", subject: "Atualização do atendimento", body: "", status: "Pendente", date: todayIso() };
  }
  function taskDraft(): Task {
    return { id: uid("task"), title: `Follow-up do cliente ${targetClient.name}`, client: targetClient.name, clientId: targetClient.id, processId: processes[0]?.id ?? "", responsible: targetClient.responsible, sector: "Atendimento", priority: "Média", status: "Pendente", due: nextDate(2), estimatedHours: 1, spentHours: 0, description: "" };
  }

  async function saveClient(value: Client) {
    await commit("clients", value, "update");
    setEditingClient(null);
    notify({ tone: "success", title: "Cliente atualizado", message: "Ficha cadastral, LGPD e relacionamento foram atualizados." });
  }
  async function saveProcess(value: Process) {
    const isNew = !state.processes.some((item) => item.id === value.id);
    await commit("processes", { ...value, client: targetClient.name, clientId: targetClient.id }, isNew ? "create" : "update");
    setEditingProcess(null);
    notify({ tone: "success", title: isNew ? "Processo criado" : "Processo atualizado", message: "Registro vinculado ao cliente." });
  }
  async function saveFinance(value: FinanceEntry) {
    const isNew = !state.finances.some((item) => item.id === value.id);
    await commit("finances", { ...value, client: targetClient.name, clientId: targetClient.id }, isNew ? "create" : "update");
    setEditingFinance(null);
    notify({ tone: "success", title: isNew ? "Cobrança criada" : "Financeiro atualizado" });
  }
  async function saveDocument(value: LegalDoc) {
    const isNew = !state.documents.some((item) => item.id === value.id);
    await commit("documents", { ...value, client: targetClient.name, clientId: targetClient.id }, isNew ? "create" : "update");
    setEditingDocument(null);
    notify({ tone: "success", title: isNew ? "Documento registrado" : "Documento atualizado" });
  }
  async function saveMessage(value: Message) {
    const isNew = !state.messages.some((item) => item.id === value.id);
    await commit("messages", { ...value, client: targetClient.name, clientId: targetClient.id }, isNew ? "create" : "update");
    setEditingMessage(null);
    notify({ tone: "success", title: isNew ? "Mensagem criada" : "Mensagem atualizada" });
  }
  async function saveTask(value: Task) {
    const isNew = !state.tasks.some((item) => item.id === value.id);
    await commit("tasks", { ...value, client: targetClient.name, clientId: targetClient.id }, isNew ? "create" : "update");
    setEditingTask(null);
    notify({ tone: "success", title: isNew ? "Tarefa criada" : "Tarefa atualizada" });
  }

  return <div className="page-grid">
    <Panel>
      <PanelTitle title={targetClient.name} subtitle={`${targetClient.type} · ${targetClient.document || "documento pendente"} · ficha 360º operacional`} action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button><Button variant="ghost" onClick={() => setEditingClient(targetClient)}><Edit3 size={15}/> Editar dados</Button><Button variant="ghost" onClick={() => clientsService.printClientFicha(state, targetClient)}>Gerar ficha PDF</Button></ActionBar>} />
      <div className="detail-tabs"><span>Resumo</span><span>Cadastro</span><span>Processos</span><span>Documentos</span><span>Financeiro</span><span>Propostas</span><span>Mensagens</span><span>LGPD</span></div>
    </Panel>

    <div className="kpi-row"><Kpi icon={ShieldCheck} label="Status" value={targetClient.status} note={targetClient.origin} tone="green"/><Kpi icon={FileText} label="Processos" value={processes.length} note="ativos/vinculados" tone="blue"/><Kpi icon={Mail} label="Financeiro" value={money(revenue)} note="receitas vinculadas" tone="gold"/><Kpi icon={MessageCircle} label="Mensagens" value={messages.length} note="histórico do portal" tone="purple"/></div>

    <Panel>
      <PanelTitle title="Ações rápidas do cliente" subtitle="Todas as ações criam registros reais no estado/Supabase, vinculados por clientId." action={<ActionBar><Button onClick={() => setEditingProcess(processDraft())}><BriefcaseBusiness size={15}/> Novo processo</Button><Button variant="ghost" onClick={() => setEditingTask(taskDraft())}><Plus size={15}/> Tarefa</Button><Button variant="ghost" onClick={() => setEditingFinance(financeDraft())}><CircleDollarSign size={15}/> Cobrança</Button><Button variant="ghost" onClick={() => setEditingDocument(documentDraft())}><FileText size={15}/> Documento</Button><Button variant="ghost" onClick={() => setEditingMessage(messageDraft())}><MessageCircle size={15}/> Mensagem</Button></ActionBar>} />
    </Panel>

    <div className="detail-layout">
      <Panel><PanelTitle title="Dados cadastrais" subtitle="Informações editáveis e auditáveis."/><div className="info-grid"><div><b>E-mail</b><span>{targetClient.email || "Não informado"}</span></div><div><b>Telefone</b><span>{targetClient.phone || targetClient.whatsapp || "Não informado"}</span></div><div><b>Cidade</b><span>{targetClient.city || "Não informada"}</span></div><div><b>Responsável</b><span>{state.employees.find(e=>e.id===targetClient.responsible)?.name || targetClient.responsible}</span></div><div><b>Endereço</b><span>{targetClient.address || "Não informado"}</span></div><div><b>Observações</b><span>{targetClient.notes || "Sem observações"}</span></div></div></Panel>
      <Panel><PanelTitle title="LGPD e sigilo" subtitle="Controle de dados sensíveis do cliente."/><div className="security-note">Dados pessoais devem ter base legal, acesso restrito, auditoria de visualização e exclusão controlada. O portal do cliente não exibe estratégia interna.</div></Panel>
    </div>

    <Panel><PanelTitle title="Processos vinculados" subtitle="Carteira jurídica por cliente."/><div className="responsive-table"><table><thead><tr><th>CNJ</th><th>Área</th><th>Fase</th><th>Risco</th><th>Ações</th></tr></thead><tbody>{processes.map(p => <tr key={p.id}><td>{p.cnj || "Sem CNJ"}</td><td>{p.area}</td><td>{p.phase}</td><td><StatusBadge tone={statusTone(p.risk)}>{p.risk}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={() => { history.pushState({}, "", `/processos/${p.id}`); dispatchEvent(new Event("popstate")); }}>Abrir</Button><Button variant="ghost" onClick={() => setEditingProcess(p)}><Edit3 size={14}/> Editar</Button></ActionBar></td></tr>)}</tbody></table></div></Panel>
    <div className="detail-layout"><Panel><PanelTitle title="Documentos" subtitle="Storage privado e versões."/><ul className="timeline-list">{docs.map(d => <li key={d.id}><b>{d.name}</b><span>{d.status} · {d.version}</span><Button variant="ghost" onClick={() => setEditingDocument(d)}>Editar</Button></li>)}</ul></Panel><Panel><PanelTitle title="Financeiro e propostas" subtitle="Cobranças, honorários e propostas."/><ul className="timeline-list">{finances.map(f => <li key={f.id}><b>{f.category}</b><span>{f.status} · {money(f.amount)}</span><Button variant="ghost" onClick={() => setEditingFinance(f)}>Editar</Button></li>)}{pricings.map(p => <li key={p.id}><b>{p.title}</b><span>{p.status} · {money(p.recommended)}</span></li>)}</ul></Panel></div>
    <Panel><PanelTitle title="Timeline operacional" subtitle="Tarefas e mensagens vinculadas ao cliente."/><ul className="timeline-list">{tasks.map(t => <li key={t.id}><b>{t.title}</b><span>{t.status} · {t.due}</span><Button variant="ghost" onClick={() => setEditingTask(t)}>Editar</Button></li>)}{messages.map(m => <li key={m.id}><b>{m.subject}</b><span>{m.channel} · {m.status}</span><Button variant="ghost" onClick={() => setEditingMessage(m)}>Editar</Button></li>)}</ul></Panel>

    {editingClient && <EntityFormModal<Client> open={!!editingClient} title="Editar cliente" subtitle="Ficha cadastral completa do cliente." value={editingClient} fields={clientFields} onClose={() => setEditingClient(null)} onSave={saveClient} />}
    {editingProcess && <EntityFormModal<Process> open={!!editingProcess} title={state.processes.some((item) => item.id === editingProcess.id) ? "Editar processo" : "Novo processo"} subtitle="Processo vinculado automaticamente ao cliente." value={editingProcess} fields={processFields} onClose={() => setEditingProcess(null)} onSave={saveProcess} />}
    {editingFinance && <EntityFormModal<FinanceEntry> open={!!editingFinance} title={state.finances.some((item) => item.id === editingFinance.id) ? "Editar lançamento" : "Nova cobrança"} subtitle="Lançamento vinculado automaticamente ao cliente." value={editingFinance} fields={financeFields} onClose={() => setEditingFinance(null)} onSave={saveFinance} />}
    {editingDocument && <EntityFormModal<LegalDoc> open={!!editingDocument} title={state.documents.some((item) => item.id === editingDocument.id) ? "Editar documento" : "Novo documento"} subtitle="Documento vinculado ao cliente e ao processo selecionado." value={editingDocument} fields={documentFields} onClose={() => setEditingDocument(null)} onSave={saveDocument} />}
    {editingMessage && <EntityFormModal<Message> open={!!editingMessage} title={state.messages.some((item) => item.id === editingMessage.id) ? "Editar mensagem" : "Nova mensagem"} subtitle="Mensagem do histórico do cliente/portal." value={editingMessage} fields={messageFields} onClose={() => setEditingMessage(null)} onSave={saveMessage} />}
    {editingTask && <EntityFormModal<Task> open={!!editingTask} title={state.tasks.some((item) => item.id === editingTask.id) ? "Editar tarefa" : "Nova tarefa"} subtitle="Tarefa operacional vinculada ao cliente." value={editingTask} fields={taskFields} onClose={() => setEditingTask(null)} onSave={saveTask} />}
  </div>;
}
