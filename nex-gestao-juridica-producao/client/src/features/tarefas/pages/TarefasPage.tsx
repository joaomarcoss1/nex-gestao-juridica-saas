import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Edit3, ListChecks, Plus, Search, TimerReset, Trash2 } from "lucide-react";
import type { FeaturePageProps, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, uid } from "@/utils/format";

const statuses: Task["status"][] = ["Pendente", "Em andamento", "Aguardando cliente", "Aguardando tribunal", "Concluída", "Atrasada", "Cancelada"];
const priorities: Task["priority"][] = ["Baixa", "Média", "Alta", "Urgente", "Crítica"];

function blankTask(client: string, processId: string): Task {
  return { id: uid("task"), title: "", client, processId, responsible: "e1", sector: "Advocacia", priority: "Média", status: "Pendente", due: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), estimatedHours: 1, spentHours: 0, checklist: [] };
}

export function TarefasPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.tasks.filter((task) => [task.title, task.client, task.sector, task.priority, task.status, task.due].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.tasks]);

  const fields: FieldConfig<Task>[] = [
    { key: "title", label: "Título da tarefa", required: true },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "sector", label: "Setor" },
    { key: "priority", label: "Prioridade", kind: "select", options: priorities },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "due", label: "Prazo", kind: "date" },
    { key: "estimatedHours", label: "Horas estimadas", kind: "number", step: 0.25 },
    { key: "spentHours", label: "Horas gastas", kind: "number", step: 0.25 },
  ];

  async function saveTask(task: Task) {
    const isNew = !state.tasks.some((item) => item.id === task.id);
    await commit("tasks", task, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Tarefa criada" : "Tarefa atualizada", message: "Workflow salvo e disponível no dashboard." });
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Excluir a tarefa ${task.title}?`)) return;
    await remove("tasks", task.id);
    notify({ tone: "info", title: "Tarefa removida" });
  }

  async function complete(task: Task) {
    await commit("tasks", { ...task, status: "Concluída", spentHours: Math.max(task.spentHours, task.estimatedHours) }, "update");
    notify({ tone: "success", title: "Tarefa concluída" });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><ListChecks/><strong>{state.tasks.length}</strong><span>tarefas totais</span></Panel>
      <Panel className="stat-panel"><Clock3/><strong>{state.tasks.filter((t) => t.status === "Pendente").length}</strong><span>pendentes</span></Panel>
      <Panel className="stat-panel"><TimerReset/><strong>{state.tasks.filter((t) => t.status === "Atrasada").length}</strong><span>atrasadas</span></Panel>
      <Panel className="stat-panel"><CheckCircle2/><strong>{state.tasks.filter((t) => t.status === "Concluída").length}</strong><span>concluídas</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="Workflow operacional editável" subtitle="Crie, edite, conclua, filtre e exclua tarefas com vínculo a cliente/processo." action={<Button onClick={() => setEditing(blankTask(state.clients[0]?.name ?? "", state.processes[0]?.id ?? ""))}><Plus size={16}/> Nova tarefa</Button>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa, cliente, status, setor ou prioridade" /></div>
    </Panel>
    <div className="kanban task-kanban">
      {statuses.filter((status) => ["Pendente", "Em andamento", "Aguardando cliente", "Atrasada", "Concluída"].includes(status)).map((status) => <div className="kanban-col" key={status}><h3>{status}</h3>{filtered.filter((t) => t.status === status).map((task) => <div className="kanban-card floating-card" key={task.id}><strong>{task.title}</strong><small>{task.client} · {task.sector}</small><p>Prazo: {task.due} · {task.estimatedHours}h estimadas</p><StatusBadge tone={statusTone(task.priority)}>{task.priority}</StatusBadge><ActionBar>{task.status !== "Concluída" && <Button variant="ghost" onClick={() => complete(task)}>Concluir</Button>}<Button variant="ghost" onClick={() => setEditing(task)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteTask(task)}><Trash2 size={15}/></Button></ActionBar></div>)}</div>)}
    </div>
    {editing && <EntityFormModal<Task> open={!!editing} title={state.tasks.some((item) => item.id === editing.id) ? "Editar tarefa" : "Nova tarefa"} subtitle="Atualize prazo, responsável, prioridade, status e horas." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveTask} />}
  </div>;
}
