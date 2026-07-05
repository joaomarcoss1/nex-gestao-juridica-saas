import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Edit3, Plus, Search, Trash2 } from "lucide-react";
import type { Deadline, FeaturePageProps, Task } from "@/types/app";
import { ActionBar, Button, Panel, PanelTitle, StatusBadge, Kpi } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, todayIso, uid } from "@/utils/format";
import { calculateDeadline } from "@/services/deadlineCalculator.service";

const statuses: Deadline["status"][] = ["Pendente", "Concluído", "Atrasado", "Cancelado"];
const priorities: Deadline["priority"][] = ["Baixa", "Média", "Alta", "Urgente", "Crítica"];
const countTypes: Deadline["countType"][] = ["Dias úteis", "Dias corridos"];

function blankDeadline(client: string, processId: string): Deadline {
  const start = todayIso();
  return { id: uid("prazo"), processId, client, responsible: "00000000-0000-4000-8000-0000000000e2", type: "Prazo processual", publicationDate: start, awarenessDate: start, startDate: start, days: 5, countType: "Dias úteis", dueDate: calculateDeadline(start, 5, "Dias úteis"), fatal: true, priority: "Alta", status: "Pendente", notes: "Validar prazo conforme tribunal competente." };
}

export function PrazosPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return state.deadlines.filter((d) => !d.archivedAt && [d.type, d.client, d.status, d.priority, d.dueDate, d.notes].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [query, state.deadlines]);
  const fields: FieldConfig<Deadline>[] = [
    { key: "type", label: "Tipo de prazo", required: true },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo", kind: "select", options: state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` })) },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "publicationDate", label: "Data de publicação", kind: "date" },
    { key: "awarenessDate", label: "Data de ciência", kind: "date" },
    { key: "startDate", label: "Data inicial", kind: "date" },
    { key: "days", label: "Quantidade de dias", kind: "number" },
    { key: "countType", label: "Tipo de contagem", kind: "select", options: countTypes },
    { key: "dueDate", label: "Data final", kind: "date" },
    { key: "priority", label: "Prioridade", kind: "select", options: priorities },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "proof", label: "Comprovante/observação de baixa" },
    { key: "notes", label: "Observações", kind: "textarea" },
  ];
  async function save(deadline: Deadline) {
    const computed = { ...deadline, dueDate: calculateDeadline(deadline.startDate || deadline.awarenessDate || deadline.publicationDate, Number(deadline.days || 0), deadline.countType) };
    const isNew = !state.deadlines.some((d) => d.id === computed.id);
    await commit("deadlines", computed, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Prazo criado" : "Prazo atualizado", message: "Controle salvo com auditoria e vínculo processual." });
  }
  async function complete(deadline: Deadline) {
    await commit("deadlines", { ...deadline, status: "Concluído", proof: deadline.proof || "Baixa registrada pelo sistema" }, "update");
    const task: Task = { id: uid("task"), title: `Baixa de prazo: ${deadline.type}`, processId: deadline.processId, client: deadline.client, clientId: deadline.clientId, responsible: deadline.responsible, sector: "Controladoria", priority: "Média", status: "Concluída", due: todayIso(), estimatedHours: 0.25, spentHours: 0.25 };
    await commit("tasks", task);
    notify({ tone: "success", title: "Prazo concluído", message: "Tarefa de baixa criada automaticamente." });
  }
  async function deleteDeadline(deadline: Deadline) {
    if (!confirm(`Excluir definitivamente o prazo ${deadline.type}?`)) return;
    await remove("deadlines", deadline.id);
    notify({ tone: "info", title: "Prazo removido" });
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={CalendarClock} label="Prazos ativos" value={filtered.length} note="controle jurídico" tone="blue"/><Kpi icon={AlertTriangle} label="Críticos" value={filtered.filter((d)=>d.priority==='Crítica'||d.fatal).length} note="prazo fatal" tone="red"/><Kpi icon={CheckCircle2} label="Concluídos" value={state.deadlines.filter((d)=>d.status==='Concluído').length} note="com baixa" tone="green"/></div>
    <Panel><PanelTitle title="Prazos jurídicos editáveis" subtitle="Contagem gerencial com dias úteis, baixa, comprovante e alerta crítico." action={<Button onClick={() => setEditing(blankDeadline(state.clients[0]?.name ?? "", state.processes[0]?.id ?? ""))}><Plus size={16}/> Novo prazo</Button>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar prazo, cliente, prioridade ou status" /></div>
      <p className="legal-note">O cálculo de prazos é apoio gerencial. O advogado responsável deve validar conforme legislação, tribunal competente e regras processuais vigentes.</p>
    </Panel>
    <div className="responsive-table"><table><thead><tr><th>Prazo</th><th>Cliente</th><th>Final</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((d)=><tr key={d.id}><td>{d.type}<small>{d.countType} · {d.days} dias</small></td><td>{d.client}</td><td>{d.dueDate}</td><td><StatusBadge tone={statusTone(d.priority)}>{d.priority}{d.fatal ? " · Fatal" : ""}</StatusBadge></td><td><StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge></td><td><ActionBar>{d.status!=="Concluído" && <Button variant="ghost" onClick={()=>complete(d)}>Baixar</Button>}<Button variant="ghost" onClick={()=>setEditing(d)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={()=>deleteDeadline(d)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    {editing && <EntityFormModal<Deadline> open={!!editing} title={state.deadlines.some((d)=>d.id===editing.id)?"Editar prazo":"Novo prazo"} subtitle="Atualize datas, prioridade, responsável, status e comprovante." value={editing} fields={fields} onClose={()=>setEditing(null)} onSave={save} />}
  </div>;
}
