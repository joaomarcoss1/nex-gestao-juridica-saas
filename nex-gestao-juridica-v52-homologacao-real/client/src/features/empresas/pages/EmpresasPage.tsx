import { useMemo, useState } from "react";
import { Ban, Building2, CheckCircle2, Copy, DoorOpen, Edit3, Landmark, ShieldCheck, UserCog, Users } from "lucide-react";
import type { FeaturePageProps, Organization } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Modal, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { isMasterAdmin } from "@/lib/permissions";
import { requestTextInput } from "@/services/dialog.service";

type CompanyForm = {
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  responsibleName: string;
  responsibleEmail: string;
  city: string;
  state: string;
  address: string;
  plan: string;
};

const emptyForm: CompanyForm = {
  name: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  responsibleName: "",
  responsibleEmail: "",
  city: "",
  state: "MA",
  address: "",
  plan: "Profissional",
};

function nextRegistrationCode(organizations: Organization[]) {
  const year = new Date().getFullYear().toString();
  const max = organizations.reduce((value, organization) => {
    const code = organization.registrationCode || "";
    const serial = Number(code.endsWith(year) ? code.slice(0, -4) : code.slice(0, 3));
    return Number.isFinite(serial) ? Math.max(value, serial) : value;
  }, 326);
  return `${max + 1}${year}`;
}

function companyStatusTone(company: Organization) {
  if (company.accessBlocked || company.status === "Bloqueada") return "red";
  return statusTone(company.status);
}

export function EmpresasPage({ state, commit, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);

  const stats = useMemo(() => {
    const active = state.organizations.filter((company) => company.status === "Ativa" && !company.accessBlocked).length;
    const blocked = state.organizations.filter((company) => company.accessBlocked || company.status === "Bloqueada").length;
    const revenue = state.finances.filter((entry) => entry.type === "Receita").reduce((sum, entry) => sum + entry.amount, 0);
    return { active, blocked, users: state.employees.length, clients: state.clients.length, processes: state.processes.length, revenue };
  }, [state]);

  if (!isMasterAdmin(profile)) {
    return <Panel><PanelTitle title="Empresas" subtitle="Apenas Admin Master Global pode acessar a administração multiempresa." /></Panel>;
  }

  function change<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(company: Organization) {
    setEditing(company);
    setForm({
      name: company.name,
      tradeName: company.tradeName ?? "",
      document: company.document ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      responsibleName: company.responsibleName ?? "",
      responsibleEmail: company.responsibleEmail ?? "",
      city: company.city ?? "",
      state: company.state ?? "MA",
      address: company.address ?? "",
      plan: company.plan ?? "Profissional",
    });
    setOpen(true);
  }

  async function saveCompany() {
    if (!form.name.trim()) throw new Error("Informe a razão social da empresa.");
    if (!form.responsibleName.trim() || !form.responsibleEmail.trim()) throw new Error("Informe o admin responsável da empresa.");
    const registrationCode = editing?.registrationCode || nextRegistrationCode(state.organizations);
    const company: Organization = {
      id: editing?.id ?? uid("org"),
      registrationCode,
      name: form.name.trim(),
      tradeName: form.tradeName.trim() || form.name.trim(),
      document: form.document.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      responsibleName: form.responsibleName.trim(),
      responsibleEmail: form.responsibleEmail.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      address: form.address.trim(),
      plan: form.plan,
      status: editing?.status ?? "Ativa",
      accessBlocked: editing?.accessBlocked ?? false,
      blockedReason: editing?.blockedReason ?? "",
      createdBy: profile?.id,
      createdAt: editing?.createdAt ?? todayIso(),
      updatedAt: todayIso(),
    };
    await commit("organizations", company, editing ? "update" : "create");

    if (!editing) {
      await commit("employees", {
        id: uid("emp"),
        organizationId: company.id,
        name: form.responsibleName.trim(),
        cpf: "",
        pinHash: "convite_pendente",
        role: "admin_empresa",
        sector: "Administração",
        email: form.responsibleEmail.trim(),
        phone: form.phone.trim(),
        baseSalary: 0,
        hourlyRate: 0,
        schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" },
        mode: "Presencial",
        status: "Ativo",
        score: 100,
        createdAt: todayIso(),
      }, "create");
    }

    notify({ tone: "success", title: editing ? "Empresa atualizada" : "Empresa cadastrada com sucesso", message: `Matrícula da empresa: ${registrationCode}. Envie essa matrícula ao admin e funcionários para acesso.` });
    setOpen(false);
  }

  async function toggleBlocked(company: Organization, blocked: boolean) {
    await commit("organizations", {
      ...company,
      status: blocked ? "Bloqueada" : "Ativa",
      accessBlocked: blocked,
      blockedReason: blocked ? "Bloqueio administrativo pelo Admin Master Global." : "",
      updatedAt: todayIso(),
    }, "update");
    notify({ tone: blocked ? "info" : "success", title: blocked ? "Empresa bloqueada" : "Empresa reativada", message: `${company.tradeName || company.name} · matrícula ${company.registrationCode}` });
  }

  async function createCompanyAdmin(company: Organization) {
    const name = await requestTextInput("Criar administrador", "Nome do novo administrador da empresa:");
    if (!name) return;
    const email = await requestTextInput("Criar administrador", "E-mail do novo administrador da empresa:");
    if (!email) return;
    await commit("employees", {
      id: uid("emp"),
      organizationId: company.id,
      name,
      cpf: "",
      pinHash: "convite_pendente",
      role: "admin_empresa",
      sector: "Administração",
      email,
      phone: company.phone ?? "",
      baseSalary: 0,
      hourlyRate: 0,
      schedule: { entrada: "08:00", saida_intervalo: "12:00", retorno_intervalo: "14:00", saida_final: "18:00" },
      mode: "Presencial",
      status: "Ativo",
      score: 100,
      createdAt: todayIso(),
    }, "create");
    notify({ tone: "success", title: "Admin da empresa criado", message: `${name} foi vinculado à matrícula ${company.registrationCode}.` });
  }

  function countByOrg(companyId: string, entity: "employees" | "clients" | "processes") {
    return state[entity].filter((item: any) => !item.organizationId || item.organizationId === companyId).length;
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Kpi icon={Building2} label="Empresas ativas" value={stats.active} note="matrículas liberadas" tone="blue" />
      <Kpi icon={Ban} label="Empresas bloqueadas" value={stats.blocked} note="acesso suspenso pelo master" tone="red" />
      <Kpi icon={Users} label="Usuários internos" value={stats.users} note="admins, advogados e equipe" tone="gold" />
      <Kpi icon={Landmark} label="Receita mapeada" value={money(stats.revenue)} note="visão global consolidada" tone="green" />
    </div>

    <Panel>
      <PanelTitle title="Gestão multiempresa" subtitle="Cadastre escritórios, gere matrícula base, crie admins e bloqueie acesso sem misturar dados." action={<Button onClick={openCreate}><Building2 size={16}/> Nova empresa</Button>} />
      <div className="data-grid three">
        {state.organizations.map((company) => <div className="data-card" key={company.id}>
          <div className="card-top"><div className="avatar-circle">{(company.tradeName || company.name).slice(0,2).toUpperCase()}</div><StatusBadge tone={companyStatusTone(company)}>{company.accessBlocked ? "Bloqueada" : company.status}</StatusBadge></div>
          <strong>{company.tradeName || company.name}</strong>
          <p>{company.name}</p>
          <div className="info-grid mini-company-grid">
            <div><span>Matrícula</span><b>{company.registrationCode || "Não gerada"}</b></div>
            <div><span>Plano</span><b>{company.plan}</b></div>
            <div><span>Admin</span><b>{company.responsibleName || "Pendente"}</b></div>
            <div><span>Cidade</span><b>{company.city || company.headquartersCity || "-"}</b></div>
          </div>
          <div className="metrics-line"><span>Usuários <b>{countByOrg(company.id, "employees")}</b></span><span>Clientes <b>{countByOrg(company.id, "clients")}</b></span><span>Processos <b>{countByOrg(company.id, "processes")}</b></span></div>
          <ActionBar>
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(company.registrationCode || "").then(() => notify({ tone: "success", title: "Matrícula copiada", message: company.registrationCode }))}><Copy size={15}/> Copiar</Button>
            <Button variant="ghost" onClick={() => openEdit(company)}><Edit3 size={15}/> Editar</Button>
            {company.accessBlocked ? <Button variant="gold" onClick={() => toggleBlocked(company, false)}><CheckCircle2 size={15}/> Reativar</Button> : <Button variant="danger" onClick={() => toggleBlocked(company, true)}><Ban size={15}/> Bloquear</Button>}
            <Button variant="ghost" onClick={() => createCompanyAdmin(company)}><UserCog size={15}/> Criar admin</Button>
            <Button variant="ghost" onClick={() => notify({ tone: "info", title: "Modo suporte", message: `Contexto da empresa ${company.registrationCode} registrado para atendimento. O RLS continua isolando dados.` })}><DoorOpen size={15}/> Suporte</Button>
          </ActionBar>
        </div>)}
      </div>
    </Panel>

    <Panel>
      <PanelTitle title="Checklist estrutural aplicado" subtitle="A tela Empresas foi integrada ao AppState/Supabase, permissões, login com matrícula e RLS da migration v4.2." />
      <div className="pill-cloud"><span><ShieldCheck size={14}/> Admin Master Global sem matrícula</span><span><ShieldCheck size={14}/> Funcionário com e-mail, senha e matrícula</span><span><ShieldCheck size={14}/> Bloqueio por empresa</span><span><ShieldCheck size={14}/> Admin por empresa</span><span><ShieldCheck size={14}/> Relatórios globais por empresa</span></div>
    </Panel>

    <Modal open={open} title={editing ? "Editar empresa" : "Nova empresa"} subtitle="Ao salvar, a matrícula base fica visível para o Admin Master e para o admin da empresa." onClose={() => setOpen(false)} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={saveCompany}>{editing ? "Salvar alterações" : "Cadastrar empresa"}</Button></>}>
      <div className="form-grid">
        <Field label="Razão social"><input value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="Almeida Advocacia LTDA" /></Field>
        <Field label="Nome fantasia"><input value={form.tradeName} onChange={(e) => change("tradeName", e.target.value)} placeholder="Almeida Advocacia" /></Field>
        <Field label="CNPJ/CPF"><input value={form.document} onChange={(e) => change("document", e.target.value)} placeholder="00.000.000/0001-00" /></Field>
        <Field label="Plano"><select value={form.plan} onChange={(e) => change("plan", e.target.value)}><option>Enterprise</option><option>Profissional</option><option>Operacional</option><option>Starter</option></select></Field>
        <Field label="E-mail"><input value={form.email} onChange={(e) => change("email", e.target.value)} placeholder="contato@empresa.com" /></Field>
        <Field label="Telefone"><input value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="(99) 99999-9999" /></Field>
        <Field label="Nome do admin"><input value={form.responsibleName} onChange={(e) => change("responsibleName", e.target.value)} placeholder="Maria Silva" /></Field>
        <Field label="E-mail do admin"><input value={form.responsibleEmail} onChange={(e) => change("responsibleEmail", e.target.value)} placeholder="admin@empresa.com" /></Field>
        <Field label="Cidade"><input value={form.city} onChange={(e) => change("city", e.target.value)} placeholder="Codó" /></Field>
        <Field label="Estado"><input value={form.state} onChange={(e) => change("state", e.target.value)} placeholder="MA" /></Field>
        <Field label="Endereço"><textarea value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Rua, número, bairro e complemento" /></Field>
      </div>
    </Modal>
  </div>;
}
