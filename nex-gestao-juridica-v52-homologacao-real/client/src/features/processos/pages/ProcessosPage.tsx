
import { useMemo, useState } from "react";
import { Activity, AlarmClock, Archive, BriefcaseBusiness, ClipboardCheck, Edit3, FileText, Link2, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import type { FeaturePageProps, Process } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";
import { requestConfirmation } from "@/services/dialog.service";

const areas = ["Civil", "Família e Sucessões", "Previdenciário", "Trabalhista", "Empresarial", "Tributário", "Penal", "Administrativo", "Consumidor", "Imobiliário", "Agrário/Rural", "Médico/Saúde", "Digital/LGPD", "Ambiental", "Outro"];
const phases = ["Atendimento inicial", "Análise documental", "Proposta", "Contrato", "Petição inicial", "Distribuição", "Citação", "Contestação", "Réplica", "Instrução", "Audiência", "Sentença", "Recurso", "Execução", "Encerramento"];
const statuses = ["Controle local", "Em análise", "Ativo", "Aguardando cliente", "Aguardando tribunal", "Movimentação importada", "Suspenso", "Encerrado", "Arquivado"];
const risks: Process["risk"][] = ["Baixo", "Médio", "Alto"];

function addDays(days: number) {
  return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10);
}

function blankProcess(client: string): Process {
  return { id: uid("process"), cnj: "", type: "Judicial", client, opposite: "", activePole: client, passivePole: "", subject: "", area: "Civil", court: "TJMA", courtDivision: "", district: "", state: "MA", class: "Serviço jurídico", phase: "Atendimento inicial", status: "Controle local", risk: "Médio", successChance: 60, value: 0, fees: 0, costs: 0, responsible: "", nextDeadline: addDays(7), lastMoveDays: 0, progress: 10, checklist: ["Procuração", "Contrato de honorários", "Documentos iniciais"], timeline: [`${todayIso()} · Processo criado no controle local`] };
}

function integrationHealth(process: Process) {
  if (!process.cnj) return { tone: "neutral" as const, label: "Local", note: "Sem CNJ. Controle interno/local." };
  if (process.lastMoveDays >= 60) return { tone: "red" as const, label: "Atenção", note: `${process.lastMoveDays} dias sem movimentação.` };
  if (process.status === "Aguardando tribunal") return { tone: "gold" as const, label: "Aguardando", note: "Monitorar tribunal e publicações." };
  return { tone: "green" as const, label: "Monitorado", note: "Preparado para acompanhamento judicial." };
}

export function ProcessosPage({ state, commit, remove, executeAtomic, notify, setPage }: FeaturePageProps) {
  const [editing, setEditing] = useState<Process | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"todos" | "local" | "integrados" | "risco">("todos");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.processes.filter((process) => {
      const byMode = mode === "todos" ? true : mode === "local" ? !process.cnj : mode === "integrados" ? Boolean(process.cnj) : process.risk === "Alto" || process.lastMoveDays > 60;
      const byQuery = [process.cnj, process.client, process.opposite, process.area, process.court, process.phase, process.status, process.risk, process.subject].some((value) => String(value ?? "").toLowerCase().includes(normalized));
      return byMode && byQuery;
    });
  }, [query, state.processes, mode]);

  const processFields: FieldConfig<Process>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["Judicial", "Administrativo", "Extrajudicial", "Consultivo", "Contrato", "Acordo", "Serviço avulso"] },
    { key: "cnj", label: "Número CNJ / protocolo" },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name), required: true },
    { key: "opposite", label: "Parte contrária" },
    { key: "activePole", label: "Polo ativo" },
    { key: "passivePole", label: "Polo passivo" },
    { key: "subject", label: "Assunto" },
    { key: "area", label: "Área do direito", kind: "select", options: areas },
    { key: "court", label: "Tribunal / órgão", kind: "select", options: ["Controle local", "TJMA", "TRT 16ª Região", "TRF1", "STJ", "STF", "PJe", "e-SAJ", "Projudi", "Órgão administrativo"] },
    { key: "courtDivision", label: "Vara / divisão" },
    { key: "district", label: "Comarca" },
    { key: "state", label: "Estado" },
    { key: "class", label: "Classe / tipo do serviço" },
    { key: "phase", label: "Fase", kind: "select", options: phases },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "risk", label: "Risco", kind: "select", options: risks },
    { key: "successChance", label: "Chance de êxito (%)", kind: "number", min: 0, max: 100 },
    { key: "value", label: "Valor da causa", kind: "number" },
    { key: "fees", label: "Honorários", kind: "number" },
    { key: "costs", label: "Custas/despesas", kind: "number" },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: e.name })) },
    { key: "nextDeadline", label: "Próximo prazo", kind: "date" },
    { key: "lastMoveDays", label: "Dias sem movimentação", kind: "number" },
    { key: "progress", label: "Progresso (%)", kind: "number", min: 0, max: 100 },
    { key: "clientVisibleSummary", label: "Resumo visível ao cliente", kind: "textarea" },
    { key: "internalStrategy", label: "Estratégia interna", kind: "textarea" },
  ];

  async function saveProcess(process: Process) {
    const isNew = !state.processes.some((item) => item.id === process.id);
    const next: Process = { ...process, clientId: process.clientId || state.clients.find((client) => client.name === process.client)?.id, responsibleId: process.responsible, version: (process.version ?? 0) + 1, timeline: process.timeline?.length ? process.timeline : [`${todayIso()} · Cadastro iniciado no controle local`] };
    if (isNew) {
      const template = state.workflowTemplates.find((item) => item.active && (item.moduleArea === process.area || item.moduleArea === "Geral"));
      await executeAtomic({ type: "createProcess", process: next, startWorkflowTemplateId: template?.id, idempotencyKey: `process:create:${next.id}` });
    } else await commit("processes", next, "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Processo criado" : "Processo atualizado", message: isNew ? "Processo, movimentação e workflow inicial foram confirmados de forma atômica." : "Todos os campos do processo foram persistidos." });
  }

  async function deleteProcess(process: Process) {
    if (!await requestConfirmation("Arquivar processo", `O processo/serviço de ${process.client} será arquivado e continuará no histórico. Deseja continuar?`)) return;
    await remove("processes", process.id);
    notify({ tone: "info", title: "Processo removido" });
  }

  async function advance(process: Process) {
    const nextPhase = phases[Math.min(phases.length - 1, phases.indexOf(process.phase) + 1)] || "Análise documental";
    await executeAtomic({ type: "changeProcessPhase", processId: process.id, newPhase: nextPhase, reason: "Avanço manual validado pela tela de processos.", idempotencyKey: `process:phase:${process.id}:${nextPhase}:${process.version ?? 0}`, expectedVersion: process.version });
    notify({ tone: "info", title: "Fase atualizada", message: `Processo movido para ${nextPhase}, com histórico persistente.` });
  }

  async function simulateJudiciarySync(process: Process) {
    if (!process.cnj) { notify({ tone: "error", title: "CNJ obrigatório", message: "Informe o CNJ antes de executar a simulação." }); return; }
    await executeAtomic({ type: "simulateJudicialSync", processId: process.id, idempotencyKey: `judicial-simulation:${process.id}:${todayIso()}` });
    notify({ tone: "info", title: "Simulação registrada", message: "Nenhuma API de tribunal foi consultada. A movimentação foi identificada explicitamente como simulação." });
  }

  return <div className="page-grid process-page-v48">
    <div className="kpi-row">
      <Kpi icon={BriefcaseBusiness} label="Processos/casos" value={state.processes.length} note="local + judicial" tone="blue" />
      <Kpi icon={AlarmClock} label="Prazos críticos" value={state.processes.filter((p) => p.nextDeadline <= todayIso()).length} note="vence hoje/atrasado" tone="red" />
      <Kpi icon={Archive} label="Sem movimento" value={state.processes.filter((p) => p.lastMoveDays >= 30).length} note="controle local" tone="gold" />
      <Kpi icon={Link2} label="Com CNJ" value={state.processes.filter((p) => p.cnj).length} note="com acompanhamento judicial" tone="green" />
    </div>
    <Panel className="process-command-panel">
      <PanelTitle title="Acompanhamento de processos local e judicial" subtitle="Controle interno robusto, CNJ, movimentações, prazos, timeline, portal do cliente e tarefas automáticas." action={<Button onClick={() => setEditing(blankProcess(state.clients[0]?.name ?? ""))}><Plus size={16}/> Novo processo</Button>} />
      <div className="module-tabs"><button className={mode === "todos" ? "active" : ""} onClick={() => setMode("todos")}>Todos</button><button className={mode === "local" ? "active" : ""} onClick={() => setMode("local")}>Controle local</button><button className={mode === "integrados" ? "active" : ""} onClick={() => setMode("integrados")}>Com CNJ</button><button className={mode === "risco" ? "active" : ""} onClick={() => setMode("risco")}>Risco/Parados</button></div>
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por CNJ, cliente, parte, área, fase, tribunal, risco ou assunto" /></div>
    </Panel>
    <Panel>
      <PanelTitle title="Monitoramento judicial" subtitle="Acompanhe CNJ, movimentações, prazos e publicações em uma rotina operacional padronizada para a equipe." />
      <div className="judicial-monitor-grid">
        {["PJe", "e-SAJ", "Projudi", "TRT/TRF", "Diários/Publicações"].map((item) => <div key={item}><Activity size={17}/><strong>{item}</strong><span>Aguardando ativação do monitoramento</span></div>)}
      </div>
    </Panel>
    <div className="process-grid process-grid-v48">
      {filtered.map((process) => {
        const health = integrationHealth(process);
        return <article className="process-card floating-card" key={process.id}>
          <div className="card-top"><StatusBadge tone={statusTone(process.risk)}>{process.risk}</StatusBadge><StatusBadge tone={statusTone(process.status)}>{process.status}</StatusBadge><StatusBadge tone={health.tone}>{health.label}</StatusBadge></div>
          <h3>{process.client}</h3>
          <small>{process.cnj || "Controle local sem CNJ"} · {process.court || "Tribunal a definir"}</small>
          <p>{process.area} contra {process.opposite || "parte contrária não informada"}</p>
          <ProgressBar value={process.progress} color={process.risk === "Alto" ? "red" : process.risk === "Médio" ? "gold" : "green"} />
          <div className="metrics-line"><span>Fase: <b>{process.phase}</b></span><span>Resp.: <b>{getEmployeeName(state, process.responsible)}</b></span></div>
          <div className="metrics-line"><span>Causa: <b>{money(process.value)}</b></span><span>Honorários: <b>{money(process.fees)}</b></span></div>
          <p className="muted-text">{health.note}</p>
          <div className="timeline-mini">{(process.timeline ?? []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
          <ActionBar><Button variant="ghost" onClick={() => { history.pushState({}, "", `/processos/${process.id}`); dispatchEvent(new Event("popstate")); }}>Ver processo</Button><Button variant="ghost" onClick={() => advance(process)}>Avançar fase</Button><Button variant="gold" onClick={() => simulateJudiciarySync(process)}><RefreshCcw size={15}/> Sincronizar</Button><Button variant="ghost" onClick={() => setEditing(process)}><Edit3 size={15}/> Editar</Button><Button variant="ghost" onClick={() => setPage("documentos")}><ClipboardCheck size={15}/> Docs</Button><Button variant="danger" onClick={() => deleteProcess(process)}><Trash2 size={15}/></Button></ActionBar>
        </article>;
      })}
    </div>
    {editing && <EntityFormModal<Process> open={!!editing} title={state.processes.some((item) => item.id === editing.id) ? "Editar processo" : "Novo processo / serviço"} subtitle="Controle local, CNJ, tribunal, fase, risco, valores, resumo ao cliente e estratégia interna." value={editing} fields={processFields} onClose={() => setEditing(null)} onSave={saveProcess} />}
  </div>;
}
