import { useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";

export function RegisterPage({ onBack }: { onBack: () => void }) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await signUp(name, email, password);
      setMessage("Acesso criado ou vinculado ao cadastro da equipe. Volte ao login e entre com sua senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar. Verifique se o acesso está habilitado e se o e-mail foi cadastrado pela equipe.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-screen auth-screen-premium">
    <section className="auth-card auth-card-premium floating-card">
      <div className="auth-headline">
        <span>Primeiro acesso seguro</span>
        <h1>Criar acesso da equipe</h1>
        <p>Use o e-mail cadastrado pela gestão do escritório em Equipe. O sistema vincula seu usuário automaticamente ao perfil interno.</p>
      </div>
      {message && <div className="form-success">{message}</div>}
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={submit} className="auth-form">
        <label>Nome completo<input value={name} onChange={(e)=>setName(e.target.value)} required autoComplete="name" /></label>
        <label>E-mail<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required autoComplete="email" /></label>
        <label>Senha<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" minLength={6} required autoComplete="new-password" /></label>
        <Button type="submit" disabled={loading}>{loading ? "Criando acesso..." : "Criar e vincular acesso"}</Button>
      </form>
      <button className="link-button" onClick={onBack}>Voltar ao login</button>
    </section>
  </main>;
}
