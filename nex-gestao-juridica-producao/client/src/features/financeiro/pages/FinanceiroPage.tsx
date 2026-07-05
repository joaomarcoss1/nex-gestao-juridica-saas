import { useMemo, useState } from "react";
import { Banknote, CircleDollarSign, Download, Edit3, Landmark, Plus, Receipt, Search, Trash2 } from "lucide-react";
import type { CostEntry, FeaturePageProps, FeeContract, FinanceEntry } from "@/types/app";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge, Kpi } from "@/components/ui/Primitives";
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
  const [editingContract, setEditingContract] = useState<FeeContract | null>(null);
  const [editingCost, setEditingCost] = useState<CostEntry | null>(null);
  const [query, setQuery] = useState("");
  const revenue = state.finances.filter((f) => f.type === "Receita").reduce((acc, item) => acc + item.amount, 0);
  const expenses = state.finances.filter((f) => f.type === "Despesa").reduce((acc, item) => acc + item.amount, 0);
  const open = state.finances.filter((f) => f.status !== "Pago").reduce((acc, item) => acc + item.amount, 0);
  const contractTotal = state.feeContracts.reduce((acc, item) => acc + item.totalAmount, 0);
  const pendingCosts = state.costEntries.filter((item) => item.status === "Pendente").reduce((acc, item) => acc + item.amount, 0);

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


  const contractFields: FieldConfig<FeeContract>[] = [
    { key: "clientId", label: "Cliente", kind: "select", options: state.clients.map((client) => ({ value: client.id, label: client.name })) },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((process) => ({ value: process.id, label: `${process.client} · ${process.area}` }))] },
    { key: "title", label: "Título do contrato", required: true },
    { key: "feeType", label: "Tipo", kind: "select", options: ["Contratual", "Sucumbencial", "Êxito", "Mensal", "Avulso"] },
    { key: "totalAmount", label: "Valor total", kind: "number" },
    { key: "entryAmount", label: "Entrada", kind: "number" },
    { key: "installments", label: "Parcelas", kind: "number" },
    { key: "successPercent", label: "% êxito", kind: "number" },
    { key: "status", label: "Status", kind: "select", options: ["Rascunho", "Enviado", "Assinado", "Ativo", "Encerrado", "Cancelado"] },
    { key: "signedAt", label: "Assinado em", kind: "date" },
  ];
  const costFields: FieldConfig<CostEntry>[] = [
    { key: "clientId", label: "Cliente", kind: "select", options: [{ value: "", label: "Escritório" }, ...state.clients.map((client) => ({ value: client.id, label: client.name }))] },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((process) => ({ value: process.id, label: `${process.client} · ${process.area}` }))] },
    { key: "category", label: "Categoria", kind: "select", options: ["Custas", "Guias", "Diligência", "Correspondente", "Reembolso", "Despesa interna"] },
    { key: "description", label: "Descrição", required: true },
    { key: "amount", label: "Valor", kind: "number" },
    { key: "dueDate", label: "Vencimento", kind: "date" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Pago", "Reembolsado", "Cancelado"] },
    { key: "responsibleId", label: "Responsável", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
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

  async function saveContract(contract: FeeContract) {
    const isNew = !state.feeContracts.some((item) => item.id === contract.id);
    await commit("feeContracts", contract, isNew ? "create" : "update");
    if (contract.status === "Ativo" || contract.status === "Assinado") {
      const client = state.clients.find((item) => item.id === contract.clientId);
      await commit("finances", { id: uid("fin"), type: "Receita", category: contract.feeType === "Êxito" ? "Honorários por êxito" : "Honorários contratuais", client: client?.name ?? "Cliente", clientId: contract.clientId, processId: contract.processId, amount: contract.entryAmount || contract.totalAmount / Math.max(1, contract.installments), dueDate: todayIso(), status: "Pendente", method: "PIX", notes: `Cobrança gerada pelo contrato ${contract.title}` });
    }
    setEditingContract(null);
    notify({ tone: "success", title: "Contrato de honorários salvo", message: "Financeiro jurídico e cobrança inicial foram atualizados quando aplicável." });
  }
  async function saveCost(cost: CostEntry) {
    const isNew = !state.costEntries.some((item) => item.id === cost.id);
    await commit("costEntries", cost, isNew ? "create" : "update");
    const client = state.clients.find((item) => item.id === cost.clientId);
    await commit("finances", { id: uid("fin"), type: "Despesa", category: cost.category, client: client?.name ?? "Escritório", clientId: cost.clientId, processId: cost.processId, amount: cost.amount, dueDate: cost.dueDate, status: cost.status === "Pago" ? "Pago" : "Pendente", method: "PIX", notes: cost.description });
    setEditingCost(null);
    notify({ tone: "success", title: "Custa/despesa salva", message: "Lançamento financeiro vinculado ao cliente/processo foi criado." });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={CircleDollarSign} label="Receitas" value={money(revenue)} note="honorários e consultorias" tone="green" />
      <Kpi icon={Banknote} label="Despesas" value={money(expenses)} note="operacionais e processuais" tone="red" />
      <Kpi icon={Landmark} label="Saldo previsto" value={money(revenue - expenses)} note="resultado gerencial" tone="blue" />
      <Kpi icon={Receipt} label="Em aberto" value={money(open)} note="contas pendentes" tone="gold" />
    </div>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Contratos de honorários" subtitle={`Carteira contratada: ${money(contractTotal)} · honorários contratuais, êxito, sucumbenciais, mensais e avulsos.`} />
        <div className="stack-list">{state.feeContracts.map((contract) => <div className="data-card" key={contract.id}><strong>{contract.title}</strong><small>{state.clients.find((client) => client.id === contract.clientId)?.name ?? "Cliente"} · {contract.feeType} · {money(contract.totalAmount)}</small><div className="card-tags"><StatusBadge tone={statusTone(contract.status)}>{contract.status}</StatusBadge><StatusBadge tone="gold">{contract.installments} parcelas</StatusBadge></div><Button variant="ghost" onClick={() => setEditingContract(contract)}>Editar contrato</Button></div>)}</div>
      </Panel>
      <Panel><PanelTitle title="Custas, guias e diligências" subtitle={`Pendências operacionais: ${money(pendingCosts)}.`} />
        <div className="stack-list">{state.costEntries.map((cost) => <div className="data-card" key={cost.id}><strong>{cost.category}</strong><small>{cost.description} · {money(cost.amount)} · vence {cost.dueDate}</small><div className="card-tags"><StatusBadge tone={statusTone(cost.status)}>{cost.status}</StatusBadge><StatusBadge tone="blue">{state.processes.find((p) => p.id === cost.processId)?.area ?? "Geral"}</StatusBadge></div><Button variant="ghost" onClick={() => setEditingCost(cost)}>Editar custa</Button></div>)}</div>
      </Panel>
    </div>
    <Panel>
      <PanelTitle title="Financeiro jurídico editável" subtitle="Contas a pagar/receber com edição completa, baixa, exclusão e exportação." action={<ActionBar><Button variant="ghost" onClick={() => exportCsv("financeiro-nex.csv", filtered as unknown as Record<string, unknown>[])}><Download size={15}/> CSV</Button><Button variant="ghost" onClick={() => setEditingContract({ id: uid("contract"), clientId: state.clients[0]?.id ?? "", processId: state.processes[0]?.id, title: "Contrato de honorários", feeType: "Contratual", totalAmount: 0, entryAmount: 0, installments: 1, status: "Rascunho" })}>Contrato</Button><Button variant="ghost" onClick={() => setEditingCost({ id: uid("cost"), clientId: state.clients[0]?.id, processId: state.processes[0]?.id, category: "Custas", description: "", amount: 0, dueDate: todayIso(), status: "Pendente" })}>Custa/Despesa</Button><Button onClick={() => setEditing(blankFinance(state.clients[0]?.name ?? "Escritório"))}><Plus size={16}/> Novo lançamento</Button></ActionBar>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, categoria, status, vencimento ou observação" /></div>
      <div className="responsive-table">
        <table><thead><tr><th>Tipo</th><th>Categoria</th><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>
          {filtered.map((entry) => <tr key={entry.id}><td>{entry.type}</td><td>{entry.category}</td><td>{entry.client}</td><td>{money(entry.amount)}</td><td>{entry.dueDate}</td><td>{entry.paidDate ?? "-"}</td><td><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={() => { history.pushState({}, "", `/financeiro/${entry.id}`); dispatchEvent(new Event("popstate")); }}>Detalhe</Button>{entry.status !== "Pago" && <Button variant="ghost" onClick={() => markPaid(entry)}>Dar baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteEntry(entry)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}
        </tbody></table>
      </div>
    </Panel>
    {editing && <EntityFormModal<FinanceEntry> open={!!editing} title={state.finances.some((item) => item.id === editing.id) ? "Editar lançamento financeiro" : "Novo lançamento financeiro"} subtitle="Todos os dados financeiros ficam editáveis e persistidos." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveEntry} />}
    {editingContract && <EntityFormModal<FeeContract> open={!!editingContract} title="Contrato de honorários" subtitle="Honorários contratuais, sucumbenciais, êxito, mensalidades e parcelamentos." value={editingContract} fields={contractFields} onClose={() => setEditingContract(null)} onSave={saveContract} />}
    {editingCost && <EntityFormModal<CostEntry> open={!!editingCost} title="Custa, guia ou diligência" subtitle="Despesas vinculadas a cliente, processo, área e centro de custo." value={editingCost} fields={costFields} onClose={() => setEditingCost(null)} onSave={saveCost} />}
  </div>;
}
