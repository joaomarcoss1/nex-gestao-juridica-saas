import { useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

export function LoginPage({ initialError }: { initialError?: string }) {
  const { signIn, isDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  if (mode === "register") return <RegisterPage onBack={() => setMode("login")} />;
  if (mode === "reset") return <ResetPasswordPage onBack={() => setMode("login")} />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      setLoading(true);
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-card floating-card">
      <div className="brand auth-brand"><div className="brand-mark">NX</div><div><strong>Nex Gestão Jurídica</strong><span>NexLabs · Produção Segura</span></div></div>
      <h1>Entrar no escritório</h1>
      <p>Login com Supabase Auth, sessão persistente, perfil em users_profiles e permissões por função.</p>
      {isDemo && <div className="security-note"><ShieldCheck size={16}/> Modo demonstração ativo: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para exigir login real.</div>}
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={submit} className="auth-form">
        <label><Mail size={16}/> E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="admin@escritorio.com" /></label>
        <label><LockKeyhole size={16}/> Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="sua senha" /></label>
        <Button type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar com segurança"}</Button>
      </form>
      <div className="auth-links"><button onClick={() => setMode("register")}>Criar primeiro acesso</button><button onClick={() => setMode("reset")}>Recuperar senha</button></div>
    </section>
  </main>;
}
