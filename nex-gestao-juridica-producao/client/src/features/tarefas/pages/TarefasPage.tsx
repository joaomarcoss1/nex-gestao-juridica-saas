import { useState } from "react";
import { CheckCircle2, Clock3, ListChecks, Plus, TimerReset } from "lucide-react";
import type { FeaturePageProps, Task } from "@/types/app";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { statusTone, uid } from "@/utils/format";

export function TarefasPage({ state, commit, notify }: FeaturePageProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState(state.clients[0]?.name ?? "");

  async function addTask() {
    if (!title.trim()) return;
    const task: Task = { id: uid("task"), title, client, processId: state.processes.find((p) => p.client === client)?.id ?? "", responsible: "e1", sector: "Advocacia", priority: "Média", status: "Pendente", due: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), estimatedHours: 1, spentHours: 0, checklist: [] };
    await commit("tasks", task);
    setTitle("");
    notify({ tone: "success", title: "Tarefa criada", message: "Responsável e prazo foram registrados." });
  }

  async function complete(task: Task) {
    await commit("tasks", { ...task, status: "Concluída", spentHours: Math.max(task.spentHours, task.estimatedHours) }, "update");
    notify({ tone: "success", title: "Tarefa concluída" });
  }

  const columns = ["Pendente", "Em andamento", "Aguardando cliente", "Atrasada", "Concluída"] as const;
  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><ListChecks/><strong>{state.tasks.length}</strong><span>tarefas totais</span></Panel>
      <Panel className="stat-panel"><Clock3/><strong>{state.tasks.filter((t) => t.status === "Pendente").length}</strong><span>pendentes</span></Panel>
      <Panel className="stat-panel"><TimerReset/><strong>{state.tasks.filter((t) => t.status === "Atrasada").length}</strong><span>atrasadas</span></Panel>
      <Panel className="stat-panel"><CheckCircle2/><strong>{state.tasks.filter((t) => t.status === "Concluída").length}</strong><span>concluídas</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="Workflow operacional" subtitle="Tarefas salvas na tabela normalizada e vinculadas a cliente/processo." />
      <div className="quick-form"><Field label="Tarefa"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: preparar petição inicial" /></Field><Field label="Cliente"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field><Button onClick={addTask}><Plus size={16}/> Criar</Button></div>
      <div className="kanban task-kanban">
        {columns.map((status) => <div className="kanban-col" key={status}><h3>{status}</h3>{state.tasks.filter((t) => t.status === status).map((task) => <div className="kanban-card floating-card" key={task.id}><strong>{task.title}</strong><small>{task.client} · {task.sector}</small><p>Prazo: {task.due} · {task.estimatedHours}h estimadas</p><StatusBadge tone={statusTone(task.priority)}>{task.priority}</StatusBadge>{task.status !== "Concluída" && <div className="row-actions"><Button variant="ghost" onClick={() => complete(task)}>Concluir</Button></div>}</div>)}</div>)}
      </div>
    </Panel>
  </div>;
}
