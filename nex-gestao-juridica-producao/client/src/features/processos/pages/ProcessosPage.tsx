import { useMemo, useState } from "react";
import { AlarmClock, Archive, BriefcaseBusiness, ClipboardCheck, Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import type { AutomationRun, FeaturePageProps, Process, Task } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";

const areas = ["Cível", "Criminal", "Trabalhista", "Família", "Consumidor", "Empresarial", "Previdenciário", "Tributário", "Administrativo", "Imobiliário", "Bancário", "Digital", "Outro"];
const phases = ["Atendimento inicial", "Análise documental", "Proposta", "Contrato", "Petição inicial", "Distribuição", "Contestação", "Audiência", "Sentença", "Recurso", "Execução", "Encerramento"];
const statuses = ["Em análise", "Ativo", "Aguardando cliente", "Aguardando tribunal", "Suspenso", "Encerrado", "Arquivado"];
const risks: Process["risk"][] = ["Baixo", "Médio", "Alto"];

function blankProcess(client: string): Process {
  return { id: uid("process"), cnj: "", client, opposite: "", area: "Cível", court: "", class: "Serviço jurídico", phase: "Atendimento inicial", status: "Em análise", risk: "Médio", successChance: 60, value: 0, fees: 0, responsible: "e1", nextDeadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10), lastMoveDays: 0, progress: 10 };
}

export function ProcessosPage({ state, commit, remove, notify, setPage }: FeaturePageProps) {
  const [editing, setEditing] = useState<Process | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.processes.filter((process) => [process.cnj, process.client, process.opposite, process.area, process.court, process.phase, process.status, process.risk].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.processes]);

  const processFields: FieldConfig<Process>[] = [
    { key: "cnj", label: "Número CNJ" },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name), required: true },
    { key: "opposite", label: "Parte contrária" },
    { key: "area", label: "Área do direito", kind: "select", options: areas },
    { key: "court", label: "Tribunal / órgão" },
    { key: "class", label: "Classe / tipo do serviço" },
    { key: "phase", label: "Fase", kind: "select", options: phases },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "risk", label: "Risco", kind: "select", options: risks },
    { key: "successChance", label: "Chance de êxito (%)", kind: "number", min: 0, max: 100 },
    { key: "value", label: "Valor da causa", kind: "number" },
    { key: "fees", label: "Honorários", kind: "number" },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "nextDeadline", label: "Próximo prazo", kind: "date" },
    { key: "lastMoveDays", label: "Dias sem movimentação", kind: "number" },
    { key: "progress", label: "Progresso (%)", kind: "number", min: 0, max: 100 },
  ];

  async function saveProcess(process: Process) {
    const isNew = !state.processes.some((item) => item.id === process.id);
    await commit("processes", process, isNew ? "create" : "update");
    if (isNew) {
      const task: Task = { id: uid("task"), title: `Checklist inicial - ${process.client}`, processId: process.id, client: process.client, responsible: process.responsible, sector: "Controladoria", priority: "Alta", status: "Pendente", due: process.nextDeadline, estimatedHours: 2, spentHours: 0, checklist: ["Documentos", "Contrato", "Análise de risco"] };
      const run: AutomationRun = { id: uid("run"), ruleId: "processo-criado", ruleName: "Novo processo gera operação inicial", result: `Checklist e tarefa criados para ${process.client}`, date: todayIso(), status: "Sucesso" };
      await commit("tasks", task);
      await commit("automationRuns", run);
    }
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Processo criado" : "Processo atualizado", message: isNew ? "Workflow inicial e automação foram executados." : "Dados do processo salvos." });
  }

  async function deleteProcess(process: Process) {
    if (!confirm(`Excluir o processo/serviço de ${process.client}?`)) return;
    await remove("processes", process.id);
    notify({ tone: "info", title: "Processo removido" });
  }

  async function advance(process: Process) {
    const nextPhase = phases[Math.min(phases.length - 1, phases.indexOf(process.phase) + 1)] || "Análise documental";
    await commit("processes", { ...process, phase: nextPhase, progress: Math.min(100, process.progress + 12), lastMoveDays: 0 }, "update");
    await commit("automationRuns", { id: uid("run"), ruleId: "fase-processo", ruleName: "Mudança de fase gera histórico", result: `${process.client}: fase alterada para ${nextPhase}`, date: todayIso(), status: "Sucesso" });
    notify({ tone: "info", title: "Fase atualizada", message: `Processo movido para ${nextPhase}.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><BriefcaseBusiness /><strong>{state.processes.length}</strong><span>processos e serviços</span></Panel>
      <Panel className="stat-panel"><AlarmClock /><strong>{state.processes.filter((p) => p.nextDeadline <= todayIso()).length}</strong><span>prazos críticos</span></Panel>
      <Panel className="stat-panel"><Archive /><strong>{state.processes.filter((p) => p.lastMoveDays >= 30).length}</strong><span>sem movimentação</span></Panel>
      <Panel className="stat-panel"><FileText /><strong>{state.documents.length}</strong><span>documentos vinculados</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="Processos e controladoria" subtitle="Cadastro completo, edição de todos os campos, workflow e automações internas." action={<Button onClick={() => setEditing(blankProcess(state.clients[0]?.name ?? ""))}><Plus size={16}/> Novo processo</Button>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por CNJ, cliente, área, fase, tribunal ou risco" /></div>
    </Panel>
    <div className="process-grid">
      {filtered.map((process) => <article className="process-card floating-card" key={process.id}>
        <div className="card-top"><StatusBadge tone={statusTone(process.risk)}>{process.risk}</StatusBadge><StatusBadge tone={statusTone(process.status)}>{process.status}</StatusBadge></div>
        <h3>{process.client}</h3>
        <small>{process.cnj || "CNJ não informado"} · {process.court || "Tribunal a definir"}</small>
        <p>{process.area} contra {process.opposite || "parte contrária não informada"}</p>
        <ProgressBar value={process.progress} color={process.risk === "Alto" ? "red" : process.risk === "Médio" ? "gold" : "green"} />
        <div className="metrics-line"><span>Fase: <b>{process.phase}</b></span><span>Êxito: <b>{process.successChance}%</b></span></div>
        <div className="metrics-line"><span>Causa: <b>{money(process.value)}</b></span><span>Honorários: <b>{money(process.fees)}</b></span></div>
        <ActionBar><Button variant="ghost" onClick={() => advance(process)}>Avançar fase</Button><Button variant="ghost" onClick={() => setEditing(process)}><Edit3 size={15}/> Editar</Button><Button variant="ghost" onClick={() => setPage("documentos")}><ClipboardCheck size={15}/> Docs</Button><Button variant="danger" onClick={() => deleteProcess(process)}><Trash2 size={15}/></Button></ActionBar>
      </article>)}
    </div>
    {editing && <EntityFormModal<Process> open={!!editing} title={state.processes.some((item) => item.id === editing.id) ? "Editar processo" : "Novo processo / serviço"} subtitle="Todos os dados do processo ficam editáveis e são persistidos." value={editing} fields={processFields} onClose={() => setEditing(null)} onSave={saveProcess} />}
  </div>;
}
