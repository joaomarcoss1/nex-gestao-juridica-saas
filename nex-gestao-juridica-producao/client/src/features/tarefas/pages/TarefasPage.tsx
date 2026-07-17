import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Edit3, ListChecks, Plus, Search, TimerReset, Trash2, UsersRound } from "lucide-react";
import type { FeaturePageProps, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { can } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";

const statuses: Task["status"][] = ["Pendente", "Triagem", "Em produção", "Revisão", "Aguardando cliente", "Aguardando tribunal", "Concluída", "Atrasada", "Cancelada"];
const columns: Task["status"][] = ["Pendente", "Triagem", "Em produção", "Revisão", "Aguardando cliente", "Atrasada", "Concluída"];
const priorities: Task["priority"][] = ["Baixa", "Média", "Alta", "Urgente", "Crítica"];
const workflowStages: NonNullable<Task["workflowStage"]>[] = ["Triagem", "Execução", "Revisão", "Protocolo", "Cliente", "Concluído"];

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
    due: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    estimatedHours: 1,
    spentHours: 0,
    slaHours: 24,
    qualityScore: 100,
    checklist: [],
  };
}

function employeeOptions(state: FeaturePageProps["state"]) {
  return [{ value: "", label: "Sem responsável" }, ...state.employees.map((employee) => ({ value: employee.id, label: `${employee.name} · ${employee.role}` }))];
}

export function TarefasPage({ state, commit, remove, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
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

  const fields: FieldConfig<Task>[] = [
    { key: "title", label: "Título da tarefa", required: true },
    { key: "description", label: "Descrição operacional", kind: "textarea", placeholder: "O que precisa ser feito, padrão esperado e contexto jurídico." },
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
    { key: "spentHours", label: "Horas gastas", kind: "number", step: 0.25 },
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
    notify({ tone: "success", title: isNew ? "Ação criada" : "Workflow atualizado", message: "Tarefa salva com responsável, etapa, SLA e rastreabilidade." });
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Excluir a tarefa ${task.title}?`)) return;
    await remove("tasks", task.id);
    notify({ tone: "info", title: "Tarefa removida" });
  }

  async function move(task: Task, status: Task["status"]) {
    const stage: Task["workflowStage"] = status === "Triagem" ? "Triagem" : status === "Em produção" ? "Execução" : status === "Revisão" ? "Revisão" : status === "Concluída" ? "Concluído" : task.workflowStage;
    await commit("tasks", { ...task, status, workflowStage: stage, startedAt: task.startedAt || todayIso(), completedAt: status === "Concluída" ? todayIso() : task.completedAt, spentHours: status === "Concluída" ? Math.max(task.spentHours, task.estimatedHours) : task.spentHours }, "update");
    notify({ tone: "success", title: status === "Concluída" ? "Tarefa concluída" : "Tarefa movimentada", message: `${task.title} foi movida para ${status}.` });
  }

  return <div className="page-grid workflow-page">
    <div className="kpi-row">
      <Panel className="stat-panel"><ListChecks/><strong>{state.tasks.length}</strong><span>tarefas totais</span></Panel>
      <Panel className="stat-panel"><Clock3/><strong>{state.tasks.filter((t) => ["Pendente", "Triagem", "Em produção", "Revisão"].includes(t.status)).length}</strong><span>em execução</span></Panel>
      <Panel className="stat-panel"><TimerReset/><strong>{state.tasks.filter((t) => t.status === "Atrasada" || (t.due < todayIso() && t.status !== "Concluída")).length}</strong><span>atrasadas/SLA</span></Panel>
      <Panel className="stat-panel"><CheckCircle2/><strong>{state.tasks.filter((t) => t.status === "Concluída").length}</strong><span>concluídas</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="Command center de workflow jurídico" subtitle="Delegação por hierarquia: Admin Master/Admin controla o escritório; advogado controla tarefas repassadas a estagiários e auxiliares." action={canCreate ? <Button onClick={() => setEditing(blankTask(state.clients[0]?.name ?? "", state.processes[0]?.id ?? "", profile?.id ?? ""))}><Plus size={16}/> Nova ação</Button> : undefined} />
      <div className="workflow-principles">
        <span><ShieldCheckIcon/> Menor privilégio e módulos sensíveis isolados</span>
        <span><ShieldCheckIcon/> Tarefa nasce do processo, recebe responsável, revisor, SLA e etapa</span>
        <span><ShieldCheckIcon/> Cliente conversa pelo portal sem ver estratégia interna</span>
      </div>
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa, cliente, responsável, status, setor ou prioridade" /></div>
    </Panel>
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
    <div className="kanban task-kanban">
      {columns.map((status) => <div className="kanban-col" key={status}><h3>{status}</h3>{filtered.filter((t) => t.status === status).map((task) => <div className="kanban-card floating-card" key={task.id}>
        <strong>{task.title}</strong>
        <small>{task.client} · {task.sector}</small>
        <p>{task.description || "Sem descrição detalhada."}</p>
        <p>Resp.: {getEmployeeName(state, task.responsible)} · Revisor: {getEmployeeName(state, task.reviewer)}</p>
        <p>Prazo: {task.due} · {task.estimatedHours}h estimadas · SLA {task.slaHours ?? 24}h</p>
        <div className="card-tags"><StatusBadge tone={statusTone(task.priority)}>{task.priority}</StatusBadge><StatusBadge tone="blue">{task.workflowStage ?? "Triagem"}</StatusBadge>{task.blockers?.length ? <StatusBadge tone="red">Bloqueio</StatusBadge> : null}</div>
        <ActionBar>
          {canUpdate && task.status !== "Concluída" && <Button variant="ghost" onClick={() => move(task, status === "Pendente" ? "Triagem" : status === "Triagem" ? "Em produção" : status === "Em produção" ? "Revisão" : "Concluída")}>Avançar</Button>}
          {canUpdate && <Button variant="ghost" onClick={() => setEditing(task)}><Edit3 size={15}/> Editar</Button>}
          {canUpdate && <Button variant="danger" onClick={() => deleteTask(task)}><Trash2 size={15}/></Button>}
        </ActionBar>
      </div>)}</div>)}
    </div>
    {editing && <EntityFormModal<Task> open={!!editing} title={state.tasks.some((item) => item.id === editing.id) ? "Editar tarefa" : "Nova ação / tarefa"} subtitle="Atualize processo, responsável, delegação, etapa, prioridade, SLA e horas." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveTask} />}
  </div>;
}

function ShieldCheckIcon() {
  return <UsersRound size={15} />;
}
