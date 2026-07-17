import { AlarmClock, Banknote, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, ClipboardCheck, FileText, UserCheck, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FeaturePageProps } from "@/types/app";
import { Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone } from "@/utils/format";
import { useAuth } from "@/hooks/useAuth";
import { isMasterAdmin } from "@/lib/permissions";

export function DashboardPage({ state, setPage }: FeaturePageProps) {
  const { profile } = useAuth();
  const activeClients = state.clients.filter((c) => c.status === "Ativo").length;
  const openLeads = state.leads.filter((lead) => !["Cliente convertido", "Perdido"].includes(lead.stage)).length;
  const upcomingDeadlines = state.deadlines.filter((deadline) => deadline.status === "Pendente").length;
  const overdueDeadlines = state.deadlines.filter((deadline) => deadline.status === "Atrasado" || deadline.dueDate < new Date().toISOString().slice(0,10)).length;
  const meetingsWeek = state.hearings.length;
  const presentToday = new Set(state.timeRecords.filter((record) => record.date === new Date().toISOString().slice(0,10) && record.kind === "entrada").map((record) => record.employeeId)).size;
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

  if (isMasterAdmin(profile)) {
    const activeCompanies = state.organizations.filter((company) => company.status === "Ativa" && !company.accessBlocked).length;
    const blockedCompanies = state.organizations.filter((company) => company.accessBlocked || company.status === "Bloqueada").length;
    const companyData = state.organizations.map((company) => ({ empresa: company.tradeName || company.name, processos: state.processes.filter((p) => !p.organizationId || p.organizationId === company.id).length, receita: state.finances.filter((f) => !(f as any).organizationId || (f as any).organizationId === company.id).reduce((sum, f) => sum + (f.type === "Receita" ? f.amount : 0), 0) }));
    return <div className="page-grid">
      <div className="kpi-row">
        <Kpi icon={Building2} label="Empresas ativas" value={activeCompanies} note={`${blockedCompanies} bloqueadas`} tone="blue" />
        <Kpi icon={Users} label="Usuários internos" value={state.employees.length} note="admins e equipe" tone="gold" />
        <Kpi icon={BriefcaseBusiness} label="Processos totais" value={state.processes.length} note="visão consolidada" tone="purple" />
        <Kpi icon={CircleDollarSign} label="Receita global" value={money(revenue)} note="honorários mapeados" tone="green" />
      </div>
      <div className="dashboard-layout">
        <Panel>
          <PanelTitle title="Receita por empresa" subtitle="Visão interna do Admin Master com isolamento por escritório." action={<button className="icon-btn" onClick={() => setPage("empresas")}><Building2 size={17}/></button>} />
          <div className="chart-box"><ResponsiveContainer width="100%" height={250}><BarChart data={companyData}><CartesianGrid stroke="rgba(17,24,39,.08)" vertical={false}/><XAxis dataKey="empresa" stroke="#64748b"/><YAxis stroke="#64748b" tickFormatter={(v) => `R$${Number(v) / 1000}k`}/><Tooltip formatter={(v) => money(Number(v))}/><Bar dataKey="receita" radius={[10,10,0,0]} fill="#1d74ff"/></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel>
          <PanelTitle title="Gestão global" subtitle="Ações discretas para suporte, cobrança e administração multiempresa." />
          <div className="summary-stack">
            <button onClick={() => setPage("empresas")}><Building2 size={18}/> Empresas <strong>{state.organizations.length}</strong></button>
            <button onClick={() => setPage("equipe")}><Users size={18}/> Usuários e equipe <strong>{state.employees.length}</strong></button>
            <button onClick={() => setPage("assinatura")}><Banknote size={18}/> Assinaturas <strong>{state.organizations.length}</strong></button>
            <button onClick={() => setPage("relatorios")}><FileText size={18}/> Relatórios <strong>{state.reportExports.length}</strong></button>
          </div>
        </Panel>
      </div>
      <Panel>
        <PanelTitle title="Últimas empresas cadastradas" subtitle="Matrículas e status comercial dos escritórios." />
        <div className="table-like">{state.organizations.slice(0, 6).map((company) => <div className="task-row compact" key={company.id}><span className="dot gold"/><div><strong>{company.tradeName || company.name}</strong><small>{company.registrationCode} · {company.responsibleName || "responsável pendente"}</small></div><StatusBadge tone={company.accessBlocked ? "red" : "green"}>{company.accessBlocked ? "Bloqueada" : company.status}</StatusBadge><span>{company.plan}</span></div>)}</div>
      </Panel>
    </div>;
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={BriefcaseBusiness} label="Processos ativos" value={state.processes.length} note={`${stuckProcesses} parados há 30+ dias`} tone="blue" />
      <Kpi icon={AlarmClock} label="Prazos críticos" value={criticalTasks} note="tarefas e prazos exigem ação" tone="red" />
      <Kpi icon={CircleDollarSign} label="Receita prevista" value={money(revenue)} note="honorários e cobranças" tone="green" />
      <Kpi icon={Users} label="Clientes ativos" value={activeClients} note={`${openLeads} leads em aberto`} tone="gold" />
    </div>
    <div className="kpi-row">
      <Kpi icon={AlarmClock} label="Prazos próximos" value={upcomingDeadlines} note={`${overdueDeadlines} vencidos`} tone="red" />
      <Kpi icon={CalendarDays} label="Reuniões e audiências" value={meetingsWeek} note="equipe, clientes e jurídico" tone="purple" />
      <Kpi icon={UserCheck} label="Presentes hoje" value={presentToday} note="registro de ponto" tone="green" />
      <Kpi icon={Banknote} label="Despesas pendentes" value={money(state.costEntries.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + item.amount, 0))} note="custas, diligências e escritório" tone="gold" />
    </div>

    <Panel><PanelTitle title="Filtros executivos" subtitle="Filtre por período, área, unidade, equipe, advogado, cliente, status e prioridade." />
      <div className="quick-form"><Field label="Área"><select><option>Todas</option>{Array.from(new Set(state.processes.map((p)=>p.area))).map((area)=><option key={area}>{area}</option>)}</select></Field><Field label="Unidade"><select><option>Todas</option>{state.units.map((unit)=><option key={unit.id}>{unit.name}</option>)}</select></Field><Field label="Equipe"><select><option>Todas</option>{state.teams.map((team)=><option key={team.id}>{team.name}</option>)}</select></Field><Field label="Advogado"><select><option>Todos</option>{state.employees.map((employee)=><option key={employee.id}>{employee.name}</option>)}</select></Field></div>
    </Panel>
    <div className="dashboard-layout">
      <Panel>
        <PanelTitle title="Saúde do escritório" subtitle="Receita, despesa e rentabilidade acompanhadas pela operação." action={<button className="icon-btn" onClick={() => setPage("financeiro")}><Banknote size={17} /></button>} />
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
              <defs><linearGradient id="rev" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.25}/><stop offset="95%" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgba(17,24,39,.08)" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(v) => `R$${Number(v) / 1000}k`} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Area dataKey="receita" stroke="#1d74ff" fill="url(#rev)" strokeWidth={3} />
              <Area dataKey="despesa" stroke="#d6a33a" fill="transparent" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Ações do dia" subtitle="Atalhos da rotina jurídica." />
        <div className="summary-stack">
          <button onClick={() => setPage("crm")}><Users size={18} /> Revisar CRM <strong>{state.leads.length}</strong></button>
          <button onClick={() => setPage("documentos")}><FileText size={18} /> Conferir documentos <strong>{state.documents.filter((d) => d.status !== "Aprovado").length}</strong></button>
          <button onClick={() => setPage("tarefas")}><ClipboardCheck size={18} /> Fechar tarefas críticas <strong>{criticalTasks}</strong></button>
          <button onClick={() => setPage("agenda")}><CalendarDays size={18} /> Ver agenda <strong>{meetingsWeek}</strong></button>
        </div>
      </Panel>
    </div>
    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Processos por área" subtitle="Mapa de estoque processual para controladoria." />
        <div className="chart-box small"><ResponsiveContainer width="100%" height={190}><BarChart data={areaData}><CartesianGrid stroke="rgba(17,24,39,.08)" vertical={false}/><XAxis dataKey="area" stroke="#64748b"/><YAxis stroke="#64748b" allowDecimals={false}/><Tooltip/><Bar dataKey="total" radius={[10,10,0,0]} fill="#1d74ff"/></BarChart></ResponsiveContainer></div>
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
