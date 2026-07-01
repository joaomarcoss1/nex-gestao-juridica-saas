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
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await signUp(name, email, password);
      setMessage("Cadastro enviado. Verifique o e-mail ou faça login caso a confirmação esteja desativada no Supabase.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    }
  }
  return <main className="auth-screen"><section className="auth-card floating-card"><h1>Primeiro acesso</h1><p>Cria usuário no Supabase Auth. Se o RLS estiver restrito, crie o admin pelo seed/documentação.</p>{message && <div className="form-success">{message}</div>}{error && <div className="form-error">{error}</div>}<form onSubmit={submit} className="auth-form"><label>Nome<input value={name} onChange={(e)=>setName(e.target.value)} required /></label><label>E-mail<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required /></label><label>Senha<input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" minLength={6} required /></label><Button type="submit">Criar acesso</Button></form><button className="link-button" onClick={onBack}>Voltar ao login</button></section></main>;
}
