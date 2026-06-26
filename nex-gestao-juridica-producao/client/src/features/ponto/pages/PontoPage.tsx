import { useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, Fingerprint, ShieldCheck, UserCheck } from "lucide-react";
import type { FeaturePageProps, TimeKind, TimeRecord } from "@/types/app";
import { Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { minutesFromTime, nowTime, statusTone, todayIso, uid } from "@/utils/format";
import { verifyPin } from "@/utils/security";

const sequence: TimeKind[] = ["entrada", "saida_intervalo", "retorno_intervalo", "saida_final"];
const kindLabel: Record<TimeKind, string> = { entrada: "Entrada", saida_intervalo: "Saída intervalo", retorno_intervalo: "Retorno intervalo", saida_final: "Saída final" };

export function PontoPage({ state, commit, notify }: FeaturePageProps) {
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"Presencial" | "Remoto">("Presencial");
  const [justification, setJustification] = useState("");
  const employee = state.employees.find((e) => e.id === employeeId) ?? state.employees[0];
  const todayRecords = state.timeRecords.filter((r) => r.employeeId === employeeId && r.date === todayIso()).sort((a, b) => sequence.indexOf(a.kind) - sequence.indexOf(b.kind));
  const nextKind = sequence[todayRecords.length] ?? null;
  const expected = nextKind && employee ? employee.schedule[nextKind] : null;
  const lateMinutes = expected ? Math.abs(minutesFromTime(nowTime()) - minutesFromTime(expected)) : 0;
  const requiresJustification = lateMinutes > 30;

  const present = useMemo(() => new Set(state.timeRecords.filter((r) => r.date === todayIso() && r.kind === "entrada").map((r) => r.employeeId)).size, [state.timeRecords]);

  async function punch() {
    if (!employee || !nextKind) return;
    const ok = await verifyPin(pin, employee.pinHash);
    if (!ok) {
      notify({ tone: "error", title: "PIN inválido", message: "A batida foi bloqueada por segurança." });
      return;
    }
    if (requiresJustification && !justification.trim()) {
      notify({ tone: "error", title: "Justificativa obrigatória", message: "A diferença passou de 30 minutos." });
      return;
    }
    const record: TimeRecord = { id: uid("ponto"), employeeId: employee.id, employeeName: employee.name, sector: employee.sector, kind: nextKind, date: todayIso(), time: nowTime(), status: requiresJustification ? "justificado" : "normal", mode, location: mode === "Presencial" ? "Escritório matriz" : "Remoto informado", device: navigator.userAgent.slice(0, 90), justification: requiresJustification ? justification : undefined };
    await commit("timeRecords", record);
    setPin("");
    setJustification("");
    notify({ tone: "success", title: "Ponto registrado", message: `${kindLabel[nextKind]} às ${record.time}.` });
  }

  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={UserCheck} label="Presentes hoje" value={present} note="entradas registradas" tone="green"/><Kpi icon={AlarmClock} label="Justificativas" value={state.timeRecords.filter((r) => r.status === "justificado").length} note="fora da tolerância" tone="gold"/><Kpi icon={ShieldCheck} label="Sequência" value="Ativa" note="bloqueio de duplicidade" tone="blue"/><Kpi icon={Fingerprint} label="Próxima batida" value={nextKind ? kindLabel[nextKind] : "Completo"} note={expected ? `previsto ${expected}` : "jornada encerrada"} tone="purple"/></div>
    <div className="dashboard-layout secondary">
      <Panel><PanelTitle title="Terminal de ponto" subtitle="Tela frontal para funcionário: PIN, sequência correta e justificativa automática." /><div className="point-card">
        <Field label="Funcionário"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{state.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select></Field>
        <Field label="PIN"><input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Digite seu PIN" /></Field>
        <Field label="Modo"><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option>Presencial</option><option>Remoto</option></select></Field>
        {requiresJustification && <Field label="Justificativa"><textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Explique o atraso ou saída fora do horário" /></Field>}
        <Button onClick={punch} disabled={!nextKind}><Fingerprint size={18}/> {nextKind ? `Registrar ${kindLabel[nextKind]}` : "Jornada completa"}</Button>
      </div></Panel>
      <Panel><PanelTitle title="Espelho do dia" subtitle="Registros imutáveis para auditoria e RH." />{todayRecords.map((r) => <div className="task-row compact" key={r.id}><Fingerprint size={18}/><div><strong>{kindLabel[r.kind]}</strong><small>{r.employeeName} · {r.mode} · {r.location}</small></div><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge><span>{r.time}</span></div>)}</Panel>
    </div>
    <Panel><PanelTitle title="Registros recentes" subtitle="Base para folha gerencial, justificativas e aprovação de ajustes."/><div className="responsive-table"><table><thead><tr><th>Funcionário</th><th>Tipo</th><th>Data</th><th>Hora</th><th>Status</th><th>Justificativa</th></tr></thead><tbody>{state.timeRecords.map((r) => <tr key={r.id}><td>{r.employeeName}</td><td>{kindLabel[r.kind]}</td><td>{r.date}</td><td>{r.time}</td><td><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td><td>{r.justification ?? "-"}</td></tr>)}</tbody></table></div></Panel>
  </div>;
}
