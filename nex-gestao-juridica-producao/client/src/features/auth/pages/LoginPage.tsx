import { useState } from "react";
import { Building2, IdCard, LockKeyhole, Mail, ShieldCheck, UserCog, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

type LoginProfile = "admin_master" | "funcionario" | "cliente";

const accessOptions: Array<{ key: LoginProfile; title: string; icon: typeof ShieldCheck }> = [
  { key: "admin_master", title: "Admin Master", icon: UserCog },
  { key: "funcionario", title: "Admin / Funcionário", icon: UsersRound },
  { key: "cliente", title: "Cliente", icon: UserRound },
];

export function LoginPage({ initialError }: { initialError?: string }) {
  const { signIn, signInClientPortal } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<LoginProfile>("admin_master");
  const [email, setEmail] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
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
    setError("");
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

  return <main className="auth-screen auth-screen-v43">
    <section className="auth-panel-v43" aria-label="Login Nex Gestão Jurídica">
      <div className="auth-brand-v43">
        <img src="/nexlabs-logo.jpeg" alt="NexLabs" />
        <div>
          <strong>Nex Gestão Jurídica</strong>
          <span>Powered by NexLabs</span>
        </div>
      </div>

      <div className="auth-title-v43">
        <h1>Acesse sua conta</h1>
        <p>Entre no painel jurídico com segurança.</p>
      </div>

      <div className="access-tabs-v43" role="tablist" aria-label="Tipo de acesso">
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

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={submit} className="auth-form auth-form-v43">
        {selectedProfile === "cliente" ? <>
          <label><UserRound size={16}/> Nome completo<input value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} required placeholder="Nome cadastrado" autoComplete="name" /></label>
          <label><IdCard size={16}/> CPF<input value={clientCpf} onChange={(e) => setClientCpf(e.target.value)} required placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" /></label>
          <Button type="submit" disabled={loading}>{loading ? "Validando..." : "Acessar portal"}</Button>
        </> : <>
          <label><Mail size={16}/> E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="seuemail@dominio.com" autoComplete="email" /></label>
          <label><LockKeyhole size={16}/> Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Digite sua senha" autoComplete="current-password" /></label>
          {selectedProfile === "funcionario" && <label><Building2 size={16}/> Matrícula da empresa<input value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} required placeholder="Ex.: 3272026" inputMode="numeric" autoComplete="off" /></label>}
          <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        </>}
      </form>

      <div className="auth-links auth-links-v43">
        <button type="button" onClick={() => setMode("reset")}>Esqueceu sua senha?</button>
        <button type="button" onClick={() => setMode("register")}>Primeiro acesso</button>
      </div>
    </section>
  </main>;
}
