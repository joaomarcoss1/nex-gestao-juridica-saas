import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Filter, MessageCircle, Plus, UserRoundPlus } from "lucide-react";
import type { Client, FeaturePageProps, Lead, Process, Task } from "@/types/app";
import { crmPipeline } from "@/data/legalEnterprise";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { getEmployeeName } from "@/services/normalizedRepository";

const origins = ["Instagram", "WhatsApp", "Site", "Indicação", "Google", "Tráfego pago", "Evento", "Cliente antigo", "Telefone", "Presencial"];
const areas = ["Civil", "Família e Sucessões", "Previdenciário", "Trabalhista", "Empresarial", "Tributário", "Penal", "Administrativo", "Consumidor", "Imobiliário", "Agrário/Rural", "Médico/Saúde", "Digital/LGPD", "Ambiental"];

function blankLead(responsible: string): Lead {
  return { id: uid("lead"), name: "", type: "PF", phone: "", email: "", origin: "WhatsApp", area: "Civil", demandType: "", stage: "Novo lead", value: 0, nextContact: todayIso(), responsible, notes: "" };
}

export function CRMPage({ state, commit, notify, setPage }: FeaturePageProps) {
  const [editing, setEditing] = useState<Lead | null>(null);
  const [area, setArea] = useState("Todas");
  const [origin, setOrigin] = useState("Todas");
  const filtered = useMemo(() => state.leads.filter((lead) => (area === "Todas" || lead.area === area) && (origin === "Todas" || lead.origin === origin)), [state.leads, area, origin]);
  const expectedValue = filtered.reduce((sum, lead) => sum + lead.value, 0);
  const hotLeads = filtered.filter((lead) => ["Análise jurídica", "Proposta enviada", "Negociação", "Contrato enviado"].includes(lead.stage)).length;

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
  ];

  async function saveLead(lead: Lead) {
    const isNew = !state.leads.some((item) => item.id === lead.id);
    await commit("leads", lead, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Lead criado" : "Lead atualizado", message: "CRM jurídico salvo com origem, etapa, responsável e próxima ação." });
  }

  async function advance(lead: Lead) {
    const idx = crmPipeline.indexOf(lead.stage);
    const next = crmPipeline[Math.min(idx + 1, crmPipeline.length - 1)] ?? lead.stage;
    await commit("leads", { ...lead, stage: next }, "update");
  }

  async function convert(lead: Lead) {
    const client: Client = { id: uid("client"), type: lead.type ?? "PF", name: lead.name, document: "", city: "", origin: lead.origin, status: "Ativo", responsible: lead.responsible, processes: 1, lifetimeValue: lead.value, email: lead.email, phone: lead.phone, whatsapp: lead.phone, notes: lead.notes };
    const process: Process = { id: uid("proc"), cnj: "", type: "Extrajudicial", client: client.name, clientId: client.id, opposite: "", area: lead.area, court: "", class: lead.demandType || "Caso extrajudicial", phase: "Triagem", status: "Novo caso", risk: "Médio", successChance: 50, value: lead.value, fees: Math.round(lead.value * 0.3), responsible: lead.responsible, responsibleId: lead.responsible, nextDeadline: lead.nextContact, lastMoveDays: 0, progress: 10, clientVisibleSummary: "Caso recebido e em triagem pelo escritório.", internalStrategy: "Definir estratégia após checklist documental." };
    const task: Task = { id: uid("task"), title: `Triagem inicial · ${lead.name}`, description: "Converter lead, validar documentos preliminares, classificar risco e preparar proposta/contrato.", processId: process.id, client: client.name, clientId: client.id, responsible: lead.responsible, delegatedBy: lead.responsible, reviewer: lead.responsible, sector: "Atendimento / Controladoria", priority: "Alta", status: "Triagem", due: lead.nextContact || todayIso(), estimatedHours: 2, spentHours: 0, workflowStage: "Triagem", slaHours: 24, checklist: ["Validar documentos", "Confirmar dados", "Definir estratégia", "Preparar contrato"] };
    await commit("clients", client, "create");
    await commit("processes", process, "create");
    await commit("tasks", task, "create");
    await commit("leads", { ...lead, stage: "Cliente convertido" }, "update");
    notify({ tone: "success", title: "Lead convertido", message: "Cliente, caso e tarefa de triagem foram criados sem duplicar o core jurídico." });
    setPage("processos");
  }

  return <div className="page-grid crm-page">
    <div className="kpi-row">
      <Kpi icon={UserRoundPlus} label="Leads no funil" value={filtered.length} note="captação jurídica" tone="blue" />
      <Kpi icon={MessageCircle} label="Leads quentes" value={hotLeads} note="proposta/negociação" tone="gold" />
      <Kpi icon={CheckCircle2} label="Convertidos" value={state.leads.filter((l) => l.stage === "Cliente convertido").length} note="viraram cliente/caso" tone="green" />
      <Kpi icon={Filter} label="Valor estimado" value={money(expectedValue)} note="pipeline filtrado" tone="purple" />
    </div>
    <Panel>
      <PanelTitle title="CRM jurídico enterprise" subtitle="Funil completo de entrada, triagem, documentos, proposta, contrato e conversão em cliente/caso." action={<Button onClick={() => setEditing(blankLead(state.employees[0]?.id ?? ""))}><Plus size={16}/> Novo lead</Button>} />
      <div className="quick-form">
        <Field label="Área"><select value={area} onChange={(e) => setArea(e.target.value)}>{["Todas", ...areas].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Origem"><select value={origin} onChange={(e) => setOrigin(e.target.value)}>{["Todas", ...origins].map((item) => <option key={item}>{item}</option>)}</select></Field>
      </div>
    </Panel>
    <div className="kanban crm-kanban">
      {crmPipeline.map((stage) => <div className="kanban-col" key={stage}>
        <h3>{stage}</h3>
        {filtered.filter((lead) => lead.stage === stage).map((lead) => <article className="kanban-card floating-card" key={lead.id}>
          <strong>{lead.name}</strong>
          <small>{lead.area} · {lead.origin} · {getEmployeeName(state, lead.responsible)}</small>
          <p>{lead.demandType || "Demanda jurídica em qualificação."}</p>
          <p>Próxima ação: {lead.nextContact || "sem data"} · {money(lead.value)}</p>
          <div className="card-tags"><StatusBadge tone={statusTone(lead.stage)}>{lead.stage}</StatusBadge><StatusBadge tone="blue">{lead.type ?? "PF"}</StatusBadge></div>
          <ActionBar>
            <Button variant="ghost" onClick={() => setEditing(lead)}>Editar</Button>
            {stage !== "Cliente convertido" && stage !== "Perdido" && <Button variant="ghost" onClick={() => advance(lead)}>Avançar <ArrowRight size={14}/></Button>}
            {stage !== "Cliente convertido" && <Button variant="gold" onClick={() => convert(lead)}>Converter</Button>}
          </ActionBar>
        </article>)}
      </div>)}
    </div>
    {editing && <EntityFormModal<Lead> open={!!editing} title={state.leads.some((item) => item.id === editing.id) ? "Editar lead" : "Novo lead"} subtitle="Cadastro completo para CRM jurídico com origem, área, prioridade e próxima ação." value={editing} fields={fields} onClose={() => setEditing(null)} onSave={saveLead} />}
  </div>;
}
