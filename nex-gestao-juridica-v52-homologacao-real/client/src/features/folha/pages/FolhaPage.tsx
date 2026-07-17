import { useMemo, useState } from "react";
import { Download, Edit3, FileSpreadsheet, Plus, Search, Trash2, WalletCards } from "lucide-react";
import type { FeaturePageProps, Payroll } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { exportCsv, money, statusTone, uid } from "@/utils/format";
import { requestConfirmation } from "@/services/dialog.service";

const statuses: Payroll["status"][] = ["Rascunho", "Fechada", "Paga", "Assinada"];
function currentMonth() { return new Date().getMonth() + 1; }
function currentYear() { return new Date().getFullYear(); }
function blankPayroll(employeeId: string, employeeName: string): Payroll {
  return { id: uid("folha"), employeeId, employeeName, month: currentMonth(), year: currentYear(), baseSalary: 0, workedHours: 0, overtime: 0, absences: 0, delays: 0, benefits: 0, discounts: 0, commissions: 0, gross: 0, net: 0, status: "Rascunho" };
}
function compute(p: Payroll): Payroll {
  const hourly = p.baseSalary / 176;
  const overtimeValue = p.overtime * hourly * 1.5;
  const absenceDiscount = p.absences * (p.baseSalary / 30);
  const delayDiscount = p.delays * hourly;
  const gross = p.baseSalary + p.benefits + p.commissions + overtimeValue;
  const net = gross - p.discounts - absenceDiscount - delayDiscount;
  return { ...p, gross: Math.round(gross * 100) / 100, net: Math.round(Math.max(0, net) * 100) / 100 };
}
export function FolhaPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return state.payrolls.filter((p) => !p.archivedAt && [p.employeeName, p.status, p.month, p.year].some((v) => String(v).toLowerCase().includes(q)));
  }, [query, state.payrolls]);
  const fields: FieldConfig<Payroll>[] = [
    { key: "employeeId", label: "Funcionário", kind: "select", options: state.employees.map((e)=>({ value: e.id, label: e.name })) },
    { key: "employeeName", label: "Nome do funcionário" },
    { key: "month", label: "Mês", kind: "number", min: 1, max: 12 },
    { key: "year", label: "Ano", kind: "number" },
    { key: "baseSalary", label: "Salário base", kind: "number" },
    { key: "workedHours", label: "Horas trabalhadas", kind: "number" },
    { key: "overtime", label: "Horas extras", kind: "number" },
    { key: "absences", label: "Faltas", kind: "number" },
    { key: "delays", label: "Atrasos em horas", kind: "number" },
    { key: "benefits", label: "Benefícios", kind: "number" },
    { key: "discounts", label: "Descontos", kind: "number" },
    { key: "commissions", label: "Comissões/bonificações", kind: "number" },
    { key: "status", label: "Status", kind: "select", options: statuses },
  ];
  async function save(payroll: Payroll) {
    const employee = state.employees.find((e)=>e.id===payroll.employeeId);
    const normalized = compute({ ...payroll, employeeName: payroll.employeeName || employee?.name || "Funcionário" });
    const isNew = !state.payrolls.some((p)=>p.id===payroll.id);
    await commit("payrolls", normalized, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Folha criada" : "Folha atualizada", message: "Cálculo gerencial recalculado e salvo." });
  }
  function exportPayroll() {
    exportCsv("folha-gerencial-nex.csv", filtered as unknown as Record<string, unknown>[]);
    notify({ tone: "success", title: "Folha exportada", message: "CSV gerado pelo navegador." });
  }
  async function deletePayroll(p: Payroll) {
    if (!await requestConfirmation("Arquivar folha", `A folha de ${p.employeeName} será arquivada, preservando o histórico. Deseja continuar?`)) return;
    await remove("payrolls", p.id);
    notify({ tone: "info", title: "Folha removida" });
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={FileSpreadsheet} label="Folhas" value={filtered.length} note="gerenciais" tone="blue"/><Kpi icon={WalletCards} label="Total líquido" value={money(filtered.reduce((a,b)=>a+b.net,0))} note="período atual" tone="green"/><Kpi icon={Download} label="Exportação" value="PDF/CSV" note="holerite gerencial" tone="gold"/></div>
    <Panel><PanelTitle title="Folha gerencial editável" subtitle="Cálculo gerencial com ponto, horas extras, benefícios, descontos e holerite. Não substitui a contabilidade trabalhista." action={<ActionBar><Button variant="ghost" onClick={exportPayroll}><Download size={15}/> Exportar</Button><Button onClick={()=>{ const e=state.employees[0]; setEditing(blankPayroll(e?.id??"", e?.name??"")); }}><Plus size={16}/> Nova folha</Button></ActionBar>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar funcionário, status, mês ou ano" /></div>
    </Panel>
    <div className="responsive-table"><table><thead><tr><th>Funcionário</th><th>Período</th><th>Bruto</th><th>Descontos</th><th>Líquido</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((p)=><tr key={p.id}><td>{p.employeeName}<small>{p.workedHours}h trabalhadas · {p.overtime}h extras</small></td><td>{String(p.month).padStart(2,"0")}/{p.year}</td><td>{money(p.gross)}</td><td>{money(p.discounts)}</td><td>{money(p.net)}</td><td><StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={()=>setEditing(p)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={()=>deletePayroll(p)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    {editing && <EntityFormModal<Payroll> open={!!editing} title={state.payrolls.some((p)=>p.id===editing.id)?"Editar folha":"Nova folha"} subtitle="Ajuste horas, faltas, benefícios, descontos e status." value={editing} fields={fields} onClose={()=>setEditing(null)} onSave={save} />}
  </div>;
}
