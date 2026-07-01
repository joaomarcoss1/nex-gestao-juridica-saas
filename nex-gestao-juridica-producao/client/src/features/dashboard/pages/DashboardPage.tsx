import { AlarmClock, Banknote, BriefcaseBusiness, CheckCircle2, CircleDollarSign, ClipboardCheck, FileText, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FeaturePageProps } from "@/types/app";
import { Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone } from "@/utils/format";

export function DashboardPage({ state, setPage }: FeaturePageProps) {
  const revenue = state.finances.filter((f) => f.type === "Receita").reduce((acc, item) => acc + item.amount, 0);
  const expenses = state.finances.filter((f) => f.type === "Despesa").reduce((acc, item) => acc + item.amount, 0);
  const criticalTasks = state.tasks.filter((t) => ["Atrasada", "Pendente"].includes(t.status)).length;
  const stuckProcesses = state.processes.filter((p) => p.lastMoveDays >= 30).length;
  const chartData = [
    { month: "Jan", receita: 12000, despesa: 7800 },
    { month: "Fev", receita: 14500, despesa: 8400 },
    { month: "Mar", receita: 17800, despesa: 9200 },
    { month: "Abr", receita: revenue * 0.7, despesa: expenses * 0.8 },
    { month: "Mai", receita: revenue * 0.85, despesa: expenses * 0.95 },
    { month: "Jun", receita: revenue, despesa: expenses },
  ];
  const areaData = Object.entries(state.processes.reduce<Record<string, number>>((acc, p) => { acc[p.area] = (acc[p.area] ?? 0) + 1; return acc; }, {})).map(([area, total]) => ({ area, total }));

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={BriefcaseBusiness} label="Processos ativos" value={state.processes.length} note={`${stuckProcesses} parados há 30+ dias`} tone="blue" />
      <Kpi icon={AlarmClock} label="Prazos críticos" value={criticalTasks} note="tarefas e prazos exigem ação" tone="red" />
      <Kpi icon={CircleDollarSign} label="Receita prevista" value={money(revenue)} note="honorários e cobranças" tone="green" />
      <Kpi icon={Users} label="Clientes ativos" value={state.clients.filter((c) => c.status === "Ativo").length} note={`${state.leads.length} leads em CRM`} tone="gold" />
    </div>
    <div className="dashboard-layout">
      <Panel>
        <PanelTitle title="Saúde do escritório" subtitle="Receita, despesa e rentabilidade com dados salvos por módulo." action={<button className="icon-btn" onClick={() => setPage("financeiro")}><Banknote size={17} /></button>} />
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
              <defs><linearGradient id="rev" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.25}/><stop offset="95%" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
              <XAxis dataKey="month" stroke="#73839b" />
              <YAxis stroke="#73839b" tickFormatter={(v) => `R$${Number(v) / 1000}k`} />
              <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: "#0d1928", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14 }} />
              <Area dataKey="receita" stroke="#1a9cff" fill="url(#rev)" strokeWidth={3} />
              <Area dataKey="despesa" stroke="#f6b52e" fill="transparent" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Ações inteligentes" subtitle="Atalhos úteis para operação diária." />
        <div className="summary-stack">
          <button onClick={() => setPage("clientes")}><Users size={18} /> Revisar novos leads <strong>{state.leads.length}</strong></button>
          <button onClick={() => setPage("documentos")}><FileText size={18} /> Conferir documentos <strong>{state.documents.filter((d) => d.status !== "Aprovado").length}</strong></button>
          <button onClick={() => setPage("tarefas")}><ClipboardCheck size={18} /> Fechar tarefas críticas <strong>{criticalTasks}</strong></button>
          <button onClick={() => setPage("automacoes")}><CheckCircle2 size={18} /> Executar automações <strong>{state.automations.filter((a) => a.status === "Ativa").length}</strong></button>
        </div>
      </Panel>
    </div>
    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Processos por área" subtitle="Mapa de estoque processual para controladoria." />
        <div className="chart-box small"><ResponsiveContainer width="100%" height={190}><BarChart data={areaData}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false}/><XAxis dataKey="area" stroke="#73839b"/><YAxis stroke="#73839b" allowDecimals={false}/><Tooltip contentStyle={{ background: "#0d1928", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14 }}/><Bar dataKey="total" radius={[10,10,0,0]} fill="#1a9cff"/></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel>
        <PanelTitle title="Agenda crítica" subtitle="Próximos prazos e tarefas em aberto." />
        <div className="table-like">
          {state.tasks.slice(0, 5).map((task) => <div className="task-row compact" key={task.id}>
            <span className="dot gold"/><div><strong>{task.title}</strong><small>{task.client} · {task.sector}</small></div><StatusBadge tone={statusTone(task.status)}>{task.status}</StatusBadge><span>{task.due}</span>
          </div>)}
        </div>
      </Panel>
    </div>
  </div>;
}
