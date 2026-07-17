
import { useMemo, useState } from "react";
import { Banknote, CircleDollarSign, Download, Edit3, Landmark, Plus, Receipt, Search, Trash2, WalletCards } from "lucide-react";
import type { CostEntry, FeaturePageProps, FeeContract, FinanceEntry, Payroll } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { exportCsv, money, statusTone, todayIso, uid } from "@/utils/format";
import { requestConfirmation } from "@/services/dialog.service";

const categories = ["Honorários", "Honorários contratuais", "Entrada de honorários", "Parcela de contrato", "Êxito", "Sucumbência", "Custas processuais", "Diligência", "Correspondente", "Sistemas jurídicos", "Marketing", "Aluguel", "Folha", "Impostos", "Despesa operacional", "Consultoria", "Outro"];
const statuses: FinanceEntry["status"][] = ["Pendente", "Parcial", "Pago", "Atrasado", "Cancelado", "Renegociado", "Estornado", "Baixado como perda", "Arquivado"];
const methods: FinanceEntry["method"][] = ["PIX", "Dinheiro", "Cartão", "Boleto", "Transferência", "Recorrente"];

type FinanceTab = "precificacao" | "folha-pagamento" | "folha-despesas";

function addDays(days: number) {
  return new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10);
}

function blankFinance(client: string, type: FinanceEntry["type"] = "Receita"): FinanceEntry {
  return { id: uid("fin"), type, category: type === "Receita" ? "Honorários" : "Despesa operacional", client, amount: 0, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: "" };
}

function blankContract(clientId = "", processId = ""): FeeContract {
  return { id: uid("fee"), clientId, processId, title: "Contrato de honorários", feeType: "Contratual", totalAmount: 0, entryAmount: 0, installments: 1, successPercent: 0, status: "Rascunho" };
}

function blankCost(): CostEntry {
  return { id: uid("cost"), clientId: "", processId: "", category: "Despesa interna", description: "", amount: 0, dueDate: todayIso(), status: "Pendente", responsibleId: "" };
}

function blankPayroll(employeeId: string, employeeName: string): Payroll {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  return { id: uid("payroll"), employeeId, employeeName, month, year, baseSalary: 0, workedHours: 0, overtime: 0, absences: 0, delays: 0, benefits: 0, discounts: 0, commissions: 0, gross: 0, net: 0, status: "Rascunho" };
}

export function FinanceiroPage({ state, commit, remove, executeAtomic, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [editingContract, setEditingContract] = useState<FeeContract | null>(null);
  const [editingCost, setEditingCost] = useState<CostEntry | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [tab, setTab] = useState<FinanceTab>("precificacao");
  const [query, setQuery] = useState("");

  const operational = state.finances.filter((f) => !f.archivedAt && !["Cancelado", "Arquivado", "Renegociado", "Estornado", "Baixado como perda"].includes(f.status));
  const revenue = operational.filter((f) => f.type === "Receita").reduce((acc, item) => acc + item.amount, 0);
  const expenses = operational.filter((f) => f.type === "Despesa").reduce((acc, item) => acc + item.amount, 0);
  const openReceivables = operational.filter((f) => f.type === "Receita" && ["Pendente", "Parcial", "Atrasado"].includes(f.status)).reduce((acc, item) => acc + Math.max(0, item.amount - (item.paidAmount ?? 0)), 0);
  const openExpenses = operational.filter((f) => f.type === "Despesa" && ["Pendente", "Parcial", "Atrasado"].includes(f.status)).reduce((acc, item) => acc + Math.max(0, item.amount - (item.paidAmount ?? 0)), 0);
  const contractTotal = state.feeContracts.reduce((acc, item) => acc + item.totalAmount, 0);
  const payrollForecast = state.payrolls.reduce((acc, item) => acc + (item.net || item.gross || item.baseSalary), 0);

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
    { key: "firstDueDate", label: "Primeiro vencimento", kind: "date" },
    { key: "dueDatePolicy", label: "Ajuste em dia não útil", kind: "select", options: [{ value: "next_business_day", label: "Próximo dia útil" }, { value: "previous_business_day", label: "Dia útil anterior" }, { value: "keep", label: "Manter data" }] },
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
  const payrollFields: FieldConfig<Payroll>[] = [
    { key: "employeeId", label: "Funcionário", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
    { key: "employeeName", label: "Nome" },
    { key: "month", label: "Mês", kind: "number" },
    { key: "year", label: "Ano", kind: "number" },
    { key: "baseSalary", label: "Salário base", kind: "number" },
    { key: "workedHours", label: "Horas trabalhadas", kind: "number" },
    { key: "overtime", label: "Horas extras", kind: "number" },
    { key: "absences", label: "Faltas", kind: "number" },
    { key: "delays", label: "Atrasos", kind: "number" },
    { key: "benefits", label: "Benefícios", kind: "number" },
    { key: "discounts", label: "Descontos", kind: "number" },
    { key: "commissions", label: "Comissões", kind: "number" },
    { key: "status", label: "Status", kind: "select", options: ["Rascunho", "Fechada", "Paga", "Assinada"] },
  ];

  async function saveEntry(entry: FinanceEntry) {
    const isNew = !state.finances.some((item) => item.id === entry.id);
    const normalizedEntry = { ...entry, paidDate: entry.status === "Pago" ? entry.paidDate || todayIso() : entry.paidDate };
    await commit("finances", normalizedEntry, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Lançamento criado" : "Lançamento atualizado", message: "Financeiro, dashboard e relatórios foram atualizados." });
  }

  async function deleteEntry(entry: FinanceEntry) {
    if (!await requestConfirmation("Arquivar lançamento", `O lançamento ${entry.category} - ${money(entry.amount)} será arquivado. Deseja continuar?`)) return;
    await remove("finances", entry.id);
    notify({ tone: "info", title: "Lançamento arquivado" });
  }

  async function markPaid(entry: FinanceEntry) {
    const balance = Math.max(0, Math.round((entry.amount - (entry.paidAmount ?? 0)) * 100));
    if (!balance) { notify({ tone: "info", title: "Lançamento já quitado" }); return; }
    await executeAtomic({ type: "registerPayment", financialEntryId: entry.id, amountCents: balance, paymentDate: todayIso(), paymentMethod: entry.method, idempotencyKey: `payment:${entry.id}:${entry.version ?? 0}:${balance}` });
    notify({ tone: "success", title: "Baixa registrada", message: "Pagamento e recibo foram criados uma única vez e o saldo foi recalculado." });
  }

  async function saveContract(contract: FeeContract) {
    await executeAtomic({ type: "saveFeeContract", contract: { ...contract, firstDueDate: contract.firstDueDate || todayIso(), dueDatePolicy: contract.dueDatePolicy || "next_business_day" }, idempotencyKey: `contract:${contract.id}:${contract.version ?? 0}` });
    setEditingContract(null);
    notify({ tone: "success", title: "Contrato salvo", message: "Parcelas existentes foram preservadas; cobranças só são geradas uma vez na ativação." });
  }

  async function saveCost(cost: CostEntry) {
    await executeAtomic({ type: "saveCostEntry", cost, idempotencyKey: `cost:${cost.id}:${cost.version ?? 0}` });
    setEditingCost(null);
    notify({ tone: "success", title: "Custa atualizada", message: "O lançamento vinculado foi criado ou atualizado sem duplicidade." });
  }

  async function savePayroll(payroll: Payroll) {
    const employee = state.employees.find((item) => item.id === payroll.employeeId);
    const gross = payroll.gross || payroll.baseSalary + payroll.benefits + payroll.commissions + payroll.overtime * 10;
    const net = payroll.net || gross - payroll.discounts - payroll.absences * 80 - payroll.delays * 20;
    await executeAtomic({ type: "savePayroll", payroll: { ...payroll, employeeName: payroll.employeeName || employee?.name || "Funcionário", gross, net }, idempotencyKey: `payroll:${payroll.employeeId}:${payroll.year}-${payroll.month}` });
    setEditingPayroll(null);
    notify({ tone: "success", title: "Folha atualizada", message: "Existe no máximo um lançamento por funcionário e competência." });
  }

  function exportFinancialCsv() {
    exportCsv("financeiro-nex-v48.csv", filtered.map((entry) => ({ tipo: entry.type, categoria: entry.category, cliente: entry.client, valor: entry.amount, vencimento: entry.dueDate, status: entry.status, forma: entry.method, observacoes: entry.notes ?? "" })));
    notify({ tone: "success", title: "CSV gerado", message: "Exportação financeira criada para conferência." });
  }

  return <div className="page-grid financeiro-page-v48">
    <div className="kpi-row">
      <Kpi icon={CircleDollarSign} label="Receitas" value={money(revenue)} note="honorários e cobranças" tone="green" />
      <Kpi icon={Banknote} label="Despesas" value={money(expenses)} note="folha, custas e operação" tone="red" />
      <Kpi icon={Landmark} label="Saldo previsto" value={money(revenue - expenses)} note="resultado gerencial" tone="blue" />
      <Kpi icon={Receipt} label="A receber" value={money(openReceivables)} note="cobranças pendentes" tone="gold" />
    </div>
    <Panel>
      <PanelTitle title="Gestão financeira do escritório" subtitle="Precificação, cobranças de processos, folha de pagamento e despesas em abas separadas." action={<Button variant="gold" onClick={exportFinancialCsv}><Download size={15}/> Exportar CSV</Button>} />
      <div className="module-tabs"><button className={tab === "precificacao" ? "active" : ""} onClick={() => setTab("precificacao")}>Precificação</button><button className={tab === "folha-pagamento" ? "active" : ""} onClick={() => setTab("folha-pagamento")}>Folha de pagamento</button><button className={tab === "folha-despesas" ? "active" : ""} onClick={() => setTab("folha-despesas")}>Folha de despesas</button></div>
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, processo, categoria, status, forma ou vencimento" /></div>
    </Panel>
    {tab === "precificacao" && <>
      <div className="dashboard-layout secondary">
        <Panel><PanelTitle title="Contratos de honorários e cobranças" subtitle={`Carteira contratada: ${money(contractTotal)} · contrato gera lançamentos automáticos.`} action={<Button onClick={() => setEditingContract(blankContract(state.clients[0]?.id, state.processes[0]?.id))}><Plus size={15}/> Novo contrato</Button>} />
          <div className="stack-list">{state.feeContracts.map((contract) => <div className="data-card" key={contract.id}><strong>{contract.title}</strong><small>{state.clients.find((client) => client.id === contract.clientId)?.name ?? "Cliente"} · {contract.feeType} · {money(contract.totalAmount)}</small><div className="card-tags"><StatusBadge tone={statusTone(contract.status)}>{contract.status}</StatusBadge><StatusBadge tone="gold">{contract.installments} parcelas</StatusBadge></div><Button variant="ghost" onClick={() => setEditingContract(contract)}><Edit3 size={14}/> Editar</Button></div>)}</div>
        </Panel>
        <Panel><PanelTitle title="Cobranças dos processos" subtitle={`Em aberto: ${money(openReceivables)} · entradas, parcelas, êxito e sucumbência.`} action={<Button onClick={() => setEditing(blankFinance(state.clients[0]?.name ?? "Cliente", "Receita"))}><Plus size={15}/> Nova cobrança</Button>} />
          <div className="stack-list">{filtered.filter((entry) => entry.type === "Receita").slice(0, 10).map((entry) => <div className="data-card" key={entry.id}><strong>{entry.category}</strong><small>{entry.client} · {entry.dueDate} · {money(entry.amount)}</small><div className="card-tags"><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge><StatusBadge tone="blue">{entry.method}</StatusBadge></div><ActionBar>{["Pendente", "Parcial", "Atrasado"].includes(entry.status) && <Button variant="gold" onClick={() => markPaid(entry)}>Dar baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}>Editar</Button></ActionBar></div>)}</div>
        </Panel>
      </div>
    </>}
    {tab === "folha-pagamento" && <>
      <Panel><PanelTitle title="Folha de pagamento" subtitle={`Previsão de folha: ${money(payrollForecast)} · salários, benefícios, descontos, comissões e status de pagamento.`} action={<Button onClick={() => { const emp = state.employees[0]; setEditingPayroll(blankPayroll(emp?.id ?? "", emp?.name ?? "")); }}><WalletCards size={15}/> Nova folha</Button>} />
        <div className="stack-list">{state.payrolls.map((payroll) => <div className="data-card" key={payroll.id}><strong>{payroll.employeeName}</strong><small>{payroll.month}/{payroll.year} · líquido {money(payroll.net || payroll.gross || payroll.baseSalary)}</small><div className="card-tags"><StatusBadge tone={statusTone(payroll.status)}>{payroll.status}</StatusBadge><StatusBadge tone="blue">{payroll.workedHours}h</StatusBadge></div><Button variant="ghost" onClick={() => setEditingPayroll(payroll)}>Editar</Button></div>)}</div>
      </Panel>
    </>}
    {tab === "folha-despesas" && <>
      <div className="dashboard-layout secondary">
        <Panel><PanelTitle title="Folha de despesas" subtitle={`Despesas em aberto: ${money(openExpenses)} · custas, diligências, fornecedores, sistemas e despesas internas.`} action={<Button onClick={() => setEditingCost(blankCost())}><Plus size={15}/> Nova despesa</Button>} />
          <div className="stack-list">{state.costEntries.map((cost) => <div className="data-card" key={cost.id}><strong>{cost.description}</strong><small>{cost.category} · {cost.dueDate} · {money(cost.amount)}</small><div className="card-tags"><StatusBadge tone={statusTone(cost.status)}>{cost.status}</StatusBadge></div><Button variant="ghost" onClick={() => setEditingCost(cost)}>Editar</Button></div>)}</div>
        </Panel>
        <Panel><PanelTitle title="Agendamentos de pagamentos" subtitle="Contas, salários e despesas futuras organizadas por vencimento." />
          <div className="stack-list">{filtered.filter((entry) => entry.type === "Despesa").slice(0, 10).map((entry) => <div className="data-card" key={entry.id}><strong>{entry.category}</strong><small>{entry.client} · vencimento {entry.dueDate} · {money(entry.amount)}</small><div className="card-tags"><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge><StatusBadge tone="blue">{entry.method}</StatusBadge></div><ActionBar>{["Pendente", "Parcial", "Atrasado"].includes(entry.status) && <Button variant="gold" onClick={() => markPaid(entry)}>Dar baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}>Editar</Button></ActionBar></div>)}</div>
        </Panel>
      </div>
    </>}
    <Panel><PanelTitle title="Lançamentos financeiros" subtitle="Receitas e despesas vinculadas a cliente, processo, contrato, folha ou centro de custo." action={<ActionBar><Button variant="ghost" onClick={() => setEditing(blankFinance("Escritório", "Despesa"))}>Nova despesa</Button><Button onClick={() => setEditing(blankFinance(state.clients[0]?.name ?? "Cliente", "Receita"))}>Nova receita</Button></ActionBar>} />
      <div className="finance-mobile-ledger stack-list">{filtered.map((entry) => <article className="data-card" key={`mobile-${entry.id}`}><div className="mobile-card-heading"><strong>{entry.category}</strong><StatusBadge tone={entry.type === "Receita" ? "green" : "red"}>{entry.type}</StatusBadge></div><small>{entry.client} · vencimento {entry.dueDate}</small><b>{money(entry.amount)}</b><div className="card-tags"><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge><StatusBadge tone="blue">{entry.method}</StatusBadge></div><ActionBar>{["Pendente", "Parcial", "Atrasado"].includes(entry.status) && <Button variant="gold" onClick={() => markPaid(entry)}>Dar baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}><Edit3 size={14}/> Editar</Button><Button variant="danger" onClick={() => deleteEntry(entry)}><Trash2 size={14}/> Arquivar</Button></ActionBar></article>)}</div><div className="responsive-table finance-desktop-ledger"><table><thead><tr><th>Tipo</th><th>Categoria</th><th>Cliente/Centro</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.id}><td>{entry.type}</td><td>{entry.category}</td><td>{entry.client}</td><td>{money(entry.amount)}</td><td>{entry.dueDate}</td><td><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></td><td><ActionBar>{entry.status !== "Pago" && <Button variant="gold" onClick={() => markPaid(entry)}>Baixa</Button>}<Button variant="ghost" onClick={() => setEditing(entry)}><Edit3 size={14}/></Button><Button variant="danger" onClick={() => deleteEntry(entry)}><Trash2 size={14}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    </Panel>
    {editing && <EntityFormModal<FinanceEntry> open={!!editing} title="Lançamento financeiro" subtitle="Cobrança, recebimento ou despesa com vínculo a cliente/processo." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveEntry} />}
    {editingContract && <EntityFormModal<FeeContract> open={!!editingContract} title="Contrato de honorários" subtitle="Ao marcar como assinado/ativo, o sistema gera cobranças do processo." value={editingContract} fields={contractFields} onClose={() => setEditingContract(null)} onSave={saveContract} />}
    {editingCost && <EntityFormModal<CostEntry> open={!!editingCost} title="Despesa, custa ou reembolso" subtitle="Controle de despesas do processo e do escritório." value={editingCost} fields={costFields} onClose={() => setEditingCost(null)} onSave={saveCost} />}
    {editingPayroll && <EntityFormModal<Payroll> open={!!editingPayroll} title="Folha de pagamento" subtitle="Gera despesa gerencial e acompanha salário, benefícios, descontos e status." value={editingPayroll} fields={payrollFields} onClose={() => setEditingPayroll(null)} onSave={savePayroll} />}
  </div>;
}
