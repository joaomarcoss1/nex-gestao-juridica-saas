import { useMemo, useState } from "react";
import { Banknote, CircleDollarSign, Download, Edit3, Landmark, Plus, Receipt, Search, Trash2 } from "lucide-react";
import type { FeaturePageProps, FinanceEntry } from "@/types/app";
import { ActionBar, Button, Panel, PanelTitle, StatusBadge, Kpi } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { exportCsv, money, statusTone, todayIso, uid } from "@/utils/format";
import { financialService } from "@/services/financial.service";

const categories = ["Honorários", "Honorários contratuais", "Entrada de honorários", "Parcela de contrato", "Custas processuais", "Diligência", "Sistemas jurídicos", "Marketing", "Aluguel", "Folha", "Impostos", "Despesa operacional", "Consultoria", "Outro"];
const statuses: FinanceEntry["status"][] = ["Pendente", "Pago", "Atrasado", "Cancelado", "Parcial"];
const methods: FinanceEntry["method"][] = ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência", "Recorrente"];

function blankFinance(client: string): FinanceEntry {
  return { id: uid("fin"), type: "Receita", category: "Honorários", client, amount: 0, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: "" };
}

export function FinanceiroPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [query, setQuery] = useState("");
  const revenue = state.finances.filter((f) => f.type === "Receita").reduce((acc, item) => acc + item.amount, 0);
  const expenses = state.finances.filter((f) => f.type === "Despesa").reduce((acc, item) => acc + item.amount, 0);
  const open = state.finances.filter((f) => f.status !== "Pago").reduce((acc, item) => acc + item.amount, 0);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.finances.filter((entry) => [entry.type, entry.category, entry.client, entry.status, entry.method, entry.notes, entry.dueDate].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.finances]);

  const fields: FieldConfig<FinanceEntry>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["Receita", "Despesa"] },
    { key: "category", label: "Categoria", kind: "select", options: categories },
    { key: "client", label: "Cliente / centro", kind: "select", options: ["Escritório", ...state.clients.map((c) => c.name)] },
    { key: "processId", label: "Processo vinculado", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "amount", label: "Valor", kind: "number", required: true, step: 0.01 },
    { key: "dueDate", label: "Vencimento", kind: "date" },
    { key: "paidDate", label: "Data de pagamento", kind: "date" },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "method", label: "Forma de pagamento", kind: "select", options: methods },
    { key: "notes", label: "Observações", kind: "textarea" },
  ];

  async function saveEntry(entry: FinanceEntry) {
    const isNew = !state.finances.some((item) => item.id === entry.id);
    const normalizedEntry = { ...entry, paidDate: entry.status === "Pago" ? entry.paidDate || todayIso() : entry.paidDate };
    await commit("finances", normalizedEntry, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Lançamento criado" : "Lançamento atualizado", message: "Financeiro, dashboard e relatórios foram atualizados." });
  }

  async function deleteEntry(entry: FinanceEntry) {
    if (!confirm(`Excluir lançamento ${entry.category} - ${money(entry.amount)}?`)) return;
    await remove("finances", entry.id);
    notify({ tone: "info", title: "Lançamento removido" });
  }

  async function markPaid(entry: FinanceEntry) {
    const paid = financialService.markPaid(entry);
    await commit("finances", paid, "update");
    await commit("paymentReceipts", { id: uid("receipt"), financeId: paid.id, receiptNumber: paid.receiptNumber ?? uid("rec"), amount: paid.paidAmount ?? paid.amount, issuedAt: todayIso() });
    notify({ tone: "success", title: "Baixa registrada", message: `${entry.category} marcado como pago. Recibo ${paid.receiptNumber} gerado.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={CircleDollarSign} label="Receitas" value={money(revenue)} note="honorários e consultorias" tone="green" />
      <Kpi icon={Banknote} label="Despesas" value={money(expenses)} note="operacionais e processuais" tone="red" />
      <Kpi icon={Landmark} label="Saldo previsto" value={money(revenue - expenses)} note="resultado gerencial" tone="blue" />
      <Kpi icon={Receipt} label="Em aberto" value={money(open)} note="contas pendentes" tone="gold" />
    </div>
    <Panel>
      <PanelTitle title="Financeiro jurídico editável" subtitle="Contas a pagar/receber com edição completa, baixa, exclusão e exportação." action={<ActionBar><Button variant="ghost" onClick={() => exportCsv("financeiro-nex.csv", filtered as unknown as Record<string, unknown>[])}><Download size={15}/> CSV</Button><Button onClick={() => setEditing(blankFinance(state.clients[0]?.name ?? "Escritório"))}><Plus size={16}/> Novo lançamento</Button></ActionBar>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, categoria, status, vencimento ou observação" /></div>
      <div className="responsive-table">
        <table><thead><tr><th>Tipo</th><th>Categoria</th><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          {filtered.map((entry) => <tr key={entry.id}><td>{entry.type}</td><td>{entry.category}</td><td>{entry.client}</td><td>{money(entry.amount)}</td><td>{entry.dueDate}</td><td>{entry.paidDate ?? "-"}</td><td><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={() => { history.pushState({}, "", `/financeiro/${entry.id}`); dispatchEvent(new PopStateEvent("popstate")); }}>Detalhe</Button>{entry.status !== "Pago" && <Button variant="ghost" onClick={() => markPaid(entry)}>Dar baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteEntry(entry)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}
        </tbody></table>
      </div>
    </Panel>
    {editing && <EntityFormModal<FinanceEntry> open={!!editing} title={state.finances.some((item) => item.id === editing.id) ? "Editar lançamento financeiro" : "Novo lançamento financeiro"} subtitle="Todos os dados financeiros ficam editáveis e persistidos." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveEntry} />}
  </div>;
}
