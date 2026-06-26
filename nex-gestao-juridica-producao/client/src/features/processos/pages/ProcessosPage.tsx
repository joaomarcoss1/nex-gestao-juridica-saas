import { useState } from "react";
import { AlarmClock, Archive, BriefcaseBusiness, ClipboardCheck, FileText, Plus } from "lucide-react";
import type { FeaturePageProps, Process, Task } from "@/types/app";
import { Button, Field, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone, uid } from "@/utils/format";

export function ProcessosPage({ state, commit, notify, setPage }: FeaturePageProps) {
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [area, setArea] = useState("Cível");

  async function addProcess() {
    const process: Process = { id: uid("process"), cnj: "Novo cadastro", client, opposite: "Parte contrária", area, court: "A definir", class: "Serviço jurídico", phase: "Atendimento inicial", status: "Em análise", risk: "Médio", successChance: 60, value: 0, fees: 0, responsible: "e1", nextDeadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10), lastMoveDays: 0, progress: 10 };
    const task: Task = { id: uid("task"), title: `Checklist inicial - ${client}`, processId: process.id, client, responsible: "e1", sector: "Controladoria", priority: "Alta", status: "Pendente", due: process.nextDeadline, estimatedHours: 2, spentHours: 0, checklist: ["Documentos", "Contrato", "Análise de risco"] };
    await commit("processes", process);
    await commit("tasks", task);
    notify({ tone: "success", title: "Processo criado", message: "Workflow inicial e tarefa foram gerados automaticamente." });
  }

  async function advance(process: Process) {
    const phases = ["Atendimento inicial", "Análise documental", "Proposta", "Contrato", "Petição inicial", "Distribuição", "Contestação", "Audiência", "Sentença", "Recurso", "Execução", "Encerramento"];
    const nextPhase = phases[Math.min(phases.length - 1, phases.indexOf(process.phase) + 1)] || "Análise documental";
    await commit("processes", { ...process, phase: nextPhase, progress: Math.min(100, process.progress + 12), lastMoveDays: 0 }, "update");
    notify({ tone: "info", title: "Fase atualizada", message: `Processo movido para ${nextPhase}.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><BriefcaseBusiness /><strong>{state.processes.length}</strong><span>processos e serviços</span></Panel>
      <Panel className="stat-panel"><AlarmClock /><strong>{state.processes.filter((p) => p.nextDeadline <= new Date().toISOString().slice(0, 10)).length}</strong><span>prazos críticos</span></Panel>
      <Panel className="stat-panel"><Archive /><strong>{state.processes.filter((p) => p.lastMoveDays >= 30).length}</strong><span>sem movimentação</span></Panel>
      <Panel className="stat-panel"><FileText /><strong>{state.documents.length}</strong><span>documentos vinculados</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="Novo processo / serviço" subtitle="Ao criar, o sistema gera checklist, tarefa e log de controladoria." />
      <div className="quick-form">
        <Field label="Cliente"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Área"><select value={area} onChange={(e) => setArea(e.target.value)}>{["Cível", "Criminal", "Trabalhista", "Família", "Consumidor", "Empresarial", "Tributário"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Button onClick={addProcess}><Plus size={16}/> Criar com workflow</Button>
      </div>
    </Panel>
    <div className="process-grid">
      {state.processes.map((process) => <article className="process-card floating-card" key={process.id}>
        <div className="card-top"><StatusBadge tone={statusTone(process.risk)}>{process.risk}</StatusBadge><StatusBadge tone={statusTone(process.status)}>{process.status}</StatusBadge></div>
        <h3>{process.client}</h3>
        <small>{process.cnj} · {process.court}</small>
        <p>{process.area} contra {process.opposite}</p>
        <ProgressBar value={process.progress} color={process.risk === "Alto" ? "red" : process.risk === "Médio" ? "gold" : "green"} />
        <div className="metrics-line"><span>Fase: <b>{process.phase}</b></span><span>Êxito: <b>{process.successChance}%</b></span></div>
        <div className="metrics-line"><span>Causa: <b>{money(process.value)}</b></span><span>Honorários: <b>{money(process.fees)}</b></span></div>
        <div className="row-actions"><Button variant="ghost" onClick={() => advance(process)}>Avançar fase</Button><Button variant="ghost" onClick={() => setPage("documentos")}><ClipboardCheck size={15}/> Docs</Button></div>
      </article>)}
    </div>
  </div>;
}
