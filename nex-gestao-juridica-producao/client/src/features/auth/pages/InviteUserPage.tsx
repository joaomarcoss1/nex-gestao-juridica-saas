import { useState } from "react";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import type { AuthProfile } from "@/types/app";
import { inviteUser } from "@/services/users.service";
import { useNexState } from "@/hooks/useNexState";
import { useAuth } from "@/hooks/useAuth";

const roles: AuthProfile["role"][] = ["admin", "socio", "advogado", "financeiro", "rh", "controladoria", "funcionario", "cliente"];

export function InviteUserPage() {
  const { profile } = useAuth();
  const { state, notify } = useNexState(profile, profile?.organizationId ?? "demo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AuthProfile["role"]>("advogado");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await inviteUser({ name, email, role, clientId: role === "cliente" ? clientId : undefined });
      notify({ tone: "success", title: "Usuário pré-cadastrado", message: "Perfil criado em users_profiles. Envie link de cadastro/login pelo seu canal seguro." });
      setName(""); setEmail(""); setClientId("");
    } catch (error) {
      notify({ tone: "error", title: "Convite não criado", message: error instanceof Error ? error.message : "Falha ao criar convite." });
    } finally { setSaving(false); }
  }
  return <Panel><PanelTitle title="Convidar usuário" subtitle="Cria o perfil na organização com role, client_id e auditoria. O envio de e-mail transacional deve ser conectado no backend." action={<StatusBadge tone="green">RLS + auditoria</StatusBadge>} />
    <div className="form-grid"><Field label="Nome"><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nome completo"/></Field><Field label="E-mail"><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@escritorio.com"/></Field><Field label="Perfil"><select value={role} onChange={(e)=>setRole(e.target.value)}>{roles.map((r)=><option key={r}>{r}</option>)}</select></Field>{role === "cliente" && <Field label="Cliente vinculado"><select value={clientId} onChange={(e)=>setClientId(e.target.value)}><option value="">Selecione</option>{state.clients.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}</div>
    <Button disabled={saving || !email || (role === "cliente" && !clientId)} onClick={submit}>{saving ? "Criando..." : "Criar convite seguro"}</Button>
  </Panel>;
}
