import { useState } from "react";
import { Play, Plus, Workflow, Zap } from "lucide-react";
import type { AutomationRule, AutomationRun, FeaturePageProps } from "@/types/app";
import { Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { statusTone, todayIso, uid } from "@/utils/format";

export function AutomacoesPage({ state, commit, notify }: FeaturePageProps) {
  const [name, setName] = useState("");
  const [module, setModule] = useState<AutomationRule["module"]>("Processos");
  async function addRule() {
    if (!name.trim()) return;
    const rule: AutomationRule = { id: uid("auto"), name, module, trigger: "Evento configurável", actions: ["Criar tarefa", "Notificar responsável", "Gerar log"], status: "Ativa", lastRun: todayIso(), executions: 0, successRate: 100 };
    await commit("automations", rule);
    setName("");
    notify({ tone: "success", title: "Automação criada", message: "Regra salva para execução interna." });
  }
  async function testRule(rule: AutomationRule) {
    const run: AutomationRun = { id: uid("run"), ruleId: rule.id, ruleName: rule.name, result: `Teste executado: ${rule.actions.join(" + ")}`, date: todayIso(), status: "Sucesso" };
    await commit("automationRuns", run);
    await commit("automations", { ...rule, executions: rule.executions + 1, lastRun: todayIso(), successRate: Math.min(100, rule.successRate + 0.1) }, "update");
    notify({ tone: "success", title: "Automação testada", message: run.result });
  }
  async function toggle(rule: AutomationRule) {
    await commit("automations", { ...rule, status: rule.status === "Ativa" ? "Pausada" : "Ativa" }, "update");
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={Zap} label="Ativas" value={state.automations.filter((a) => a.status === "Ativa").length} note="regras operacionais" tone="green"/><Kpi icon={Workflow} label="Execuções" value={state.automationRuns.length} note="logs gravados" tone="blue"/><Kpi icon={Play} label="Taxa média" value={`${Math.round(state.automations.reduce((a,b)=>a+b.successRate,0)/Math.max(1,state.automations.length))}%`} note="sucesso operacional" tone="gold"/><Kpi icon={Plus} label="Módulos" value="6" note="CRM, processos, financeiro..." tone="purple"/></div>
    <Panel><PanelTitle title="Nova automação interna" subtitle="Gatilho + condição + ação, sem IA e com previsibilidade operacional."/><div className="quick-form"><Field label="Nome"><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex.: prazo vence em 3 dias"/></Field><Field label="Módulo"><select value={module} onChange={(e)=>setModule(e.target.value as AutomationRule["module"])}>{["Processos","Financeiro","Ponto","Documentos","CRM","Relatórios"].map((x)=><option key={x}>{x}</option>)}</select></Field><Button onClick={addRule}><Plus size={16}/> Criar regra</Button></div></Panel>
    <div className="data-grid">{state.automations.map((rule) => <article className="data-card floating-card" key={rule.id}><div className="card-top"><Zap size={20}/><StatusBadge tone={statusTone(rule.status)}>{rule.status}</StatusBadge></div><strong>{rule.name}</strong><small>{rule.module} · Gatilho: {rule.trigger}</small><ul className="action-list">{rule.actions.map((a)=><li key={a}>{a}</li>)}</ul><p>Última execução: {rule.lastRun} · {rule.executions} execuções</p><div className="row-actions"><Button variant="ghost" onClick={() => testRule(rule)}><Play size={15}/> Testar</Button><Button variant="ghost" onClick={() => toggle(rule)}>{rule.status === "Ativa" ? "Pausar" : "Ativar"}</Button></div></article>)}</div>
    <Panel><PanelTitle title="Logs de automação" subtitle="Histórico auditável das execuções internas." />{state.automationRuns.map((run)=><div className="task-row compact" key={run.id}><Zap size={18}/><div><strong>{run.ruleName}</strong><small>{run.result}</small></div><StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge><span>{run.date}</span></div>)}</Panel>
  </div>;
}
