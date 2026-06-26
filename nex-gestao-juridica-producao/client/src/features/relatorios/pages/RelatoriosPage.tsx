import { BarChart3, Download, FileCheck2, PieChart, ShieldCheck } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { exportCsv, money } from "@/utils/format";

export function RelatoriosPage({ state, notify }: FeaturePageProps) {
  const reports = [
    { name: "Relatório financeiro", module: "Financeiro", rows: state.finances.length, status: "Pronto" },
    { name: "Processos parados", module: "Controladoria", rows: state.processes.filter((p) => p.lastMoveDays >= 30).length, status: "Atenção" },
    { name: "Produtividade da equipe", module: "Gestão", rows: state.employees.length, status: "Pronto" },
    { name: "Documentos pendentes", module: "Documentos", rows: state.documents.filter((d) => d.status !== "Aprovado").length, status: "Pronto" },
    { name: "Automações executadas", module: "Automações", rows: state.automationRuns.length, status: "Pronto" },
  ];
  function exportAll() {
    exportCsv("relatorios-nex.csv", reports);
    notify({ tone: "success", title: "Relatório exportado", message: "CSV gerado pelo navegador." });
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={BarChart3} label="Relatórios" value={reports.length} note="módulos auditáveis" tone="blue"/><Kpi icon={PieChart} label="Receita" value={money(state.finances.filter(f=>f.type==='Receita').reduce((a,b)=>a+b.amount,0))} note="base financeira" tone="green"/><Kpi icon={FileCheck2} label="Documentos" value={state.documents.length} note="storage e scanner" tone="gold"/><Kpi icon={ShieldCheck} label="Auditoria" value={state.automationRuns.length} note="logs internos" tone="purple"/></div>
    <Panel><PanelTitle title="BI e relatórios" subtitle="Filtros, cards, tabela e exportação pronta para evolução em PDF/Excel." action={<Button onClick={exportAll}><Download size={15}/> Exportar CSV</Button>} />
      <div className="responsive-table"><table><thead><tr><th>Relatório</th><th>Módulo</th><th>Registros</th><th>Status</th><th>Ações</th></tr></thead><tbody>{reports.map((r)=><tr key={r.name}><td>{r.name}</td><td>{r.module}</td><td>{r.rows}</td><td><StatusBadge tone={r.status === "Atenção" ? "gold" : "green"}>{r.status}</StatusBadge></td><td><Button variant="ghost" onClick={exportAll}>Exportar</Button></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel><PanelTitle title="Próximas exportações profissionais" subtitle="Documentação de produção já preparada para PDF, Excel e relatórios com logo NexLabs."/><div className="data-grid"><article className="data-card"><strong>PDF executivo</strong><small>Cabeçalho, filtros, assinatura visual e rodapé NexLabs.</small></article><article className="data-card"><strong>Excel financeiro</strong><small>Contas a pagar, receber, DRE, DFC e inadimplência.</small></article><article className="data-card"><strong>Espelho de ponto</strong><small>Registros diários, justificativas e aprovação de RH.</small></article></div></Panel>
  </div>;
}
