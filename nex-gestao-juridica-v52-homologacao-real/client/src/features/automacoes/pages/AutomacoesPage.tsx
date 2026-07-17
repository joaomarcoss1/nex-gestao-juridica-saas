import { useMemo, useState } from "react";
import { Edit3, Play, Plus, Search, Trash2, Workflow, Zap } from "lucide-react";
import type { AutomationRule, AutomationRun, FeaturePageProps, FinanceEntry, Task } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { requestConfirmation } from "@/services/dialog.service";

const modules: AutomationRule["module"][] = ["Processos", "Financeiro", "Ponto", "Documentos", "CRM", "Relatórios"];
const statuses: AutomationRule["status"][] = ["Ativa", "Pausada", "Rascunho"];
const triggers = ["Processo criado", "Processo sem movimentação há 30 dias", "Prazo vence em 3 dias", "Cliente inadimplente", "Documento enviado pelo portal", "Lead sem contato há 5 dias", "Proposta aceita", "Ponto com atraso", "Relatório mensal solicitado", "Evento configurável"];

function blankRule(): AutomationRule {
  return { id: uid("auto"), name: "", module: "Processos", trigger: "Evento configurável", actions: ["Criar tarefa", "Notificar responsável", "Gerar log"], status: "Ativa", lastRun: "", executions: 0, successRate: 100 };
}

export function AutomacoesPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.automations.filter((rule) => [rule.name, rule.module, rule.trigger, rule.status, rule.actions.join(" ")].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.automations]);

  const fields: FieldConfig<AutomationRule>[] = [
    { key: "name", label: "Nome da automação", required: true },
    { key: "module", label: "Módulo", kind: "select", options: modules },
    { key: "trigger", label: "Gatilho", kind: "select", options: triggers },
    { key: "actions", label: "Ações separadas por vírgula", kind: "textarea", placeholder: "Criar tarefa, Notificar responsável, Gerar log" },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "lastRun", label: "Última execução", kind: "date" },
    { key: "executions", label: "Execuções", kind: "number" },
    { key: "successRate", label: "Taxa de sucesso (%)", kind: "number", min: 0, max: 100 },
  ];

  async function saveRule(rule: AutomationRule) {
    const isNew = !state.automations.some((item) => item.id === rule.id);
    const normalized = { ...rule, actions: Array.isArray(rule.actions) ? rule.actions : String(rule.actions).split(",").map((item) => item.trim()).filter(Boolean) };
    await commit("automations", normalized, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Automação criada" : "Automação atualizada", message: "Regra pronta para execução interna." });
  }

  async function deleteRule(rule: AutomationRule) {
    if (!await requestConfirmation("Arquivar automação", `A automação ${rule.name} será desativada e arquivada. Deseja continuar?`)) return;
    await remove("automations", rule.id);
    notify({ tone: "info", title: "Automação removida" });
  }

  async function createRun(rule: AutomationRule, result: string, status: AutomationRun["status"] = "Sucesso") {
    const run: AutomationRun = { id: uid("run"), ruleId: rule.id, ruleName: rule.name, result, date: todayIso(), status };
    await commit("automationRuns", run);
    await commit("automations", { ...rule, executions: rule.executions + 1, lastRun: todayIso(), successRate: status === "Erro" ? Math.max(0, rule.successRate - 2) : Math.min(100, rule.successRate + 0.1) }, "update");
    return run;
  }

  async function testRule(rule: AutomationRule) {
    if (rule.status !== "Ativa") {
      notify({ tone: "error", title: "Automação pausada", message: "Ative a regra antes de testar." });
      return;
    }
    const actions = rule.actions.join(" + ");
    await createRun(rule, `Teste executado: ${actions}`);
    notify({ tone: "success", title: "Automação testada", message: actions });
  }

  async function executeAll() {
    let total = 0;
    for (const rule of state.automations.filter((item) => item.status === "Ativa")) {
      if (rule.trigger.includes("Processo sem movimentação")) {
        const stuck = state.processes.filter((p) => p.lastMoveDays >= 30);
        for (const process of stuck) {
          const task: Task = { id: uid("task"), title: `Controladoria: revisar processo parado - ${process.client}`, processId: process.id, client: process.client, responsible: process.responsible, sector: "Controladoria", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 1, spentHours: 0 };
          await commit("tasks", task);
          total += 1;
        }
        await createRun(rule, `${stuck.length} processo(s) parado(s) geraram tarefas de controladoria.`, stuck.length ? "Sucesso" : "Atenção");
      } else if (rule.trigger.includes("Cliente inadimplente")) {
        const overdue = state.finances.filter((f) => ["Pendente", "Parcial", "Atrasado"].includes(f.status) && !f.archivedAt && f.dueDate < todayIso() && f.amount > (f.paidAmount ?? 0));
        for (const entry of overdue) {
          const task: Task = { id: uid("task"), title: `Financeiro: cobrar ${entry.client} - ${money(entry.amount)}`, processId: entry.processId ?? "", client: entry.client, responsible: state.employees.find((employee) => employee.sector?.toLowerCase().includes("finance"))?.id ?? state.employees[0]?.id ?? "", sector: "Financeiro", priority: "Alta", status: "Pendente", due: todayIso(), estimatedHours: 0.5, spentHours: 0 };
          await commit("tasks", task);
          if (entry.status !== "Atrasado") await commit("finances", { ...entry, status: "Atrasado" } as FinanceEntry, "update");
          total += 1;
        }
        await createRun(rule, `${overdue.length} cobrança(s) vencida(s) geraram tarefas financeiras.`, overdue.length ? "Sucesso" : "Atenção");
      } else if (rule.trigger.includes("Documento enviado")) {
        const pendingDocs = state.documents.filter((doc) => doc.status === "Recebido" || doc.status === "Em análise");
        await createRun(rule, `${pendingDocs.length} documento(s) aguardam conferência.`, pendingDocs.length ? "Sucesso" : "Atenção");
      } else {
        await createRun(rule, `Rotina ${rule.trigger} executada sem pendências novas.`, "Sucesso");
      }
    }
    notify({ tone: "success", title: "Automações executadas", message: `${total} ação(ões) operacionais geradas.` });
  }

  async function toggle(rule: AutomationRule) {
    await commit("automations", { ...rule, status: rule.status === "Ativa" ? "Pausada" : "Ativa" }, "update");
  }

  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={Zap} label="Ativas" value={state.automations.filter((a) => a.status === "Ativa").length} note="regras operacionais" tone="green"/><Kpi icon={Workflow} label="Execuções" value={state.automationRuns.length} note="logs gravados" tone="blue"/><Kpi icon={Play} label="Taxa média" value={`${Math.round(state.automations.reduce((a,b)=>a+b.successRate,0)/Math.max(1,state.automations.length))}%`} note="sucesso operacional" tone="gold"/><Kpi icon={Plus} label="Módulos" value="6" note="CRM, processos, financeiro..." tone="purple"/></div>
    <Panel><PanelTitle title="Automações internas editáveis" subtitle="Regras reais para criar tarefas, alertas, baixas e logs sem IA." action={<ActionBar><Button variant="gold" onClick={executeAll}><Play size={16}/> Executar ativas</Button><Button onClick={() => setEditing(blankRule())}><Plus size={16}/> Nova regra</Button></ActionBar>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por módulo, gatilho, ação ou status" /></div>
    </Panel>
    <div className="data-grid">{filtered.map((rule) => <article className="data-card floating-card" key={rule.id}><div className="card-top"><Zap size={20}/><StatusBadge tone={statusTone(rule.status)}>{rule.status}</StatusBadge></div><strong>{rule.name}</strong><small>{rule.module} · Gatilho: {rule.trigger}</small><ul className="action-list">{rule.actions.map((a)=><li key={a}>{a}</li>)}</ul><p>Última execução: {rule.lastRun || "nunca"} · {rule.executions} execuções</p><ActionBar><Button variant="ghost" onClick={() => testRule(rule)}><Play size={15}/> Testar</Button><Button variant="ghost" onClick={() => toggle(rule)}>{rule.status === "Ativa" ? "Pausar" : "Ativar"}</Button><Button variant="ghost" onClick={() => setEditing(rule)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteRule(rule)}><Trash2 size={15}/></Button></ActionBar></article>)}</div>
    <Panel><PanelTitle title="Logs de automação" subtitle="Histórico auditável das execuções internas." />{state.automationRuns.slice(0, 15).map((run)=><div className="task-row compact" key={run.id}><Zap size={18}/><div><strong>{run.ruleName}</strong><small>{run.result}</small></div><StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge><span>{run.date}</span></div>)}</Panel>
    {editing && <EntityFormModal<AutomationRule> open={!!editing} title={state.automations.some((item) => item.id === editing.id) ? "Editar automação" : "Nova automação"} subtitle="Defina módulo, gatilho, status e ações internas." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveRule} />}
  </div>;
}
