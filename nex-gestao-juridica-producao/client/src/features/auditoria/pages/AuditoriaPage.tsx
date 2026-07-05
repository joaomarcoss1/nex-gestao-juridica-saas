import { Download, ShieldCheck } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { exportCsv } from "@/utils/format";
import { usePermissions } from "@/hooks/usePermissions";

export function AuditoriaPage({ state, notify }: FeaturePageProps) {
  const { can } = usePermissions();
  if (!can("audit.view")) return <Panel><PanelTitle title="Acesso restrito" subtitle="Auditoria disponível apenas para Admin/Sócio." /></Panel>;
  function exportLogs() {
    exportCsv("auditoria-nex-gestao-juridica.csv", state.auditLogs);
    notify({ tone: "success", title: "Auditoria exportada", message: "CSV gerado com logs disponíveis." });
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={ShieldCheck} label="Logs" value={state.auditLogs.length} note="ações sensíveis" tone="purple"/><Kpi icon={ShieldCheck} label="LGPD" value="Ativa" note="rastreabilidade" tone="green"/><Kpi icon={ShieldCheck} label="Storage" value="Privado" note="URLs assinadas" tone="blue"/><Kpi icon={ShieldCheck} label="RLS" value="users_profiles" note="sem profiles" tone="gold"/></div>
    <Panel><PanelTitle title="Auditoria e rastreabilidade" subtitle="Registro de login, edição, exclusão, documentos, financeiro, automações e relatórios." action={<Button onClick={exportLogs}><Download size={15}/> Exportar CSV</Button>} />
      <div className="responsive-table"><table><thead><tr><th>Data</th><th>Módulo</th><th>Ação</th><th>Entidade</th><th>Usuário</th><th>Detalhe</th></tr></thead><tbody>{state.auditLogs.map((log) => <tr key={log.id}><td>{log.date}</td><td>{log.module}</td><td><StatusBadge tone="blue">{log.action}</StatusBadge></td><td>{log.entityId ?? "-"}</td><td>{log.user ?? "Sistema"}</td><td>{log.detail}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}
