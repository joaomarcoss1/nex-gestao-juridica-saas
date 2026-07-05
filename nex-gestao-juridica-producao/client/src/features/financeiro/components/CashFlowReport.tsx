import type { AppState } from "@/types/app";
import { Panel, PanelTitle } from "@/components/ui/Primitives";
import { money } from "@/utils/format";

export function CashFlowReport({ state }: { state: AppState }) {
  const rows = [...state.finances].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  let balance = 0;
  return <Panel><PanelTitle title="Fluxo de caixa gerencial" subtitle="Previsão por vencimento com saldo acumulado." />
    <div className="responsive-table"><table><thead><tr><th>Data</th><th>Cliente/Centro</th><th>Categoria</th><th>Entrada</th><th>Saída</th><th>Saldo</th></tr></thead><tbody>{rows.map((row) => { balance += row.type === "Receita" ? row.amount : -row.amount; return <tr key={row.id}><td>{row.dueDate}</td><td>{row.client}</td><td>{row.category}</td><td>{row.type === "Receita" ? money(row.amount) : "-"}</td><td>{row.type === "Despesa" ? money(row.amount) : "-"}</td><td>{money(balance)}</td></tr>; })}</tbody></table></div>
  </Panel>;
}
