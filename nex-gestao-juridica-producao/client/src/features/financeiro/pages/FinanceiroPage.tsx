import { useState } from "react";
import { Banknote, CircleDollarSign, Download, Landmark, Plus, Receipt } from "lucide-react";
import type { FeaturePageProps, FinanceEntry } from "@/types/app";
import { Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { exportCsv, money, statusTone, todayIso, uid } from "@/utils/format";

export function FinanceiroPage({ state, commit, notify }: FeaturePageProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Receita" | "Despesa">("Receita");
  const [client, setClient] = useState(state.clients[0]?.name ?? "Escritório");
  const revenue = state.finances.filter((f) => f.type === "Receita").reduce((acc, item) => acc + item.amount, 0);
  const expenses = state.finances.filter((f) => f.type === "Despesa").reduce((acc, item) => acc + item.amount, 0);
  const open = state.finances.filter((f) => f.status !== "Pago").reduce((acc, item) => acc + item.amount, 0);

  async function addEntry() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    const entry: FinanceEntry = { id: uid("fin"), type, category: type === "Receita" ? "Honorários" : "Despesa operacional", client, amount: value, dueDate: todayIso(), status: "Pendente", method: "PIX" };
    await commit("finances", entry);
    setAmount("");
    notify({ tone: "success", title: "Lançamento criado", message: "Contas e relatórios foram atualizados." });
  }

  async function markPaid(entry: FinanceEntry) {
    await commit("finances", { ...entry, status: "Pago", paidDate: todayIso() }, "update");
    notify({ tone: "success", title: "Baixa registrada", message: `${entry.category} marcado como pago.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={CircleDollarSign} label="Receitas" value={money(revenue)} note="honorários e consultorias" tone="green" />
      <Kpi icon={Banknote} label="Despesas" value={money(expenses)} note="operacionais e processuais" tone="red" />
      <Kpi icon={Landmark} label="Saldo previsto" value={money(revenue - expenses)} note="resultado gerencial" tone="blue" />
      <Kpi icon={Receipt} label="Em aberto" value={money(open)} note="contas pendentes" tone="gold" />
    </div>
    <Panel>
      <PanelTitle title="Lançamento financeiro" subtitle="Cada registro grava em financial_entries quando o Supabase está configurado." action={<Button variant="ghost" onClick={() => exportCsv("financeiro-nex.csv", state.finances as unknown as Record<string, unknown>[])}><Download size={15}/> CSV</Button>} />
      <div className="quick-form">
        <Field label="Tipo"><select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option>Receita</option><option>Despesa</option></select></Field>
        <Field label="Cliente/Centro"><select value={client} onChange={(e) => setClient(e.target.value)}><option>Escritório</option>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Valor"><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></Field>
        <Button onClick={addEntry}><Plus size={16}/> Lançar</Button>
      </div>
      <div className="responsive-table">
        <table><thead><tr><th>Tipo</th><th>Categoria</th><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead><tbody>
          {state.finances.map((entry) => <tr key={entry.id}><td>{entry.type}</td><td>{entry.category}</td><td>{entry.client}</td><td>{money(entry.amount)}</td><td>{entry.dueDate}</td><td><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></td><td>{entry.status !== "Pago" && <Button variant="ghost" onClick={() => markPaid(entry)}>Dar baixa</Button>}</td></tr>)}
        </tbody></table>
      </div>
    </Panel>
  </div>;
}
