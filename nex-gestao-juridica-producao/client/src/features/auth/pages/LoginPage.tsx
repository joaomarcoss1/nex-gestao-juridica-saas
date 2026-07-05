import { useState } from "react";
import { BriefcaseBusiness, Building2, IdCard, LockKeyhole, Mail, ShieldCheck, Sparkles, UserCog, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

type LoginProfile = "admin_master" | "funcionario" | "cliente";

const loginProfiles: Array<{ key: LoginProfile; title: string; label: string; icon: typeof ShieldCheck; description: string; email: string }> = [
  { key: "admin_master", title: "Admin Master Global", label: "Sem matrícula", icon: UserCog, description: "Cria empresas, admins, suporte global, auditoria e relatórios executivos.", email: "joaomarcosgpp@hotmail.com" },
  { key: "funcionario", title: "Admin/Funcionário", label: "Com matrícula", icon: BriefcaseBusiness, description: "Equipe interna entra com e-mail, senha e matrícula base da empresa.", email: "" },
  { key: "cliente", title: "Cliente", label: "Nome + CPF", icon: UserRound, description: "Portal simplificado por nome completo e CPF, sem senha e sem acesso interno.", email: "" },
];

export function LoginPage({ initialError }: { initialError?: string }) {
  const { signIn, signInClientPortal, isDemo } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<LoginProfile>("admin_master");
  const [email, setEmail] = useState("joaomarcosgpp@hotmail.com");
  const [registrationCode, setRegistrationCode] = useState("3272026");
  const [clientFullName, setClientFullName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  if (mode === "register") return <RegisterPage onBack={() => setMode("login")} />;
  if (mode === "reset") return <ResetPasswordPage onBack={() => setMode("login")} />;

  function chooseProfile(profile: LoginProfile) {
    setSelectedProfile(profile);
    if (profile !== "cliente") setEmail(loginProfiles.find((item) => item.key === profile)?.email || email);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      setLoading(true);
      if (selectedProfile === "cliente") await signInClientPortal(clientFullName, clientCpf);
      else await signIn(email, password, { demoRole: selectedProfile, registrationCode: selectedProfile === "funcionario" ? registrationCode : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-screen auth-screen-premium">
    <section className="auth-card auth-card-premium floating-card">
      <div className="auth-hero-brand">
        <img src="/nexlabs-logo.jpeg" alt="Logo NexLabs" />
        <div><strong>Nex Gestão Jurídica</strong><span>v4.2 · multiempresa premium</span></div>
      </div>
      <div className="auth-headline">
        <span><Sparkles size={15}/> Plataforma jurídica segura</span>
        <h1>Entrar com perfil, matrícula e isolamento de dados</h1>
        <p>Admin Master entra sem matrícula. Equipe interna valida a matrícula da empresa. Cliente acessa apenas pelo nome completo e CPF cadastrados.</p>
      </div>
      <div className="login-role-grid" role="tablist" aria-label="Tipo de acesso">
        {loginProfiles.map((profile) => {
          const Icon = profile.icon;
          return <button type="button" key={profile.key} className={selectedProfile === profile.key ? "selected" : ""} onClick={() => chooseProfile(profile.key)}>
            <Icon size={22}/><strong>{profile.title}</strong><span>{profile.label}</span><small>{profile.description}</small>
          </button>;
        })}
      </div>
      {isDemo ? <div className="security-note"><ShieldCheck size={16}/> Modo demo: use a matrícula 3272026 para simular empresa.</div> : <div className="security-note"><ShieldCheck size={16}/> Em produção, as permissões e o vínculo de empresa são validados no Supabase/RLS.</div>}
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={submit} className="auth-form">
        {selectedProfile === "cliente" ? <>
          <label><UserRound size={16}/> Nome completo do cliente<input value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} required placeholder="Digite exatamente o nome cadastrado" autoComplete="name" /></label>
          <label><IdCard size={16}/> CPF<input value={clientCpf} onChange={(e) => setClientCpf(e.target.value)} required placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" /></label>
          <Button type="submit" disabled={loading}>{loading ? "Validando portal..." : "Acessar portal do cliente"}</Button>
        </> : <>
          <label><Mail size={16}/> E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="admin@escritorio.com" autoComplete="email" /></label>
          <label><LockKeyhole size={16}/> Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="sua senha" autoComplete="current-password" /></label>
          {selectedProfile === "funcionario" && <label><Building2 size={16}/> Matrícula da empresa<input value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} required placeholder="3272026" inputMode="numeric" autoComplete="off" /></label>}
          <Button type="submit" disabled={loading}>{loading ? "Entrando..." : selectedProfile === "admin_master" ? "Entrar como Admin Master" : "Entrar com matrícula"}</Button>
        </>}
      </form>
      <div className="auth-links"><button onClick={() => setMode("register")}>Criar primeiro acesso / funcionário</button><button onClick={() => setMode("reset")}>Recuperar senha</button></div>
    </section>
  </main>;
}
