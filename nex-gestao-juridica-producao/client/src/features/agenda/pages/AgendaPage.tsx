import { CalendarDays, Clock3, Gavel, MapPin, TimerReset } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { statusTone, todayIso } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";

function daysUntil(date: string) {
  if (!date) return 999;
  const now = new Date(`${todayIso()}T00:00:00`).getTime();
  const due = new Date(`${date.slice(0, 10)}T00:00:00`).getTime();
  return Math.ceil((due - now) / 86400000);
}

export function AgendaPage({ state }: FeaturePageProps) {
  const deadlines = state.deadlines.filter((deadline) => deadline.status !== "Concluído").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tasks = state.tasks.filter((task) => task.status !== "Concluída").sort((a, b) => a.due.localeCompare(b.due));
  const hearings = state.hearings.sort((a, b) => a.hearingAt.localeCompare(b.hearingAt));
  const weekly = [...deadlines.map((d) => d.dueDate), ...tasks.map((t) => t.due), ...hearings.map((h) => h.hearingAt.slice(0,10))].filter((d) => daysUntil(d) >= 0 && daysUntil(d) <= 7).length;

  return <div className="page-grid agenda-page">
    <div className="kpi-row">
      <Kpi icon={CalendarDays} label="Compromissos da semana" value={weekly} note="prazos, tarefas e audiências" tone="blue" />
      <Kpi icon={TimerReset} label="Prazos fatais" value={deadlines.filter((d) => d.fatal).length} note="controle processual" tone="red" />
      <Kpi icon={Gavel} label="Audiências" value={hearings.length} note="agenda jurídica" tone="gold" />
      <Kpi icon={Clock3} label="Tarefas no prazo" value={tasks.filter((t) => daysUntil(t.due) >= 0).length} note="fila operacional" tone="green" />
    </div>
    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Central de prazos e agenda" subtitle="Visualização operacional por data fatal, data interna, responsável, cliente e prioridade." />
        <div className="timeline-list">
          {deadlines.slice(0, 12).map((deadline) => <article key={deadline.id} className="timeline-item">
            <span className="timeline-date">{deadline.dueDate}</span>
            <div><strong>{deadline.type}</strong><small>{deadline.client} · {getEmployeeName(state, deadline.responsible)} · {deadline.countType}</small></div>
            <StatusBadge tone={deadline.fatal ? "red" : statusTone(deadline.priority)}>{deadline.fatal ? "Fatal" : deadline.priority}</StatusBadge>
          </article>)}
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Audiências e reuniões" subtitle="Compromissos jurídicos, administrativos e externos." />
        <div className="stack-list">
          {hearings.length ? hearings.map((hearing) => <div className="data-card" key={hearing.id}>
            <strong>{hearing.title}</strong>
            <small>{new Date(hearing.hearingAt).toLocaleString("pt-BR")} · {hearing.client}</small>
            <small><MapPin size={13}/> {hearing.location || hearing.link || "Local a confirmar"}</small>
            <StatusBadge tone={statusTone(hearing.status)}>{hearing.status}</StatusBadge>
          </div>) : <div className="empty-soft">Nenhuma audiência registrada no momento.</div>}
        </div>
      </Panel>
    </div>
    <Panel>
      <PanelTitle title="Agenda de produção da equipe" subtitle="Tarefas internas com SLA, revisor e prioridade." />
      <div className="responsive-table"><table><thead><tr><th>Data</th><th>Atividade</th><th>Cliente</th><th>Responsável</th><th>Status</th><th>SLA</th></tr></thead><tbody>{tasks.slice(0, 12).map((task) => <tr key={task.id}><td>{task.due}</td><td>{task.title}</td><td>{task.client}</td><td>{getEmployeeName(state, task.responsible)}</td><td><StatusBadge tone={statusTone(task.status)}>{task.status}</StatusBadge></td><td>{task.slaHours ?? 24}h</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}
