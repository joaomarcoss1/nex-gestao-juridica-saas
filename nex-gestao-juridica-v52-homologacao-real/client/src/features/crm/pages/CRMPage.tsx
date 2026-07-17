
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, FileSignature, Filter, MessageCircle, Plus, Target, UserRoundPlus, RadioTower, Settings2 } from "lucide-react";
import type { FeaturePageProps, Lead, LeadSource } from "@/types/app";
import { crmPipeline } from "@/data/legalEnterprise";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";
import { authenticatedFetch, readApiJson } from "@/services/apiClient";
import { addBusinessDays } from "@/lib/businessDates";
import { requestConfirmation } from "@/services/dialog.service";

const baseOrigins = ["Instagram", "WhatsApp", "Site", "Indicação", "Google Leads", "Google Ads", "Tráfego pago", "Evento", "Cliente antigo", "Telefone", "Presencial"];
const areas = ["Civil", "Família e Sucessões", "Previdenciário", "Trabalhista", "Empresarial", "Tributário", "Penal", "Administrativo", "Consumidor", "Imobiliário", "Agrário/Rural", "Médico/Saúde", "Digital/LGPD", "Ambiental"];
const triageChecklist = ["Identificação", "Conflito de interesse", "Documentos", "Viabilidade", "Precificação", "Contrato", "Onboarding"];

function blankSource(responsible: string): LeadSource {
  return { id: uid("lead-source"), provider: "Google Leads", sourceName: "Google Leads", status: "prepared", defaultArea: "Civil", defaultResponsibleId: responsible, isDefault: false, active: true };
}

function blankLead(responsible: string, origin = "WhatsApp"): Lead {
  return { id: uid("lead"), name: "", type: "PF", phone: "", email: "", origin, area: "Civil", demandType: "", stage: "Novo lead", value: 0, nextContact: todayIso(), responsible, notes: "" };
}

function nextBusinessDate(days: number) { return addBusinessDays(new Date().toISOString().slice(0, 10), days); }

export function CRMPage({ state, commit, executeAtomic, notify, setPage }: FeaturePageProps) {
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [mobileStage, setMobileStage] = useState(crmPipeline[0]);
  const [area, setArea] = useState("Todas");
  const [origin, setOrigin] = useState("Todas");
  const [focus, setFocus] = useState<"pipeline" | "triagem" | "agenda">("pipeline");
  const origins = useMemo(() => Array.from(new Set([...baseOrigins, ...state.leadSources.filter((source) => source.active && !source.archivedAt).map((source) => source.sourceName)])), [state.leadSources]);
  const defaultSource = state.leadSources.find((source) => source.active && source.isDefault) ?? state.leadSources.find((source) => source.active);
  const filtered = useMemo(() => state.leads.filter((lead) => (area === "Todas" || lead.area === area) && (origin === "Todas" || lead.origin === origin)), [state.leads, area, origin]);
  const expectedValue = filtered.reduce((sum, lead) => sum + lead.value, 0);
  const hotLeads = filtered.filter((lead) => ["Análise jurídica", "Proposta enviada", "Negociação", "Contrato enviado"].includes(lead.stage)).length;
  const stalled = filtered.filter((lead) => lead.nextContact < todayIso() && lead.stage !== "Cliente convertido" && lead.stage !== "Perdido");
  const conversionRate = filtered.length ? Math.round((filtered.filter((l) => l.stage === "Cliente convertido").length / filtered.length) * 100) : 0;

  const sourceFields: FieldConfig<LeadSource>[] = [
    { key: "provider", label: "Provedor", kind: "select", options: ["Google Leads", "Google Ads", "Meta Leads", "Site", "WhatsApp", "Outro"] },
    { key: "sourceName", label: "Nome da origem", required: true },
    { key: "status", label: "Status", kind: "select", options: ["prepared", "configured", "connected", "error", "inactive"] },
    { key: "defaultArea", label: "Área padrão", kind: "select", options: areas },
    { key: "defaultResponsibleId", label: "Responsável padrão", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
    { key: "isDefault", label: "Origem padrão", kind: "checkbox" },
    { key: "active", label: "Ativa", kind: "checkbox" },
  ];

  const fields: FieldConfig<Lead>[] = [
    { key: "name", label: "Nome / Razão social", required: true },
    { key: "type", label: "Tipo", kind: "select", options: ["PF", "PJ"] },
    { key: "phone", label: "Telefone / WhatsApp", required: true },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "origin", label: "Origem", kind: "select", options: origins },
    { key: "area", label: "Área de interesse", kind: "select", options: areas },
    { key: "demandType", label: "Tipo de demanda" },
    { key: "stage", label: "Status no funil", kind: "select", options: crmPipeline },
    { key: "value", label: "Valor estimado", kind: "number" },
    { key: "nextContact", label: "Próxima ação", kind: "date" },
    { key: "responsible", label: "Responsável", kind: "select", options: state.employees.map((e) => ({ value: e.id, label: `${e.name} · ${e.role}` })) },
    { key: "notes", label: "Observações / triagem", kind: "textarea" },
    { key: "document", label: "CPF/CNPJ para conversão" },
    { key: "consentAccepted", label: "Consentimento registrado", kind: "checkbox" },
    { key: "lossReason", label: "Motivo da perda" },
    { key: "lossNotes", label: "Detalhes da perda", kind: "textarea" },
  ];


  async function saveSource(source: LeadSource) {
    const isNew = !state.leadSources.some((item) => item.id === source.id);
    await commit("leadSources", { ...source, isDefault: false, status: source.active ? source.status : "inactive" }, isNew ? "create" : "update");
    if (source.isDefault && source.active) {
      await executeAtomic({ type: "setDefaultLeadSource", sourceId: source.id, idempotencyKey: `lead-source-default:${source.id}` });
    }
    setEditingSource(null);
    notify({ tone: "success", title: isNew ? "Fonte cadastrada" : "Fonte atualizada", message: "A origem foi salva e a definição de fonte padrão ocorreu em uma única operação protegida." });
  }

  async function testGoogleConfiguration() {
    try {
      const response = await authenticatedFetch("/api/integrations/test", { method: "POST", body: JSON.stringify({ provider: "Google Leads", integrationId: defaultSource?.id }) });
      const result = await readApiJson<{ ok?: boolean; message?: string }>(response);
      notify({ tone: result.ok ? "success" : "info", title: result.ok ? "Configuração validada" : "Configuração incompleta", message: result.message ?? "O backend respondeu ao teste sem expor credenciais." });
    } catch (error) {
      notify({ tone: "error", title: "Teste não concluído", message: error instanceof Error ? error.message : "Verifique as variáveis de ambiente do backend." });
    }
  }

  async function simulateGoogleLead() {
    const source = defaultSource ?? blankSource(state.employees[0]?.id ?? "");
    const lead: Lead = {
      id: uid("lead"), name: "Simulação local Google Leads", type: "PF", phone: "(00) 90000-0000", email: "simulacao@exemplo.com",
      origin: source.sourceName, area: source.defaultArea, demandType: "Simulação identificada — não recebida pelo webhook real", stage: "Novo lead", value: 0,
      nextContact: nextBusinessDate(1), responsible: source.defaultResponsibleId ?? state.employees[0]?.id ?? "", notes: "Registro de teste criado manualmente pela tela de CRM. Não representa recebimento real do Google."
    };
    await commit("leads", lead, "create");
    notify({ tone: "info", title: "Simulação local criada", message: "O lead foi marcado como simulação. O recebimento real ocorre somente pelo webhook autenticado." });
  }

  async function saveLead(lead: Lead) {
    const isNew = !state.leads.some((item) => item.id === lead.id);
    await commit("leads", lead, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Lead criado" : "Lead atualizado", message: "CRM salvo com origem, etapa, responsável, valor e próxima ação." });
  }

  async function advance(lead: Lead) {
    const idx = crmPipeline.indexOf(lead.stage);
    const next = crmPipeline[Math.min(idx + 1, crmPipeline.length - 1)] ?? lead.stage;
    if (next === "Perdido" && !lead.lossReason?.trim()) {
      setEditing({ ...lead, stage: "Perdido" });
      notify({ tone: "info", title: "Informe o motivo da perda", message: "Preencha o motivo antes de concluir esta etapa." });
      return;
    }
    await commit("leads", { ...lead, stage: next, nextContact: nextBusinessDate(2), lostAt: next === "Perdido" ? new Date().toISOString() : lead.lostAt }, "update");
    notify({ tone: "info", title: "Funil atualizado", message: `${lead.name} avançou para ${next}.` });
  }

  async function quickFollowUp(lead: Lead) {
    const dueDate = nextBusinessDate(1);
    await executeAtomic({ type: "createLeadFollowUp", leadId: lead.id, dueDate, idempotencyKey: `lead-follow-up:${lead.id}:${dueDate}` });
    notify({ tone: "success", title: "Follow-up criado", message: "Próxima ação, tarefa e auditoria foram confirmadas na mesma operação." });
  }

  async function convert(lead: Lead) {
    if (!lead.consentAccepted) {
      setEditing(lead);
      notify({ tone: "info", title: "Consentimento necessário", message: "Registre o consentimento antes de converter o lead." });
      return;
    }
    const matches = state.clients.filter((client) =>
      Boolean((lead.document && client.document === lead.document) ||
        (lead.email && client.email?.toLowerCase() === lead.email.toLowerCase()) ||
        (lead.phone && [client.phone, client.whatsapp].includes(lead.phone)))
    );
    if (matches.length > 1) {
      notify({ tone: "error", title: "Correspondência ambígua", message: "Há mais de um cliente compatível. Revise CPF/CNPJ, e-mail ou telefone antes da conversão." });
      return;
    }
    let reuseClientId: string | undefined;
    let duplicateOverrideReason: string | undefined;
    if (matches.length === 1) {
      const reuse = await requestConfirmation("Cliente já cadastrado", `Foi encontrado ${matches[0].name}. Deseja reutilizar esse cadastro na conversão?`);
      if (!reuse) return;
      reuseClientId = matches[0].id;
      duplicateOverrideReason = "Reutilização confirmada pelo usuário na conversão do CRM.";
    }
    const key = lead.conversionIdempotencyKey || `crm:${lead.id}`;
    await executeAtomic({ type: "convertLead", leadId: lead.id, idempotencyKey: key, reuseClientId, requireConsent: true, duplicateOverrideReason });
    notify({ tone: "success", title: "Lead convertido", message: "Cliente, processo e workflow foram confirmados em uma única operação idempotente." });
    setPage("processos");
  }

  return <div className="page-grid crm-page crm-page-v48">
    <div className="kpi-row">
      <Kpi icon={UserRoundPlus} label="Leads ativos" value={filtered.length} note="funil jurídico" tone="blue" />
      <Kpi icon={MessageCircle} label="Leads quentes" value={hotLeads} note="proposta/negociação" tone="gold" />
      <Kpi icon={Target} label="Conversão" value={`${conversionRate}%`} note="lead para cliente" tone="green" />
      <Kpi icon={Filter} label="Pipeline" value={money(expectedValue)} note="valor potencial" tone="purple" />
    </div>
    <Panel className="crm-command-panel">
      <PanelTitle title="CRM jurídico como centro do sistema" subtitle="Captação, triagem, proposta, contrato e conversão direta em cliente, processo local e workflow operacional." action={<Button onClick={() => setEditing(blankLead(state.employees[0]?.id ?? "", defaultSource?.sourceName ?? "WhatsApp"))}><Plus size={16}/> Novo lead</Button>} />
      <div className="module-tabs"><button className={focus === "pipeline" ? "active" : ""} onClick={() => setFocus("pipeline")}>Pipeline</button><button className={focus === "triagem" ? "active" : ""} onClick={() => setFocus("triagem")}>Triagem comercial</button><button className={focus === "agenda" ? "active" : ""} onClick={() => setFocus("agenda")}>Follow-ups</button></div>
      <div className="crm-google-leads-card">
        <div><RadioTower size={18}/><strong>Captação automática Google Leads</strong><span>Receba contatos de campanhas em tempo real, com origem, área, responsável e próxima ação definidos no CRM.</span></div>
        <ActionBar><Button variant="ghost" onClick={testGoogleConfiguration}><CheckCircle2 size={15}/> Testar configuração</Button><Button variant="ghost" onClick={simulateGoogleLead}><Plus size={15}/> Simular local</Button><Button variant="gold" onClick={() => setEditingSource(defaultSource ?? blankSource(state.employees[0]?.id ?? ""))}><Settings2 size={15}/> Fontes</Button></ActionBar>
      </div>
      <div className="quick-form">
        <Field label="Área"><select value={area} onChange={(e) => setArea(e.target.value)}>{["Todas", ...areas].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Origem"><select value={origin} onChange={(e) => setOrigin(e.target.value)}>{["Todas", ...origins].map((item) => <option key={item}>{item}</option>)}</select></Field>
      </div>
      {focus === "triagem" && <div className="crm-triage-grid">{triageChecklist.map((item, index) => <div key={item}><strong>{index + 1}. {item}</strong><span>{item === "Precificação" ? "Enviar para financeiro/precificação antes do contrato." : "Etapa obrigatória para reduzir retrabalho."}</span></div>)}</div>}
      {focus === "agenda" && <div className="stack-list">{stalled.length ? stalled.map((lead) => <div className="data-card" key={lead.id}><strong>{lead.name}</strong><small>{lead.area} · próxima ação vencida em {lead.nextContact}</small><ActionBar><Button variant="ghost" onClick={() => quickFollowUp(lead)}><CalendarClock size={14}/> Criar follow-up</Button><Button variant="ghost" onClick={() => setEditing(lead)}>Editar</Button></ActionBar></div>) : <p className="muted-text">Nenhum follow-up atrasado no filtro atual.</p>}</div>}
    </Panel>
    {focus === "pipeline" && <div className="kanban crm-kanban crm-desktop-kanban">
      {crmPipeline.map((stage) => <div className="kanban-col" key={stage}>
        <h3>{stage}</h3>
        {filtered.filter((lead) => lead.stage === stage).map((lead) => <article className="kanban-card floating-card" key={lead.id}>
          <strong>{lead.name}</strong>
          <small>{lead.area} · {lead.origin} · {getEmployeeName(state, lead.responsible)}</small>
          <p>{lead.demandType || "Demanda jurídica em qualificação."}</p>
          <p>Próxima ação: {lead.nextContact || "sem data"} · {money(lead.value)}</p>
          <ProgressBar value={Math.max(8, (crmPipeline.indexOf(lead.stage) + 1) * 10)} color={lead.stage === "Perdido" ? "red" : lead.stage === "Cliente convertido" ? "green" : "blue"} />
          <div className="card-tags"><StatusBadge tone={statusTone(lead.stage)}>{lead.stage}</StatusBadge><StatusBadge tone="blue">{lead.type ?? "PF"}</StatusBadge></div>
          <ActionBar>
            <Button variant="ghost" onClick={() => setEditing(lead)}>Editar</Button>
            {stage !== "Cliente convertido" && stage !== "Perdido" && <Button variant="ghost" onClick={() => advance(lead)}>Avançar <ArrowRight size={14}/></Button>}
            {stage !== "Cliente convertido" && <Button variant="ghost" onClick={() => quickFollowUp(lead)}><MessageCircle size={14}/> Follow-up</Button>}
            {stage !== "Cliente convertido" && <Button variant="gold" onClick={() => convert(lead)}><FileSignature size={14}/> Converter</Button>}
          </ActionBar>
        </article>)}
      </div>)}
    </div>}
    {focus === "pipeline" && <div className="crm-mobile-pipeline">
      <Field label="Etapa exibida"><select value={mobileStage} onChange={(event) => setMobileStage(event.target.value)}>{crmPipeline.map((stage) => <option key={stage}>{stage}</option>)}</select></Field>
      <div className="kanban-col"><h3>{mobileStage}</h3>{filtered.filter((lead) => lead.stage === mobileStage).map((lead) => <article className="kanban-card floating-card" key={lead.id}><strong>{lead.name}</strong><small>{lead.area} · {lead.origin}</small><p>Próxima ação: {lead.nextContact || "sem data"} · {money(lead.value)}</p><div className="card-tags"><StatusBadge tone={statusTone(lead.stage)}>{lead.stage}</StatusBadge></div><ActionBar><Button variant="ghost" onClick={() => setEditing(lead)}>Editar</Button>{mobileStage !== "Cliente convertido" && mobileStage !== "Perdido" && <Button variant="ghost" onClick={() => advance(lead)}>Avançar <ArrowRight size={14}/></Button>}{mobileStage !== "Cliente convertido" && <Button variant="gold" onClick={() => convert(lead)}>Converter</Button>}</ActionBar></article>)}</div>
    </div>}
    {editingSource && <EntityFormModal<LeadSource> open={!!editingSource} title="Fonte de leads" subtitle="Configure origem, área e responsável padrão. Fontes utilizadas devem ser inativadas, não apagadas." value={editingSource} fields={sourceFields} onClose={() => setEditingSource(null)} onSave={saveSource} saveLabel="Salvar fonte" />}
    {editing && <EntityFormModal<Lead> open={!!editing} title={state.leads.some((item) => item.id === editing.id) ? "Editar lead" : "Novo lead"} subtitle="CRM jurídico com origem, área, prioridade, valor, próxima ação e conversão operacional." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveLead} />}
  </div>;
}
