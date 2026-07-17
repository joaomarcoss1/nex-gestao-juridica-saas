
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Edit3, ListChecks, MessageSquareText, Plus, Search, Send, TimerReset, Trash2, UsersRound, Workflow } from "lucide-react";
import type { FeaturePageProps, Message, Process, Task } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { can } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";
import { requestConfirmation } from "@/services/dialog.service";

const statuses: Task["status"][] = ["Pendente", "Triagem", "Em produção", "Revisão", "Aguardando cliente", "Aguardando tribunal", "Concluída", "Atrasada", "Cancelada"];
const columns: Task["status"][] = ["Pendente", "Triagem", "Em produção", "Revisão", "Aguardando cliente", "Aguardando tribunal", "Atrasada", "Concluída"];
const priorities: Task["priority"][] = ["Baixa", "Média", "Alta", "Urgente", "Crítica"];
const workflowStages: NonNullable<Task["workflowStage"]>[] = ["Triagem", "Execução", "Revisão", "Protocolo", "Cliente", "Concluído"];


function addDays(days: number) {
  return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10);
}

function blankTask(client: string, processId: string, responsible = ""): Task {
  return {
    id: uid("task"),
    title: "",
    description: "",
    client,
    processId,
    responsible: responsible || "",
    delegatedBy: "",
    reviewer: "",
    workflowStage: "Triagem",
    sector: "Advocacia",
    priority: "Média",
    status: "Pendente",
    due: addDays(3),
    estimatedHours: 1,
    spentHours: 0,
    slaHours: 24,
    qualityScore: 100,
    checklist: [],
    comments: [],
  };
}

function employeeOptions(state: FeaturePageProps["state"]) {
  return [{ value: "", label: "Sem responsável" }, ...state.employees.map((employee) => ({ value: employee.id, label: `${employee.name} · ${employee.role}` }))];
}

function nextStatus(task: Task): Task["status"] {
  if (task.status === "Pendente") return "Triagem";
  if (task.status === "Triagem") return "Em produção";
  if (task.status === "Em produção") return "Revisão";
  if (task.status === "Revisão") return "Concluída";
  if (task.status === "Aguardando cliente" || task.status === "Aguardando tribunal") return "Em produção";
  return "Concluída";
}

export function TarefasPage({ state, commit, remove, executeAtomic, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(state.tasks[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [processTemplateId, setProcessTemplateId] = useState(state.processes[0]?.id ?? "");
  const canCreate = can(profile, "tasks.create");
  const canUpdate = can(profile, "tasks.update");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.tasks.filter((task) => [task.title, task.description, task.client, task.sector, task.priority, task.status, task.due, getEmployeeName(state, task.responsible)].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state]);

  const performance = useMemo(() => {
    return state.employees.map((employee) => {
      const tasks = state.tasks.filter((task) => task.responsible === employee.id);
      const done = tasks.filter((task) => task.status === "Concluída").length;
      const late = tasks.filter((task) => task.status === "Atrasada" || (task.due < todayIso() && task.status !== "Concluída")).length;
      const hours = tasks.reduce((sum, task) => sum + (task.spentHours || 0), 0);
      const estimated = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const avgQuality = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (task.qualityScore ?? 85), 0) / tasks.length) : employee.score;
      const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 100;
      return { employee, tasks, done, late, hours, estimated, avgQuality, completion };
    }).filter((item) => item.tasks.length > 0).sort((a, b) => b.tasks.length - a.tasks.length);
  }, [state.employees, state.tasks]);

  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId) ?? state.tasks[0];
  const taskMessages = state.messages.filter((item) => item.relatedTaskId === selectedTask?.id || item.subject?.includes(selectedTask?.title ?? "")).slice(0, 6);

  const fields: FieldConfig<Task>[] = [
    { key: "title", label: "Título da tarefa", required: true },
    { key: "description", label: "Descrição operacional", kind: "textarea", placeholder: "O que precisa ser feito, padrão esperado, contexto jurídico e entregável." },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area} · ${p.phase}` }))] },
    { key: "responsible", label: "Responsável direto", kind: "select", options: employeeOptions(state) },
    { key: "delegatedBy", label: "Delegado por", kind: "select", options: employeeOptions(state) },
    { key: "reviewer", label: "Revisor / aprovador", kind: "select", options: employeeOptions(state) },
    { key: "workflowStage", label: "Etapa de workflow", kind: "select", options: workflowStages },
    { key: "sector", label: "Setor" },
    { key: "priority", label: "Prioridade", kind: "select", options: priorities },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "due", label: "Prazo", kind: "date" },
    { key: "estimatedHours", label: "Horas estimadas", kind: "number", step: 0.25 },
    { key: "spentHours", label: "Horas realizadas", kind: "number", step: 0.25 },
    { key: "slaHours", label: "SLA interno (horas)", kind: "number", step: 1 },
    { key: "qualityScore", label: "Nota de qualidade", kind: "number", min: 0, max: 100, step: 1 },
  ];

  async function saveTask(task: Task) {
    const isNew = !state.tasks.some((item) => item.id === task.id);
    const process = state.processes.find((item) => item.id === task.processId);
    const next: Task = {
      ...task,
      client: task.client || process?.client || state.clients[0]?.name || "",
      clientId: task.clientId || process?.clientId,
      startedAt: task.startedAt || (task.status !== "Pendente" ? todayIso() : undefined),
      completedAt: task.status === "Concluída" ? (task.completedAt || todayIso()) : undefined,
      workflowStage: task.status === "Concluída" ? "Concluído" : task.workflowStage,
    };
    await commit("tasks", next, isNew ? "create" : "update");
    setEditing(null);
    setSelectedTaskId(next.id);
    notify({ tone: "success", title: isNew ? "Tarefa criada" : "Workflow atualizado", message: "Tarefa salva com responsável, delegação, comunicação, SLA e rastreabilidade." });
  }

  async function deleteTask(task: Task) {
    if (!await requestConfirmation("Excluir tarefa", `A tarefa ${task.title} será arquivada e permanecerá auditável. Deseja continuar?`)) return;
    await remove("tasks", task.id);
    notify({ tone: "info", title: "Tarefa removida" });
  }

  async function move(task: Task, status: Task["status"] = nextStatus(task)) {
    if (status === "Concluída" && task.workflowRunStepId) {
      await executeAtomic({ type: "completeWorkflowStep", runStepId: task.workflowRunStepId, workedMinutes: Math.max(0, Math.round((task.spentHours || 0) * 60)), billableMinutes: task.billableMinutes, idempotencyKey: `workflow-step:${task.workflowRunStepId}` });
    } else {
      const stage: Task["workflowStage"] = status === "Triagem" ? "Triagem" : status === "Em produção" ? "Execução" : status === "Revisão" ? "Revisão" : status === "Concluída" ? "Concluído" : task.workflowStage;
      if (status === "Concluída" && (task.blockers?.length || (task.checklist?.length && (task.checklistCompleted?.length ?? 0) < task.checklist.length))) throw new Error("Conclua o checklist e remova bloqueios antes de finalizar.");
      await commit("tasks", { ...task, status, workflowStage: stage, startedAt: task.startedAt || todayIso(), completedAt: status === "Concluída" ? todayIso() : task.completedAt, workedMinutes: Math.round((task.spentHours || 0) * 60) }, "update");
    }
    notify({ tone: "success", title: status === "Concluída" ? "Tarefa concluída" : "Tarefa movimentada", message: `${task.title} foi movida para ${status}.` });
  }

  async function sendMessage() {
    if (!selectedTask || message.trim().length < 3) return;
    const note: Message = {
      id: uid("msg"),
      channel: "Chat",
      threadType: "interno",
      relatedTaskId: selectedTask.id,
      processId: selectedTask.processId,
      client: selectedTask.client,
      clientId: selectedTask.clientId,
      subject: `Tarefa: ${selectedTask.title}`,
      body: message.trim(),
      status: "Enviada",
      date: todayIso(),
      senderId: profile?.id,
      senderName: profile?.name ?? "Equipe",
      senderRole: profile?.role,
      responsibleId: selectedTask.responsible,
      direction: "interno",
      priority: selectedTask.priority === "Crítica" ? "Urgente" : selectedTask.priority,
    };
    await commit("messages", note, "create");
    await commit("tasks", { ...selectedTask, comments: [...(selectedTask.comments ?? []), `${profile?.name ?? "Equipe"}: ${message.trim()}`] }, "update");
    setMessage("");
    notify({ tone: "success", title: "Mensagem registrada", message: "A comunicação ficou vinculada à tarefa e ao processo." });
  }

  async function applyTemplate(process: Process | undefined) {
    if (!process) return;
    const template = state.workflowTemplates.find((item) => item.active && (item.moduleArea === process.area || item.moduleArea === "Geral"));
    if (!template) { notify({ tone: "error", title: "Workflow não configurado", message: "Cadastre um template ativo no módulo de configurações." }); return; }
    await executeAtomic({ type: "startWorkflow", processId: process.id, workflowTemplateId: template.id, idempotencyKey: `workflow:${process.id}:${template.id}` });
    notify({ tone: "success", title: "Workflow iniciado", message: "A execução e suas dependências foram persistidas; reaplicações acidentais são ignoradas." });
  }

  return <div className="page-grid workflow-page workflow-page-v48">
    <div className="kpi-row">
      <Kpi icon={ListChecks} label="Tarefas totais" value={state.tasks.length} note="workflow da equipe" tone="blue" />
      <Kpi icon={Clock3} label="Em execução" value={state.tasks.filter((t) => ["Pendente", "Triagem", "Em produção", "Revisão"].includes(t.status)).length} note="por responsável" tone="gold" />
      <Kpi icon={TimerReset} label="Atrasadas/SLA" value={state.tasks.filter((t) => t.status === "Atrasada" || (t.due < todayIso() && t.status !== "Concluída")).length} note="gestão de risco" tone="red" />
      <Kpi icon={MessageSquareText} label="Mensagens" value={state.messages.filter((m) => m.threadType === "interno").length} note="comunicação interna" tone="purple" />
    </div>
    <Panel className="workflow-command-panel">
      <PanelTitle title="Workflow completo da equipe do escritório" subtitle="Designar tarefas, revisar, controlar SLA, comunicar internamente e acompanhar desempenho por pessoa, processo e setor." action={canCreate ? <Button onClick={() => setEditing(blankTask(state.clients[0]?.name ?? "", state.processes[0]?.id ?? "", profile?.id ?? ""))}><Plus size={16}/> Nova tarefa</Button> : undefined} />
      <div className="workflow-principles">
        <span><Workflow size={15}/> Processo gera tarefas por etapa</span>
        <span><UsersRound size={15}/> Responsável, delegador e revisor ficam rastreados</span>
        <span><MessageSquareText size={15}/> Comunicação fica vinculada ao trabalho</span>
      </div>
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa, cliente, responsável, status, setor ou prioridade" /></div>
    </Panel>
    <div className="dashboard-layout secondary workflow-ops-layout">
      <Panel>
        <PanelTitle title="Aplicar workflow padrão" subtitle="Cria uma sequência de tarefas operacionais para o processo selecionado." />
        <div className="quick-form"><Field label="Processo"><select value={processTemplateId} onChange={(e) => setProcessTemplateId(e.target.value)}>{state.processes.map((process) => <option key={process.id} value={process.id}>{process.client} · {process.phase}</option>)}</select></Field><Button variant="gold" onClick={() => applyTemplate(state.processes.find((p) => p.id === processTemplateId))}>Aplicar workflow</Button></div>
        <div className="crm-triage-grid workflow-template-grid">{state.workflowTemplates.filter((tpl) => tpl.active).map((tpl) => <div key={tpl.id}><strong>{tpl.name}</strong><span>{tpl.moduleArea} · {state.workflowSteps.filter((step) => step.workflowId === tpl.id).map((step) => step.name).join(" · ")}</span></div>)}</div>
      </Panel>
      <Panel>
        <PanelTitle title="Comunicação da tarefa" subtitle="Mensagens internas sem misturar com o portal do cliente." />
        <Field label="Tarefa"><select value={selectedTask?.id ?? ""} onChange={(e) => setSelectedTaskId(e.target.value)}>{state.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
        <Field label="Mensagem"><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva uma orientação, pendência ou atualização para a equipe." /></Field>
        <Button onClick={sendMessage}><Send size={15}/> Enviar no workflow</Button>
        <div className="stack-list workflow-message-list">{taskMessages.map((item) => <div className="data-card" key={item.id}><strong>{item.senderName ?? "Equipe"}</strong><small>{item.date} · {item.priority ?? "Média"}</small><p>{item.body}</p></div>)}</div>
      </Panel>
    </div>
    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Desempenho individual" subtitle="Carga, entregas, atraso e qualidade por responsável." />
        <div className="performance-grid">
          {performance.map((item) => <article className="performance-card" key={item.employee.id}>
            <div><strong>{item.employee.name}</strong><span>{item.employee.role} · {item.employee.sector}</span></div>
            <div className="mini-metrics"><b>{item.tasks.length}</b><small>tarefas</small><b>{item.late}</b><small>atrasos</small><b>{item.avgQuality}</b><small>qualidade</small></div>
            <ProgressBar value={item.completion} color={item.late ? "gold" : "green"}/>
            <small>{item.done} concluídas · {item.hours.toFixed(1)}h / {item.estimated.toFixed(1)}h gastas</small>
          </article>)}
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Riscos operacionais" subtitle="Pontos que exigem atuação de gestão." />
        <div className="risk-list">
          {state.tasks.filter((task) => task.status === "Atrasada" || task.blockers?.length || (task.due < todayIso() && task.status !== "Concluída")).slice(0, 6).map((task) => <div key={task.id} className="task-row compact"><AlertTriangle size={17}/><div><strong>{task.title}</strong><small>{task.client} · {getEmployeeName(state, task.responsible)} · {task.blockers?.join(", ") || "prazo/SLA"}</small></div><StatusBadge tone="red">Atenção</StatusBadge></div>)}
        </div>
      </Panel>
    </div>
    <div className="workflow-mobile-list stack-list" aria-label="Lista móvel de tarefas do workflow">
      {filtered.map((task) => <article className="data-card workflow-mobile-card" key={`mobile-${task.id}`} onClick={() => setSelectedTaskId(task.id)}>
        <div className="mobile-card-heading"><strong>{task.title}</strong><StatusBadge tone={statusTone(task.status)}>{task.status}</StatusBadge></div>
        <small>{task.client} · {task.sector}</small>
        <p>{task.description || "Sem descrição detalhada."}</p>
        <small>Responsável: {getEmployeeName(state, task.responsible)} · Prazo: {task.due}</small>
        <div className="card-tags"><StatusBadge tone={statusTone(task.priority)}>{task.priority}</StatusBadge><StatusBadge tone="blue">{task.workflowStage ?? "Triagem"}</StatusBadge>{task.blockers?.length ? <StatusBadge tone="red">Bloqueada</StatusBadge> : null}</div>
        <ActionBar>{canUpdate && task.status !== "Concluída" && <Button variant="gold" onClick={() => move(task)}>Avançar</Button>}{canUpdate && <Button variant="ghost" onClick={() => setEditing(task)}><Edit3 size={15}/> Editar</Button>}</ActionBar>
      </article>)}
    </div>
    <div className="kanban task-kanban task-kanban-v48">
      {columns.map((status) => <div className="kanban-col" key={status}><h3>{status}</h3>{filtered.filter((t) => t.status === status).map((task) => <div className="kanban-card floating-card" key={task.id} onClick={() => setSelectedTaskId(task.id)}>
        <strong>{task.title}</strong>
        <small>{task.client} · {task.sector}</small>
        <p>{task.description || "Sem descrição detalhada."}</p>
        <p>Resp.: {getEmployeeName(state, task.responsible)} · Revisor: {getEmployeeName(state, task.reviewer)}</p>
        <p>Prazo: {task.due} · {task.estimatedHours}h estimadas · SLA {task.slaHours ?? 24}h</p>
        <div className="card-tags"><StatusBadge tone={statusTone(task.priority)}>{task.priority}</StatusBadge><StatusBadge tone="blue">{task.workflowStage ?? "Triagem"}</StatusBadge>{task.blockers?.length ? <StatusBadge tone="red">Bloqueio</StatusBadge> : null}</div>
        <ActionBar>
          {canUpdate && task.status !== "Concluída" && <Button variant="ghost" onClick={() => move(task)}>Avançar</Button>}
          {canUpdate && <Button variant="ghost" onClick={() => setEditing(task)}><Edit3 size={15}/> Editar</Button>}
          {canUpdate && <Button variant="danger" onClick={() => deleteTask(task)}><Trash2 size={15}/></Button>}
        </ActionBar>
      </div>)}</div>)}
    </div>
    {editing && <EntityFormModal<Task> open={!!editing} title={state.tasks.some((item) => item.id === editing.id) ? "Editar tarefa" : "Nova tarefa"} subtitle="Atualize processo, responsável, delegação, etapa, prioridade, SLA, horas e qualidade." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveTask} />}
  </div>;
}
