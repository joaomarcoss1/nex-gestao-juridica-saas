import type { AppState } from "@/types/app";
import { Panel, PanelTitle } from "@/components/ui/Primitives";
import { financialService } from "@/services/financial.service";

export function DREReport({ state }: { state: AppState }) {
  return <Panel><PanelTitle title="DRE gerencial" subtitle="Receitas, despesas e resultado do escritório." />
    <div className="responsive-table"><table><tbody>{financialService.dreRows(state).map(([label, value]) => <tr key={label}><td><strong>{label}</strong></td><td>{value}</td></tr>)}</tbody></table></div>
  </Panel>;
}
