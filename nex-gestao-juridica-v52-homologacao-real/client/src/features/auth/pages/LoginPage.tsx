
import { useEffect, useMemo, useState } from "react";
import { Building2, Fingerprint, IdCard, LockKeyhole, Mail, ShieldCheck, UserCog, UserRound, UsersRound } from "lucide-react";
import { Button, Field, StatusBadge } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import type { AppState, Employee, TimeKind, TimeRecord } from "@/types/app";
import { loadLocalState, saveLocalState } from "@/services/normalizedRepository";
import { supabase } from "@/services/supabase";
import { todayIso, uid } from "@/utils/format";
import { verifyPin } from "@/utils/security";

type LoginProfile = "ponto" | "admin_master" | "funcionario" | "cliente";

type PublicEmployee = Pick<Employee, "id" | "name" | "role" | "sector" | "pinHash" | "schedule" | "mode" | "organizationId"> & { registrationCode?: string };

const accessOptions: Array<{ key: LoginProfile; title: string; icon: typeof ShieldCheck }> = [
  { key: "ponto", title: "Ponto rápido", icon: Fingerprint },
  { key: "funcionario", title: "Equipe do escritório", icon: UsersRound },
  { key: "cliente", title: "Cliente", icon: UserRound },
];

const sequence: TimeKind[] = ["entrada", "saida_intervalo", "retorno_intervalo", "saida_final"];
const kindLabel: Record<TimeKind, string> = {
  entrada: "Entrada",
  saida_intervalo: "Saída intervalo",
  retorno_intervalo: "Retorno intervalo",
  saida_final: "Saída final",
  ajuste_manual: "Ajuste manual",
  abono: "Abono",
  falta: "Falta",
  feriado: "Feriado",
  folga: "Folga",
  home_office: "Home office",
  justificativa: "Justificativa",
};

function currentHourMinute() {
  return new Date().toTimeString().slice(0, 5);
}

function expectedFor(employee: PublicEmployee | undefined, kind: TimeKind | null) {
  if (!employee || !kind || !(kind in employee.schedule)) return "";
  return employee.schedule[kind as keyof Employee["schedule"]] ?? "";
}

function minutesOf(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getNextKind(records: TimeRecord[]) {
  return sequence.find((kind) => !records.some((record) => record.kind === kind)) ?? null;
}

function isOutsideTolerance(now: string, expected: string, tolerance = 30) {
  if (!expected) return false;
  return Math.abs(minutesOf(now) - minutesOf(expected)) > tolerance;
}

export function LoginPage({ initialError }: { initialError?: string }) {
  const { signIn, signInClientPortal } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<LoginProfile>("ponto");
  const [email, setEmail] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [clientFullName, setClientFullName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientRegistrationCode, setClientRegistrationCode] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  if (mode === "register") return <RegisterPage onBack={() => setMode("login")} />;
  if (mode === "reset") return <ResetPasswordPage onBack={() => setMode("login")} />;

  function chooseProfile(profile: LoginProfile) {
    setSelectedProfile(profile);
    setError("");
    setNotice("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedProfile === "ponto") return;
    try {
      setError("");
      setNotice("");
      setLoading(true);
      if (selectedProfile === "cliente") {
        await signInClientPortal(clientFullName, clientCpf, clientEmail, clientRegistrationCode);
        setNotice("Se os dados estiverem corretos, enviamos um link de acesso seguro ao seu e-mail. Abra o link neste dispositivo para entrar no portal.");
        return;
      }
      else await signIn(email, password, { demoRole: selectedProfile, registrationCode: selectedProfile === "funcionario" ? registrationCode : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-screen auth-screen-v43 auth-screen-v48">
    <section className="auth-panel-v43 auth-panel-v48" aria-label="Login Nex Gestão Jurídica">
      <div className="auth-brand-v43">
        <img src="/nexlabs-logo.jpeg" alt="NexLabs" />
        <div>
          <strong>Nex Gestão Jurídica</strong>
          <span>CRM jurídico · Processos · Equipe · Agenda</span>
        </div>
      </div>

      <div className="auth-title-v43">
        <h1>{selectedProfile === "ponto" ? "Ponto rápido" : "Acesse sua conta"}</h1>
        <p>{selectedProfile === "ponto" ? "Registro de jornada rápido para a equipe, sem abrir o painel administrativo." : "Entre no ambiente de trabalho do escritório."}</p>
      </div>

      <div className="access-tabs-v43 access-tabs-v48" role="tablist" aria-label="Tipo de acesso">
        {accessOptions.map((option) => {
          const Icon = option.icon;
          return <button
            type="button"
            role="tab"
            aria-selected={selectedProfile === option.key}
            key={option.key}
            className={selectedProfile === option.key ? "active" : ""}
            onClick={() => chooseProfile(option.key)}
          >
            <Icon size={17}/>
            <span>{option.title}</span>
          </button>;
        })}
      </div>
        <button
          type="button"
          className="admin-master-discreet"
          onClick={() => chooseProfile("admin_master")}
          aria-label="Acesso interno restrito"
          title="Acesso interno restrito"
        >
          acesso interno
        </button>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success" role="status">{notice}</div>}

      {selectedProfile === "ponto" ? <PublicPointTerminal onError={setError} /> : <form onSubmit={submit} className="auth-form auth-form-v43">
        {selectedProfile === "cliente" ? <>
          <label><UserRound size={16}/> Nome completo<input value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} required placeholder="Nome cadastrado" autoComplete="name" /></label>
          <label><IdCard size={16}/> CPF<input value={clientCpf} onChange={(e) => setClientCpf(e.target.value)} required placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" /></label>
          <label><Mail size={16}/> E-mail cadastrado<input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" required placeholder="cliente@email.com" autoComplete="email" /></label>
          <label><Building2 size={16}/> Código do escritório <span className="optional-label">opcional</span><input value={clientRegistrationCode} onChange={(e) => setClientRegistrationCode(e.target.value)} placeholder="Código recebido do escritório" inputMode="numeric" autoComplete="off" /></label>
          <Button type="submit" disabled={loading}>{loading ? "Enviando link..." : "Receber link seguro"}</Button>
        </> : <>
          <label><Mail size={16}/> E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="seuemail@dominio.com" autoComplete="email" /></label>
          <label><LockKeyhole size={16}/> Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Digite sua senha" autoComplete="current-password" /></label>
          {selectedProfile === "funcionario" && <label><Building2 size={16}/> Código do escritório<input value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} required placeholder="Informe o código recebido" inputMode="numeric" autoComplete="off" /></label>}
          <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar no painel"}</Button>
        </>}
      </form>}

      <div className="auth-links auth-links-v43">
        <button type="button" onClick={() => setMode("reset")}>Esqueceu sua senha?</button>
        <button type="button" onClick={() => setMode("register")}>Primeiro acesso</button>
      </div>
    </section>
  </main>;
}

function PublicPointTerminal({ onError }: { onError: (message: string) => void }) {
  const [state, setState] = useState<AppState>(() => loadLocalState());
  const [companyCode, setCompanyCode] = useState(state.organizations[0]?.registrationCode ?? "3272026");
  const [employees, setEmployees] = useState<PublicEmployee[]>(() => state.employees);
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<TimeRecord["mode"]>("Presencial");
  const [justification, setJustification] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(currentHourMinute());

  useEffect(() => {
    const id = window.setInterval(() => setClock(currentHourMinute()), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPublicEmployees() {
      if (!supabase || companyCode.trim().length < 4) {
        const local = loadLocalState();
        if (!mounted) return;
        setState(local);
        setEmployees(local.employees);
        setEmployeeId((current) => current || local.employees[0]?.id || "");
        return;
      }
      const { data, error } = await supabase.rpc("public_point_employees", { p_registration_code: companyCode.trim() });
      if (!mounted) return;
      if (error) {
        setStatus("Não foi possível carregar colaboradores agora. Confira o código do escritório ou tente novamente.");
        return;
      }
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map((row: any) => ({
        id: String(row.id),
        organizationId: String(row.organization_id ?? ""),
        name: String(row.name ?? row.full_name ?? "Colaborador"),
        role: String(row.role ?? "Funcionário"),
        sector: String(row.sector ?? row.department ?? "Operacional"),
        pinHash: String(row.pin_hash ?? ""),
        mode: "Presencial" as const,
        registrationCode: companyCode,
        schedule: {
          entrada: String(row.entrada ?? "08:00"),
          saida_intervalo: String(row.saida_intervalo ?? "12:00"),
          retorno_intervalo: String(row.retorno_intervalo ?? "14:00"),
          saida_final: String(row.saida_final ?? "18:00"),
        },
      }));
      setEmployees(mapped);
      setEmployeeId(mapped[0]?.id ?? "");
    }
    void loadPublicEmployees();
    return () => { mounted = false; };
  }, [companyCode]);

  const employee = employees.find((item) => item.id === employeeId);
  const todayRecords = useMemo(() => state.timeRecords.filter((record) => record.employeeId === employeeId && record.date === todayIso()).sort((a, b) => a.time.localeCompare(b.time)), [state.timeRecords, employeeId]);
  const nextKind = getNextKind(todayRecords);
  const expected = expectedFor(employee, nextKind);
  const requiresJustification = isOutsideTolerance(clock, expected, 30);

  async function punch() {
    if (!employee || !nextKind) return;
    if (requiresJustification && justification.trim().length < 8) {
      onError("Informe uma justificativa para marcação fora da tolerância.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      if (supabase && companyCode.trim()) {
        const { error } = await supabase.rpc("public_point_punch", {
          p_registration_code: companyCode.trim(),
          p_employee_id: employee.id,
          p_pin: pin,
          p_kind: nextKind,
          p_mode: mode,
          p_justification: justification.trim() || null,
        });
        if (error) throw error;
        setStatus(`${kindLabel[nextKind]} registrada às ${clock}.`);
      } else {
        const ok = await verifyPin(pin, employee.pinHash);
        if (!ok) throw new Error("PIN inválido.");
        const nextState = loadLocalState();
        const localRecord: TimeRecord = {
          id: uid("public-point"),
          organizationId: employee.organizationId,
          employeeId: employee.id,
          employeeName: employee.name,
          sector: employee.sector,
          kind: nextKind,
          date: todayIso(),
          time: clock,
          status: requiresJustification ? "pendente_aprovacao" : "normal",
          mode,
          location: "Terminal público de ponto",
          origin: "web",
          expectedTime: expected,
          device: navigator.userAgent.slice(0, 90),
          justification: justification.trim() || undefined,
          consentLgpd: true,
        };
        const updated = { ...nextState, timeRecords: [localRecord, ...nextState.timeRecords] };
        saveLocalState(updated);
        setState(updated);
        setStatus(`${kindLabel[nextKind]} registrada localmente às ${clock}.`);
      }
      setPin("");
      setJustification("");
      onError("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Não foi possível registrar o ponto.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="public-point-box">
    <div className="public-point-clock"><strong>{clock}</strong><span>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span></div>
    <Field label="Código do escritório"><input value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} inputMode="numeric" placeholder="Informe o código recebido" /></Field>
    <Field label="Colaborador"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.role}</option>)}</select></Field>
    {employee && <div className="public-journey"><span>Jornada prevista</span><strong>{employee.schedule.entrada} · {employee.schedule.saida_intervalo} · {employee.schedule.retorno_intervalo} · {employee.schedule.saida_final}</strong></div>}
    <div className="public-point-sequence">{sequence.map((kind) => <span key={kind} className={kind === nextKind ? "active" : todayRecords.some((record) => record.kind === kind) ? "done" : ""}>{kindLabel[kind]}</span>)}</div>
    <Field label="PIN"><input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="Digite seu PIN" inputMode="numeric" /></Field>
    <Field label="Modo"><select value={mode} onChange={(e) => setMode(e.target.value as TimeRecord["mode"])}><option>Presencial</option><option>Remoto</option><option>Híbrido</option><option>Diligência externa</option><option>Audiência externa</option></select></Field>
    {requiresJustification && <Field label="Justificativa obrigatória"><textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder={`Horário previsto ${expected}. Explique o motivo.`} /></Field>}
    <Button onClick={punch} disabled={!employee || !nextKind || busy}><Fingerprint size={17}/> {nextKind ? `Registrar ${kindLabel[nextKind]}` : "Jornada completa"}</Button>
    {status && <div className="public-point-status"><StatusBadge tone="green">Registrado</StatusBadge><span>{status}</span></div>}
    <small className="public-point-note">Depois do ponto, use as abas acima para entrar no painel administrativo, do funcionário ou no portal do cliente.</small>
  </div>;
}
