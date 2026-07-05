import { useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, Download, FileSpreadsheet, Fingerprint, Plus, ShieldCheck, TimerReset, UserCheck, UsersRound } from "lucide-react";
import type { Employee, FeaturePageProps, PointAdjustmentRequest, PointJustification, TimeKind, TimeRecord } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { exportCsv, minutesFromTime, nowTime, statusTone, todayIso, uid } from "@/utils/format";
import { hashPin, verifyPin } from "@/utils/security";
import { useAuth } from "@/hooks/useAuth";

type WorkPunchKind = keyof Employee["schedule"];
const sequence: WorkPunchKind[] = ["entrada", "saida_intervalo", "retorno_intervalo", "saida_final"];
const kindLabel: Record<TimeKind, string> = {
  entrada: "Entrada",
  saida_intervalo: "Saída almoço",
  retorno_intervalo: "Retorno almoço",
  saida_final: "Encerrar expediente",
  ajuste_manual: "Ajuste manual",
  abono: "Abono",
  falta: "Falta",
  feriado: "Feriado",
  folga: "Folga",
  home_office: "Home office",
  justificativa: "Justificativa",
};
const statusOptions: TimeRecord["status"][] = ["normal", "justificado", "pendente_aprovacao", "aprovado", "reprovado", "abonado", "inconsistente"];
const adjustmentReasons = ["Esqueci saída para almoço", "Esqueci retorno do almoço", "Esqueci saída final", "Registrei errado", "Trabalhei em home office", "Estava em audiência externa", "Estava em diligência", "Problema técnico"];

function blankEmployee(): Employee {
  return { id: uid("emp"), organizationId: "demo", unit: "Matriz", department: "Administrativo", name: "", cpf: "", pinHash: "", role: "Funcionário", sector: "Administrativo", email: "", phone: "", oab: "", baseSalary: 0, hourlyRate: 0, schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" }, mode: "Presencial", contractType: "CLT", workDays: ["Seg", "Ter", "Qua", "Qui", "Sex"], toleranceMinutes: 30, status: "Ativo", score: 100 };
}

function timeDiffMinutes(actual: string, expected: string) {
  return minutesFromTime(actual) - minutesFromTime(expected);
}

export function PontoPage({ state, commit, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<TimeRecord["mode"]>("Presencial");
  const [justification, setJustification] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState(adjustmentReasons[0]);
  const [requestedTime, setRequestedTime] = useState(nowTime());
  const [editingAdjustment, setEditingAdjustment] = useState<PointAdjustmentRequest | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newPin, setNewPin] = useState("");
  const employee = state.employees.find((e) => e.id === employeeId) ?? state.employees[0];
  const todayRecords = state.timeRecords.filter((r) => r.employeeId === employeeId && r.date === todayIso() && sequence.includes(r.kind as WorkPunchKind)).sort((a, b) => sequence.indexOf(a.kind as WorkPunchKind) - sequence.indexOf(b.kind as WorkPunchKind));
  const nextKind = sequence[todayRecords.length] ?? null;
  const expected = nextKind && employee ? employee.schedule[nextKind] : null;
  const currentTime = nowTime();
  const tolerance = employee?.toleranceMinutes ?? 30;
  const delay = expected ? timeDiffMinutes(currentTime, expected) : 0;
  const requiresJustification = Boolean(expected && Math.abs(delay) > tolerance);
  const present = useMemo(() => new Set(state.timeRecords.filter((r) => r.date === todayIso() && r.kind === "entrada").map((r) => r.employeeId)).size, [state.timeRecords]);
  const atLunch = useMemo(() => state.employees.filter((emp) => {
    const records = state.timeRecords.filter((r) => r.employeeId === emp.id && r.date === todayIso() && sequence.includes(r.kind as WorkPunchKind));
    return records.some((r) => r.kind === "saida_intervalo") && !records.some((r) => r.kind === "retorno_intervalo");
  }).length, [state.employees, state.timeRecords]);
  const finished = useMemo(() => new Set(state.timeRecords.filter((r) => r.date === todayIso() && r.kind === "saida_final").map((r) => r.employeeId)).size, [state.timeRecords]);
  const absent = Math.max(0, state.employees.filter((e) => e.status === "Ativo").length - present);
  const pendingAdjustments = state.pointAdjustments.filter((record) => record.status === "Pendente");
  const pendingJustifications = state.pointJustifications.filter((record) => record.status === "Pendente");

  const adjustmentFields: FieldConfig<PointAdjustmentRequest>[] = [
    { key: "employeeId", label: "Colaborador", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
    { key: "date", label: "Data", kind: "date" },
    { key: "kind", label: "Tipo", kind: "select", options: Object.entries(kindLabel).map(([value, label]) => ({ value, label })) },
    { key: "requestedTime", label: "Horário solicitado" },
    { key: "reason", label: "Justificativa", kind: "textarea" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Aprovada", "Reprovada", "Abonada"] },
    { key: "approverId", label: "Aprovador", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
  ];
  const justificationFields: FieldConfig<PointJustification>[] = [
    { key: "employeeId", label: "Colaborador", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
    { key: "date", label: "Data", kind: "date" },
    { key: "reason", label: "Justificativa", kind: "textarea" },
    { key: "status", label: "Status", kind: "select", options: ["Pendente", "Aprovada", "Reprovada", "Abonada"] },
    { key: "approverId", label: "Aprovador", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
  ];
  const employeeFields: FieldConfig<Employee>[] = [
    { key: "name", label: "Nome", required: true },
    { key: "cpf", label: "CPF" },
    { key: "unit", label: "Unidade" },
    { key: "department", label: "Departamento" },
    { key: "role", label: "Cargo" },
    { key: "sector", label: "Setor" },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "phone", label: "Telefone" },
    { key: "oab", label: "OAB" },
    { key: "baseSalary", label: "Salário base", kind: "number" },
    { key: "hourlyRate", label: "Valor hora", kind: "number" },
    { key: "toleranceMinutes", label: "Tolerância em minutos", kind: "number" },
    { key: "mode", label: "Modo", kind: "select", options: ["Presencial", "Híbrido", "Remoto"] },
    { key: "contractType", label: "Tipo de contrato", kind: "select", options: ["CLT", "Associado", "Estágio", "Prestador", "Sócio"] },
    { key: "status", label: "Status", kind: "select", options: ["Ativo", "Férias", "Licença", "Inativo"] },
    { key: "score", label: "Score", kind: "number", min: 0, max: 100 },
  ];

  async function punch() {
    if (!employee || !nextKind) return;
    const ok = await verifyPin(pin, employee.pinHash);
    if (!ok) { notify({ tone: "error", title: "PIN inválido", message: "A batida foi bloqueada por segurança. O PIN não é exibido em texto aberto." }); return; }
    if (requiresJustification && !justification.trim()) { notify({ tone: "error", title: "Justificativa obrigatória", message: `A diferença passou da tolerância configurada de ${tolerance} minutos.` }); return; }
    const record: TimeRecord = {
      id: uid("ponto"), organizationId: profile?.organizationId ?? "demo", unit: employee.unit ?? "Matriz", department: employee.department ?? employee.sector,
      employeeId: employee.id, employeeName: employee.name, sector: employee.sector, kind: nextKind, date: todayIso(), time: nowTime(), expectedTime: expected ?? undefined,
      status: requiresJustification ? "justificado" : "normal", mode, location: mode === "Presencial" ? "Escritório matriz" : mode,
      device: navigator.userAgent.slice(0, 90), ip: "capturado pelo backend/Vercel", origin: "web", justification: requiresJustification ? justification : undefined,
    };
    await commit("timeRecords", record);
    if (requiresJustification) {
      await commit("pointJustifications", { id: uid("just"), employeeId: employee.id, timeRecordId: record.id, date: record.date, reason: justification, status: "Pendente" });
      await commit("automationRuns", { id: uid("run"), ruleId: "ponto-atraso", ruleName: "Ponto fora da tolerância gera justificativa", result: `Justificativa registrada para ${employee.name}`, date: todayIso(), status: "Sucesso", details: `${kindLabel[nextKind]} previsto ${expected}; registrado ${record.time}` });
    }
    setPin(""); setJustification("");
    notify({ tone: "success", title: "Ponto registrado", message: `${kindLabel[nextKind]} às ${record.time}.` });
  }

  async function requestAdjustment() {
    if (!employee) return;
    if (!justification.trim()) { notify({ tone: "error", title: "Justificativa obrigatória", message: "Explique o motivo da solicitação de ajuste." }); return; }
    const record: PointAdjustmentRequest = { id: uid("ajuste"), employeeId: employee.id, date: todayIso(), kind: "ajuste_manual", requestedTime, reason: `${adjustmentReason}: ${justification}`, status: "Pendente" };
    await commit("pointAdjustments", record);
    setJustification("");
    notify({ tone: "success", title: "Ajuste solicitado", message: "O registro original foi preservado e a solicitação ficou pendente para RH/Admin." });
  }

  async function approveAdjustment(record: PointAdjustmentRequest, status: "Aprovada" | "Reprovada" | "Abonada") {
    await commit("pointAdjustments", { ...record, status, approverId: profile?.id ?? "admin", approvedAt: new Date().toISOString() }, "update");
    notify({ tone: "success", title: status === "Aprovada" ? "Ajuste aprovado" : status === "Abonada" ? "Ponto abonado" : "Ajuste reprovado", message: "O registro original permaneceu imutável e a decisão ficou auditável." });
  }
  async function approveJustification(record: PointJustification, status: "Aprovada" | "Reprovada" | "Abonada") {
    await commit("pointJustifications", { ...record, status, approverId: profile?.id ?? "admin", decidedAt: new Date().toISOString() }, "update");
    notify({ tone: "success", title: "Justificativa analisada", message: `Status: ${status}.` });
  }
  async function saveAdjustment(record: PointAdjustmentRequest) {
    await commit("pointAdjustments", record, "update");
    setEditingAdjustment(null);
    notify({ tone: "success", title: "Solicitação atualizada" });
  }
  async function saveEmployee(employeeDraft: Employee) {
    const isNew = !state.employees.some((item) => item.id === employeeDraft.id);
    const pinHash = newPin.trim() ? await hashPin(newPin.trim()) : employeeDraft.pinHash;
    await commit("employees", { ...employeeDraft, pinHash, toleranceMinutes: employeeDraft.toleranceMinutes ?? 30 }, isNew ? "create" : "update");
    setNewPin(""); setEditingEmployee(null);
    notify({ tone: "success", title: isNew ? "Colaborador criado" : "Colaborador atualizado", message: newPin ? "PIN atualizado com hash seguro." : "Jornada, vínculo e permissões operacionais preservados." });
  }

  function exportPointCsv() {
    exportCsv("espelho-ponto-nex.csv", state.timeRecords.map((r) => ({ colaborador: r.employeeName, departamento: r.department ?? r.sector, data: r.date, hora: r.time, tipo: kindLabel[r.kind], status: r.status, justificativa: r.justification ?? "", aprovado_por: r.approvedBy ?? "" })));
    notify({ tone: "success", title: "Relatório CSV gerado", message: "Espelho de ponto exportado para conferência mensal." });
  }

  return <div className="page-grid ponto-enterprise-page">
    <div className="kpi-row">
      <Kpi icon={UserCheck} label="Presentes hoje" value={present} note="entradas registradas" tone="green"/>
      <Kpi icon={AlarmClock} label="Atrasos/justificativas" value={state.timeRecords.filter((r) => r.status === "justificado").length} note="fora da tolerância" tone="gold"/>
      <Kpi icon={TimerReset} label="Ajustes pendentes" value={pendingAdjustments.length} note="aprovação RH/Admin" tone="red"/>
      <Kpi icon={Fingerprint} label="Próxima ação" value={nextKind ? kindLabel[nextKind] : "Completo"} note={expected ? `previsto ${expected}` : "jornada encerrada"} tone="purple"/>
    </div>
    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Terminal de ponto corporativo" subtitle="PIN individual, sequência automática, justificativa fora da tolerância e registro imutável." />
        <div className="point-card point-terminal-premium">
          <div className="point-clock"><strong>{currentTime}</strong><span>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span></div>
          <Field label="Colaborador"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{state.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select></Field>
          {employee && <div className="journey-box"><span>Jornada prevista</span><strong>{employee.schedule.entrada} · {employee.schedule.saida_intervalo} · {employee.schedule.retorno_intervalo} · {employee.schedule.saida_final}</strong><small>Tolerância: {tolerance}min · {employee.unit ?? "Matriz"} · {employee.department ?? employee.sector}</small></div>}
          <div className="point-action-grid">{sequence.map((kind, index) => <button key={kind} className={nextKind === kind ? "active" : todayRecords.length > index ? "done" : ""} type="button"><CheckCircle2 size={16}/><span>{kindLabel[kind]}</span><small>{employee?.schedule[kind]}</small></button>)}</div>
          <Field label="PIN"><input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Digite seu PIN" /></Field>
          <Field label="Modo"><select value={mode} onChange={(e) => setMode(e.target.value as TimeRecord["mode"])}><option>Presencial</option><option>Remoto</option><option>Híbrido</option><option>Diligência externa</option><option>Audiência externa</option></select></Field>
          {requiresJustification && <Field label="Justificativa obrigatória"><textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Explique o atraso ou a marcação fora do horário previsto" /></Field>}
          <ActionBar><Button onClick={punch} disabled={!nextKind}><Fingerprint size={18}/> {nextKind ? `Registrar ${kindLabel[nextKind]}` : "Jornada completa"}</Button><Button variant="ghost" onClick={() => employee && setEditingEmployee(employee)}>Editar jornada</Button></ActionBar>
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Painel Admin/RH" subtitle="Presença, almoço, faltas, ajustes, jornadas e relatórios." action={<Button variant="gold" onClick={exportPointCsv}><Download size={15}/> CSV</Button>} />
        <div className="admin-point-grid">
          <div><strong>{present}</strong><span>presentes</span></div><div><strong>{atLunch}</strong><span>em almoço</span></div><div><strong>{finished}</strong><span>encerraram</span></div><div><strong>{absent}</strong><span>sem entrada</span></div>
        </div>
        <div className="stack-list point-adjust-form">
          <Field label="Motivo do ajuste"><select value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)}>{adjustmentReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></Field>
          <Field label="Horário solicitado"><input value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} placeholder="08:00" /></Field>
          <Field label="Justificativa"><textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Descreva o motivo do ajuste" /></Field>
          <Button variant="ghost" onClick={requestAdjustment}>Solicitar ajuste sem alterar original</Button>
        </div>
      </Panel>
    </div>
    <Panel>
      <PanelTitle title="Solicitações pendentes" subtitle="Ajustes e justificativas aprovados sem sobrescrever o registro original." />
      <div className="responsive-table"><table><thead><tr><th>Colaborador</th><th>Motivo</th><th>Data</th><th>Hora solicitada</th><th>Status</th><th>Ações</th></tr></thead><tbody>{pendingAdjustments.map((r) => <tr key={r.id}><td>{state.employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId}</td><td>{r.reason}</td><td>{r.date}</td><td>{r.requestedTime}</td><td><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={() => approveAdjustment(r, "Aprovada")}>Aprovar</Button><Button variant="ghost" onClick={() => approveAdjustment(r, "Abonada")}>Abonar</Button><Button variant="danger" onClick={() => approveAdjustment(r, "Reprovada")}>Reprovar</Button><Button variant="ghost" onClick={() => setEditingAdjustment(r)}>Editar</Button></ActionBar></td></tr>)}{pendingJustifications.map((j) => <tr key={j.id}><td>{state.employees.find((e) => e.id === j.employeeId)?.name ?? j.employeeId}</td><td>{j.reason}</td><td>{j.date}</td><td>-</td><td><StatusBadge tone={statusTone(j.status)}>{j.status}</StatusBadge></td><td><ActionBar><Button variant="ghost" onClick={() => approveJustification(j, "Aprovada")}>Aprovar</Button><Button variant="ghost" onClick={() => approveJustification(j, "Abonada")}>Abonar</Button><Button variant="danger" onClick={() => approveJustification(j, "Reprovada")}>Reprovar</Button></ActionBar></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel><PanelTitle title="Registros recentes" subtitle="Espelho de ponto individual, frequência mensal, atrasos, faltas, horas extras, ajustes e inconsistências." action={<ActionBar><Button variant="ghost" onClick={exportPointCsv}><FileSpreadsheet size={15}/> Exportar espelho</Button><Button onClick={() => setEditingEmployee(blankEmployee())}><Plus size={16}/> Novo colaborador</Button></ActionBar>} />
      <div className="responsive-table"><table><thead><tr><th>Funcionário</th><th>Tipo</th><th>Data</th><th>Hora</th><th>Status</th><th>Justificativa</th><th>Ações</th></tr></thead><tbody>{state.timeRecords.map((r) => <tr key={r.id}><td>{r.employeeName}<small>{r.department ?? r.sector}</small></td><td>{kindLabel[r.kind]}</td><td>{r.date}</td><td>{r.time}</td><td><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td><td>{r.justification ?? r.adjustmentReason ?? "-"}</td><td><StatusBadge tone="purple">Imutável</StatusBadge></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel><PanelTitle title="Colaboradores e jornadas" subtitle="Configuração por unidade, departamento, contrato, escala, gestor e tolerância." />
      <div className="performance-grid">{state.employees.map((emp) => <article className="performance-card" key={emp.id}><div><strong>{emp.name}</strong><span>{emp.role} · {emp.sector}</span></div><small>{emp.schedule.entrada} - {emp.schedule.saida_final} · intervalo {emp.schedule.saida_intervalo}/{emp.schedule.retorno_intervalo}</small><div className="card-tags"><StatusBadge tone={statusTone(emp.status)}>{emp.status}</StatusBadge><StatusBadge tone="blue">{emp.mode}</StatusBadge><StatusBadge tone="gold">PIN protegido</StatusBadge></div><ActionBar><Button variant="ghost" onClick={() => setEditingEmployee(emp)}><UsersRound size={14}/> Editar</Button></ActionBar></article>)}</div>
    </Panel>
    {editingAdjustment && <EntityFormModal<PointAdjustmentRequest> open={!!editingAdjustment} title="Solicitação de ajuste" subtitle="A decisão não altera batidas originais. A aprovação cria auditoria própria." value={editingAdjustment} fields={adjustmentFields} onClose={() => setEditingAdjustment(null)} onSave={saveAdjustment} />}
    {editingEmployee && <EntityFormModal<Employee> open={!!editingEmployee} title={state.employees.some((item) => item.id === editingEmployee.id) ? "Editar colaborador" : "Novo colaborador"} subtitle="Atualize dados profissionais, jornada, unidade, departamento e PIN protegido." value={editingEmployee} fields={employeeFields} onClose={() => { setEditingEmployee(null); setNewPin(""); }} onSave={saveEmployee} saveLabel="Salvar colaborador" />}
    {editingEmployee && <div className="pin-floating"><Field label="Novo PIN opcional"><input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Deixe vazio para manter" /></Field><small><ShieldCheck size={13}/> O PIN será salvo como hash. Não será exibido em texto aberto.</small></div>}
  </div>;
}
