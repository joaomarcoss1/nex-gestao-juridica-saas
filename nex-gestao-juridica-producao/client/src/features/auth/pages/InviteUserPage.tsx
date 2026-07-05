import { useEffect, useState } from "react";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import type { AuthProfile } from "@/types/app";
import { inviteUser, listUsers, promoteToMasterAdmin, setUserActive } from "@/services/users.service";
import { useNexState } from "@/hooks/useNexState";
import { useAuth } from "@/hooks/useAuth";
import { can, isMasterAdmin } from "@/lib/permissions";

const baseRoles: AuthProfile["role"][] = ["admin", "socio", "advogado", "financeiro", "rh", "controladoria", "funcionario", "cliente"];

export function InviteUserPage() {
  const { profile } = useAuth();
  const { state, notify } = useNexState(profile, profile?.organizationId ?? "demo");
  const [users, setUsers] = useState<AuthProfile[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AuthProfile["role"]>("advogado");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const roles = isMasterAdmin(profile) ? (["admin_master", ...baseRoles] as AuthProfile["role"][]) : baseRoles;
  const canInvite = can(profile, "users.invite");
  const canPromote = can(profile, "users.promote_master");

  useEffect(() => {
    if (!can(profile, "users.view")) return;
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, [profile]);

  async function submit() {
    setSaving(true);
    try {
      await inviteUser({ name, email, role, clientId: role === "cliente" ? clientId : undefined });
      notify({ tone: "success", title: "Usuário pré-cadastrado", message: "Perfil criado em users_profiles. Envie link de cadastro/login pelo seu canal seguro." });
      setName(""); setEmail(""); setClientId("");
      const refreshed = await listUsers().catch(() => []);
      setUsers(refreshed);
    } catch (error) {
      notify({ tone: "error", title: "Convite não criado", message: error instanceof Error ? error.message : "Falha ao criar convite." });
    } finally { setSaving(false); }
  }

  async function promote(user: AuthProfile) {
    try {
      await promoteToMasterAdmin(user.id);
      notify({ tone: "success", title: "Admin Master concedido", message: `${user.name} agora pode acessar configurações sensíveis e promover outros admins.` });
      setUsers(await listUsers().catch(() => []));
    } catch (error) {
      notify({ tone: "error", title: "Promoção bloqueada", message: error instanceof Error ? error.message : "Somente Admin Master pode promover outro usuário." });
    }
  }

  async function toggle(user: AuthProfile) {
    try {
      await setUserActive(user.id, !user.active);
      notify({ tone: "success", title: user.active ? "Usuário inativado" : "Usuário reativado" });
      setUsers(await listUsers().catch(() => []));
    } catch (error) {
      notify({ tone: "error", title: "Alteração bloqueada", message: error instanceof Error ? error.message : "Não foi possível alterar o usuário." });
    }
  }

  return <Panel><PanelTitle title="Usuários e hierarquia de acesso" subtitle="Admin Master > Admin/Sócio > Advogado > Estagiário/Auxiliar/Funcionário > Cliente. O cliente fica preso ao client_id do portal." action={<StatusBadge tone="green">RBAC + RLS</StatusBadge>} />
    {canInvite ? <><div className="form-grid"><Field label="Nome"><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nome completo"/></Field><Field label="E-mail"><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@escritorio.com"/></Field><Field label="Perfil"><select value={role} onChange={(e)=>setRole(e.target.value)}>{roles.map((r)=><option key={r} value={r}>{String(r).replace("_", " ")}</option>)}</select></Field>{role === "cliente" && <Field label="Cliente vinculado"><select value={clientId} onChange={(e)=>setClientId(e.target.value)}><option value="">Selecione</option>{state.clients.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}</div>
    <Button disabled={saving || !email || (role === "cliente" && !clientId)} onClick={submit}>{saving ? "Criando..." : "Criar convite seguro"}</Button></> : <p className="security-note">Seu perfil não pode convidar usuários.</p>}
    <div className="responsive-table user-admin-table"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.length ? users.map((user)=><tr key={user.id}><td><strong>{user.name}</strong><br/><small>{user.email}</small></td><td>{String(user.role).replace("_", " ")}</td><td><StatusBadge tone={user.active ? "green" : "red"}>{user.active ? "Ativo" : "Inativo"}</StatusBadge></td><td><div className="row-actions">{canPromote && user.role !== "admin_master" && <Button variant="gold" onClick={() => promote(user)}>Tornar Admin Master</Button>}{canInvite && <Button variant="ghost" onClick={() => toggle(user)}>{user.active ? "Inativar" : "Reativar"}</Button>}</div></td></tr>) : <tr><td colSpan={4}>Lista de usuários disponível quando o Supabase estiver conectado.</td></tr>}</tbody></table></div>
  </Panel>;
}
