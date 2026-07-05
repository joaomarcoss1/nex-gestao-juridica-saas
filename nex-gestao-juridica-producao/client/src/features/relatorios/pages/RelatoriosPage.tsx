import { useMemo, useState } from "react";
import { BarChart3, Download, FileCheck2, PieChart, ShieldCheck } from "lucide-react";
import type { FeaturePageProps, ReportExport } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { exportCsv, exportExcel, money, todayIso, uid } from "@/utils/format";
import { financialSummary, openPrintableReport } from "@/services/reportsEngine.service";
import { financialService } from "@/services/financial.service";
import { enterpriseReportGroups } from "@/data/legalEnterprise";

function inPeriod(date: string | undefined, start: string, end: string) {
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function RelatoriosPage({ state, commit, notify }: FeaturePageProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [module, setModule] = useState("Todos");
  const scopedFinances = useMemo(() => state.finances.filter((f) => inPeriod(f.dueDate, start, end)), [state.finances, start, end]);
  const scopedState = { ...state, finances: scopedFinances };
  const summary = financialSummary(scopedState);
  const reports = [
    { name: "Relatório financeiro", module: "Financeiro", rows: scopedFinances.length, status: "Pronto", data: financialService.dreRows(scopedState) },
    { name: "Fluxo de caixa", module: "Financeiro", rows: scopedFinances.length, status: "Pronto", data: scopedFinances.map((f) => [f.dueDate, `${f.type} · ${f.client} · ${money(f.amount)} · ${f.status}`] as [string,string]) },
    { name: "Processos parados", module: "Controladoria", rows: state.processes.filter((p) => p.lastMoveDays >= 30).length, status: "Atenção", data: state.processes.filter((p) => p.lastMoveDays >= 30).map((p) => [p.client, `${p.area} · ${p.lastMoveDays} dias`] as [string,string]) },
    { name: "Produtividade da equipe", module: "Gestão", rows: state.employees.length, status: "Pronto", data: state.employees.map((e) => [e.name, `${e.sector} · score ${e.score}`] as [string,string]) },
    { name: "Documentos pendentes", module: "Documentos", rows: state.documents.filter((d) => d.status !== "Aprovado").length, status: "Pronto", data: state.documents.filter((d) => d.status !== "Aprovado").map((d) => [d.name, `${d.client} · ${d.status}`] as [string,string]) },
    { name: "Prazos críticos", module: "Prazos", rows: state.deadlines.filter((d) => d.fatal || d.priority === "Crítica").length, status: "Atenção", data: state.deadlines.filter((d) => d.fatal || d.priority === "Crítica").map((d) => [d.client, `${d.type} · ${d.dueDate} · ${d.priority}`] as [string,string]) },
    { name: "Automações executadas", module: "Automações", rows: state.automationRuns.length, status: "Pronto", data: state.automationRuns.map((a) => [a.ruleName, `${a.status} · ${a.result}`] as [string,string]) },
    { name: "Espelho de ponto individual", module: "Ponto", rows: state.timeRecords.length, status: "Pronto", data: state.timeRecords.map((r) => [r.employeeName, `${r.date} ${r.time} · ${r.kind} · ${r.status}`] as [string,string]) },
    { name: "Ajustes pendentes de ponto", module: "Ponto", rows: state.pointAdjustments.filter((r) => r.status === "Pendente").length, status: "Atenção", data: state.pointAdjustments.filter((r) => r.status === "Pendente").map((r) => [state.employees.find((employee) => employee.id === r.employeeId)?.name ?? r.employeeId, `${r.date} · ${r.reason}`] as [string,string]) },
    { name: "Justificativas pendentes de ponto", module: "Ponto", rows: state.pointJustifications.filter((r) => r.status === "Pendente").length, status: "Atenção", data: state.pointJustifications.filter((r) => r.status === "Pendente").map((r) => [state.employees.find((employee) => employee.id === r.employeeId)?.name ?? r.employeeId, `${r.date} · ${r.reason}`] as [string,string]) },
    { name: "Rentabilidade por cliente", module: "Financeiro", rows: state.clients.length, status: "Pronto", data: state.clients.map((client) => [client.name, `${money(state.finances.filter((fin) => fin.clientId === client.id || fin.client === client.name).filter((fin) => fin.type === "Receita").reduce((sum, fin) => sum + fin.amount, 0) - state.costEntries.filter((cost) => cost.clientId === client.id).reduce((sum, cost) => sum + cost.amount, 0))}`] as [string,string]) },
    { name: "Dossiê rural e pendências", module: "Controladoria", rows: state.ruralProperties.length, status: "Pronto", data: state.ruralProperties.map((property) => [property.name, `${property.municipality}/${property.state} · ${property.pendingItems.length} pendências · ${property.protocols.length} protocolos`] as [string,string]) },
    { name: "Tempo de resposta ao cliente", module: "Operacional", rows: state.messages.length, status: "Pronto", data: state.messages.map((m) => [m.client, `${m.subject} · ${m.status} · resp. ${m.responsibleId ?? "admin"}`] as [string,string]) },
  ].filter((report) => module === "Todos" || report.module === module);

  async function auditExport(reportName: string, format: ReportExport["format"]) {
    await commit("reportExports", { id: uid("report"), reportName, filters: { start, end, module }, format, exportedAt: new Date().toISOString() });
  }

  async function exportAllCsv() {
    const rows = reports.map(({ data: _data, ...report }) => report);
    exportCsv("relatorios-nex.csv", rows);
    await auditExport("Lista de relatórios", "CSV");
    notify({ tone: "success", title: "Relatório exportado", message: "CSV gerado e registrado em auditoria de exportação." });
  }

  async function exportAllExcel() {
    exportExcel("relatorios-nex.xls", reports.map(({ data: _data, ...report }) => report));
    await auditExport("Lista de relatórios", "XLSX");
    notify({ tone: "success", title: "Excel gerado", message: "Arquivo .xls emitido pelo navegador e registrado." });
  }

  async function print(report: { name: string; data: Array<[string,string]> }) {
    openPrintableReport(report.name, [["Filtros", `Período ${start || "início"} até ${end || "hoje"}`], ...report.data]);
    await auditExport(report.name, "PDF");
  }

  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={BarChart3} label="Relatórios" value={reports.length} note="módulos auditáveis" tone="blue"/><Kpi icon={PieChart} label="Receita" value={money(summary.receitas)} note="período filtrado" tone="green"/><Kpi icon={FileCheck2} label="Vencido" value={money(summary.vencido)} note="régua de cobrança" tone="gold"/><Kpi icon={ShieldCheck} label="Exportações" value={state.reportExports.length} note="logs internos" tone="purple"/></div>
    <Panel><PanelTitle title="BI e relatórios profissionais" subtitle="Filtros, CSV, Excel e PDF impresso com cabeçalho NexLabs." action={<ActionBar><Button variant="ghost" onClick={exportAllCsv}><Download size={15}/> CSV</Button><Button variant="gold" onClick={exportAllExcel}><Download size={15}/> Excel</Button></ActionBar>} />
      <div className="quick-form"><Field label="Início"><input type="date" value={start} onChange={(e)=>setStart(e.target.value)} /></Field><Field label="Fim"><input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} /></Field><Field label="Módulo"><select value={module} onChange={(e)=>setModule(e.target.value)}>{["Todos","Financeiro","Controladoria","Gestão","Documentos","Prazos","Automações","Ponto","Operacional"].map((m)=><option key={m}>{m}</option>)}</select></Field></div>
      <div className="responsive-table"><table><thead><tr><th>Relatório</th><th>Módulo</th><th>Registros</th><th>Status</th><th>Ações</th></tr></thead><tbody>{reports.map((r)=><tr key={r.name}><td>{r.name}</td><td>{r.module}</td><td>{r.rows}</td><td><StatusBadge tone={r.status === "Atenção" ? "gold" : "green"}>{r.status}</StatusBadge></td><td><Button variant="ghost" onClick={() => print(r)}>Gerar PDF</Button></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel><PanelTitle title="Indicadores executivos" subtitle="DRE, fluxo de caixa, inadimplência, processos, produtividade, ponto e atendimento."/><div className="data-grid"><article className="data-card"><strong>DRE gerencial</strong><small>{money(summary.resultado)} de resultado.</small></article><article className="data-card"><strong>Inadimplência</strong><small>{money(summary.vencido)} em cobranças vencidas.</small></article><article className="data-card"><strong>Processos parados</strong><small>{state.processes.filter((p)=>p.lastMoveDays>=30).length} exigem revisão.</small></article></div></Panel>
    <Panel><PanelTitle title="Catálogo enterprise de relatórios" subtitle="Cobertura jurídica, financeira, operacional, ponto, atendimento e produtividade."/><div className="chip-cloud">{enterpriseReportGroups.map((name) => <span key={name}>{name}</span>)}</div></Panel>
  </div>;
}
