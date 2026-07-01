import { useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";

export function ResetPasswordPage({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      await resetPassword(email);
      setMessage("Link de recuperação enviado, se o e-mail existir no Supabase Auth.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar recuperação.");
    }
  }
  return <main className="auth-screen"><section className="auth-card floating-card"><h1>Recuperar senha</h1>{message && <div className="form-success">{message}</div>}{error && <div className="form-error">{error}</div>}<form onSubmit={submit} className="auth-form"><label>E-mail<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required /></label><Button type="submit">Enviar recuperação</Button></form><button className="link-button" onClick={onBack}>Voltar ao login</button></section></main>;
}
