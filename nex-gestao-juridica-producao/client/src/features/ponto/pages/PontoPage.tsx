import { useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, Edit3, Fingerprint, Plus, ShieldCheck, Trash2, UserCheck, UsersRound } from "lucide-react";
import type { Employee, FeaturePageProps, TimeKind, TimeRecord } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { minutesFromTime, nowTime, statusTone, todayIso, uid } from "@/utils/format";
import { hashPin, verifyPin } from "@/utils/security";

const sequence: TimeKind[] = ["entrada", "saida_intervalo", "retorno_intervalo", "saida_final"];
const kindLabel: Record<TimeKind, string> = { entrada: "Entrada", saida_intervalo: "Saída intervalo", retorno_intervalo: "Retorno intervalo", saida_final: "Saída final" };
const statusOptions: TimeRecord["status"][] = ["normal", "justificado", "pendente_aprovacao"];

function blankEmployee(): Employee {
  return { id: uid("emp"), name: "", cpf: "", pinHash: "", role: "Funcionário", sector: "Administrativo", email: "", phone: "", oab: "", baseSalary: 0, hourlyRate: 0, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Presencial", status: "Ativo", score: 100 };
}

export function PontoPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"Presencial" | "Remoto">("Presencial");
  const [justification, setJustification] = useState("");
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newPin, setNewPin] = useState("");
  const employee = state.employees.find((e) => e.id === employeeId) ?? state.employees[0];
  const todayRecords = state.timeRecords.filter((r) => r.employeeId === employeeId && r.date === todayIso()).sort((a, b) => sequence.indexOf(a.kind) - sequence.indexOf(b.kind));
  const nextKind = sequence[todayRecords.length] ?? null;
  const expected = nextKind && employee ? employee.schedule[nextKind] : null;
  const lateMinutes = expected ? Math.abs(minutesFromTime(nowTime()) - minutesFromTime(expected)) : 0;
  const requiresJustification = lateMinutes > 30;
  const present = useMemo(() => new Set(state.timeRecords.filter((r) => r.date === todayIso() && r.kind === "entrada").map((r) => r.employeeId)).size, [state.timeRecords]);

  const recordFields: FieldConfig<TimeRecord>[] = [
    { key: "employeeName", label: "Funcionário", readOnly: true },
    { key: "kind", label: "Tipo", kind: "select", options: sequence.map((kind) => ({ value: kind, label: kindLabel[kind] })) },
    { key: "date", label: "Data", kind: "date" },
    { key: "time", label: "Hora" },
    { key: "status", label: "Status", kind: "select", options: statusOptions },
    { key: "mode", label: "Modo", kind: "select", options: ["Presencial", "Remoto"] },
    { key: "location", label: "Local" },
    { key: "device", label: "Dispositivo" },
    { key: "justification", label: "Justificativa", kind: "textarea" },
  ];
  const employeeFields: FieldConfig<Employee>[] = [
    { key: "name", label: "Nome", required: true },
    { key: "cpf", label: "CPF" },
    { key: "role", label: "Cargo" },
    { key: "sector", label: "Setor" },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "phone", label: "Telefone" },
    { key: "oab", label: "OAB" },
    { key: "baseSalary", label: "Salário base", kind: "number" },
    { key: "hourlyRate", label: "Valor hora", kind: "number" },
    { key: "mode", label: "Modo", kind: "select", options: ["Presencial", "Híbrido", "Remoto"] },
    { key: "status", label: "Status", kind: "select", options: ["Ativo", "Férias", "Licença", "Inativo"] },
    { key: "score", label: "Score", kind: "number", min: 0, max: 100 },
  ];

  async function punch() {
    if (!employee || !nextKind) return;
    const ok = await verifyPin(pin, employee.pinHash);
    if (!ok) { notify({ tone: "error", title: "PIN inválido", message: "A batida foi bloqueada por segurança." }); return; }
    if (requiresJustification && !justification.trim()) { notify({ tone: "error", title: "Justificativa obrigatória", message: "A diferença passou de 30 minutos." }); return; }
    const record: TimeRecord = { id: uid("ponto"), employeeId: employee.id, employeeName: employee.name, sector: employee.sector, kind: nextKind, date: todayIso(), time: nowTime(), status: requiresJustification ? "justificado" : "normal", mode, location: mode === "Presencial" ? "Escritório matriz" : "Remoto informado", device: navigator.userAgent.slice(0, 90), justification: requiresJustification ? justification : undefined };
    await commit("timeRecords", record);
    if (requiresJustification) await commit("automationRuns", { id: uid("run"), ruleId: "ponto-atraso", ruleName: "Ponto com atraso abre justificativa", result: `Justificativa registrada para ${employee.name}`, date: todayIso(), status: "Sucesso" });
    setPin(""); setJustification("");
    notify({ tone: "success", title: "Ponto registrado", message: `${kindLabel[nextKind]} às ${record.time}.` });
  }

  async function saveRecord(record: TimeRecord) {
    await commit("timeRecords", record, "update");
    setEditingRecord(null);
    notify({ tone: "success", title: "Registro de ponto atualizado" });
  }
  async function deleteRecord(record: TimeRecord) {
    if (!confirm(`Excluir batida de ${record.employeeName} em ${record.date} ${record.time}?`)) return;
    await remove("timeRecords", record.id);
    notify({ tone: "info", title: "Registro removido" });
  }
  async function saveEmployee(employeeDraft: Employee) {
    const isNew = !state.employees.some((item) => item.id === employeeDraft.id);
    const pinHash = newPin.trim() ? await hashPin(newPin.trim()) : employeeDraft.pinHash;
    await commit("employees", { ...employeeDraft, pinHash }, isNew ? "create" : "update");
    setNewPin(""); setEditingEmployee(null);
    notify({ tone: "success", title: isNew ? "Funcionário criado" : "Funcionário atualizado", message: newPin ? "PIN atualizado com hash seguro." : "Cadastro salvo." });
  }

  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={UserCheck} label="Presentes hoje" value={present} note="entradas registradas" tone="green"/><Kpi icon={AlarmClock} label="Justificativas" value={state.timeRecords.filter((r) => r.status === "justificado").length} note="fora da tolerância" tone="gold"/><Kpi icon={ShieldCheck} label="Sequência" value="Ativa" note="bloqueio de duplicidade" tone="blue"/><Kpi icon={Fingerprint} label="Próxima batida" value={nextKind ? kindLabel[nextKind] : "Completo"} note={expected ? `previsto ${expected}` : "jornada encerrada"} tone="purple"/></div>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Terminal de ponto" subtitle="PIN, sequência correta, justificativa e comprovante." /><div className="point-card">
        <Field label="Funcionário"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{state.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select></Field>
        <Field label="PIN"><input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Digite seu PIN" /></Field>
        <Field label="Modo"><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option>Presencial</option><option>Remoto</option></select></Field>
        {requiresJustification && <Field label="Justificativa"><textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Explique o atraso ou saída fora do horário" /></Field>}
        <ActionBar><Button onClick={punch} disabled={!nextKind}><Fingerprint size={18}/> {nextKind ? `Registrar ${kindLabel[nextKind]}` : "Jornada completa"}</Button><Button variant="ghost" onClick={() => employee && setEditingEmployee(employee)}><Edit3 size={15}/> Editar funcionário</Button></ActionBar>
      </div></Panel>
      <Panel><PanelTitle title="Funcionários e folha gerencial" subtitle="Cadastros editáveis para ponto, folha e permissões." action={<Button onClick={() => setEditingEmployee(blankEmployee())}><Plus size={16}/> Novo funcionário</Button>} />{state.employees.map((emp) => <div className="task-row compact" key={emp.id}><UsersRound size={18}/><div><strong>{emp.name}</strong><small>{emp.role} · {emp.sector} · {emp.status}</small></div><StatusBadge tone={statusTone(emp.status)}>{emp.mode}</StatusBadge><ActionBar><Button variant="ghost" onClick={() => setEditingEmployee(emp)}><Edit3 size={14}/> Editar</Button></ActionBar></div>)}</Panel>
    </div>
    <Panel><PanelTitle title="Registros recentes" subtitle="Espelho editável para correções gerenciais com auditoria."/><div className="responsive-table"><table><thead><tr><th>Funcionário</th><th>Tipo</th><th>Data</th><th>Hora</th><th>Status</th><th>Justificativa</th><th>Ações</th></tr></thead><tbody>{state.timeRecords.map((r) => <tr key={r.id}><td>{r.employeeName}</td><td>{kindLabel[r.kind]}</td><td>{r.date}</td><td>{r.time}</td><td><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td><td>{r.justification ?? "-"}</td><td><ActionBar><Button variant="ghost" onClick={() => setEditingRecord(r)}><Edit3 size={14}/> Editar</Button><Button variant="danger" onClick={() => deleteRecord(r)}><Trash2 size={14}/></Button></ActionBar></td></tr>)}</tbody></table></div></Panel>
    {editingRecord && <EntityFormModal<TimeRecord> open={!!editingRecord} title="Editar registro de ponto" subtitle="Correções de RH ficam salvas e auditáveis." value={editingRecord} fields={recordFields} onClose={() => setEditingRecord(null)} onSave={saveRecord} />}
    {editingEmployee && <EntityFormModal<Employee> open={!!editingEmployee} title={state.employees.some((item) => item.id === editingEmployee.id) ? "Editar funcionário" : "Novo funcionário"} subtitle="Atualize dados profissionais. Para trocar PIN, preencha o campo abaixo antes de salvar." value={editingEmployee} fields={employeeFields} onClose={() => { setEditingEmployee(null); setNewPin(""); }} onSave={saveEmployee} saveLabel="Salvar funcionário" />}
    {editingEmployee && <div className="pin-floating"><Field label="Novo PIN opcional"><input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Deixe vazio para manter" /></Field></div>}
  </div>;
}
