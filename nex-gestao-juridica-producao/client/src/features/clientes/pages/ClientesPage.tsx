import { useMemo, useState } from "react";
import { BadgeCheck, Edit3, MoreVertical, Plus, Search, Trash2, UserCheck, Users } from "lucide-react";
import type { Client, FeaturePageProps, Lead } from "@/types/app";
import { stages } from "@/data/defaultState";
import { ActionBar, Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, uid } from "@/utils/format";

const origins = ["Manual", "Instagram", "WhatsApp", "Site", "Indicação", "Google", "Escritório físico", "Tráfego pago", "Cliente antigo", "Outro"];
const areas = ["Cível", "Criminal", "Trabalhista", "Família", "Consumidor", "Empresarial", "Previdenciário", "Tributário", "Outro"];
const responsibleOptions = ["e1", "e2", "e3", "e4"];

const emptyClient: Client = { id: "", type: "PF", name: "", document: "", rg: "", maritalStatus: "", profession: "", birthDate: "", fantasyName: "", stateRegistration: "", municipalRegistration: "", cnae: "", legalRepresentatives: "", partners: "", corporateDocuments: "", city: "", origin: "Atendimento", status: "Prospecto", responsible: "e1", processes: 0, lifetimeValue: 0, email: "", phone: "", address: "", representative: "", powerOfAttorney: "", personalDocuments: "" };
const emptyLead: Lead = { id: "", name: "", phone: "", origin: "Manual", area: "Cível", stage: "Novo lead", value: 0, nextContact: new Date().toISOString().slice(0, 10), responsible: "e1" };

export function ClientesPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [query, setQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const filteredClients = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.clients.filter((client) => [client.name, client.document, client.city, client.origin, client.status, client.email, client.phone].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.clients]);

  const filteredLeads = useMemo(() => {
    const normalized = query.toLowerCase();
    return state.leads.filter((lead) => [lead.name, lead.phone, lead.origin, lead.area, lead.stage].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [query, state.leads]);

  const clientFields: FieldConfig<Client>[] = [
    { key: "type", label: "Tipo", kind: "select", options: ["PF", "PJ", "Espólio", "Condomínio", "Associação", "Cooperativa", "Grupo econômico", "Órgão público", "Produtor rural", "Empresa rural", "Cliente corporativo"] },
    { key: "name", label: "Nome / razão social", required: true, placeholder: "Cliente completo" },
    { key: "document", label: "CPF/CNPJ", placeholder: "000.000.000-00" },
    { key: "rg", label: "RG / inscrição" },
    { key: "maritalStatus", label: "Estado civil" },
    { key: "profession", label: "Profissão" },
    { key: "birthDate", label: "Data de nascimento", kind: "date" },
    { key: "fantasyName", label: "Nome fantasia" },
    { key: "stateRegistration", label: "Inscrição estadual" },
    { key: "municipalRegistration", label: "Inscrição municipal" },
    { key: "cnae", label: "CNAE" },
    { key: "email", label: "E-mail", kind: "email" },
    { key: "phone", label: "WhatsApp / telefone" },
    { key: "city", label: "Cidade" },
    { key: "address", label: "Endereço", kind: "textarea" },
    { key: "origin", label: "Origem", kind: "select", options: origins },
    { key: "status", label: "Status", kind: "select", options: ["Ativo", "Prospecto", "Inativo"] },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
    { key: "representative", label: "Representante" },
    { key: "powerOfAttorney", label: "Procuração" },
    { key: "personalDocuments", label: "Documentos pessoais", kind: "textarea" },
    { key: "legalRepresentatives", label: "Representantes legais", kind: "textarea" },
    { key: "partners", label: "Sócios", kind: "textarea" },
    { key: "corporateDocuments", label: "Documentos societários", kind: "textarea" },
    { key: "processes", label: "Qtd. processos", kind: "number" },
    { key: "lifetimeValue", label: "Valor total do cliente", kind: "number" },
  ];

  const leadFields: FieldConfig<Lead>[] = [
    { key: "name", label: "Nome do lead", required: true },
    { key: "phone", label: "WhatsApp / telefone" },
    { key: "origin", label: "Origem", kind: "select", options: origins },
    { key: "area", label: "Área de interesse", kind: "select", options: areas },
    { key: "stage", label: "Etapa do funil", kind: "select", options: stages },
    { key: "value", label: "Valor estimado", kind: "number" },
    { key: "nextContact", label: "Próximo contato", kind: "date" },
    { key: "responsible", label: "Responsável", kind: "select", options: responsibleOptions },
  ];

  async function saveClient(client: Client) {
    const isNew = !state.clients.some((item) => item.id === client.id);
    await commit("clients", { ...client, id: client.id || uid("client") }, isNew ? "create" : "update");
    setEditingClient(null);
    notify({ tone: "success", title: isNew ? "Cliente criado" : "Cliente atualizado", message: "Cadastro salvo e disponível para processos, documentos e financeiro." });
  }

  async function saveLead(lead: Lead) {
    const isNew = !state.leads.some((item) => item.id === lead.id);
    await commit("leads", { ...lead, id: lead.id || uid("lead") }, isNew ? "create" : "update");
    setEditingLead(null);
    notify({ tone: "success", title: isNew ? "Lead criado" : "Lead atualizado", message: "Funil comercial salvo com dados editáveis." });
  }

  async function deleteClient(client: Client) {
    if (!confirm(`Excluir o cliente ${client.name}?`)) return;
    await remove("clients", client.id);
    notify({ tone: "info", title: "Cliente removido", message: "O registro foi excluído do cadastro." });
  }

  async function deleteLead(lead: Lead) {
    if (!confirm(`Excluir o lead ${lead.name}?`)) return;
    await remove("leads", lead.id);
    notify({ tone: "info", title: "Lead removido" });
  }

  async function convertLead(lead: Lead) {
    const client: Client = { id: uid("client"), type: lead.type ?? "PF", name: lead.name, document: "", city: "", origin: lead.origin, status: "Ativo", responsible: lead.responsible, processes: 1, lifetimeValue: lead.value, phone: lead.phone, email: lead.email ?? "", address: "" };
    const processId = uid("process");
    await commit("clients", client);
    await commit("processes", { id: processId, cnj: "", type: "Extrajudicial", client: client.name, clientId: client.id, opposite: "", area: lead.area, court: "", class: lead.demandType ?? "Novo caso", phase: "Triagem", status: "Em análise", risk: "Médio", successChance: 50, value: lead.value, fees: 0, responsible: lead.responsible, nextDeadline: lead.nextContact, lastMoveDays: 0, progress: 10, checklist: ["Contrato de honorários", "Procuração", "Documentos iniciais"] });
    await commit("tasks", { id: uid("task"), title: `Triagem e contrato - ${lead.name}`, processId, client: client.name, clientId: client.id, responsible: lead.responsible, sector: "Atendimento jurídico", priority: "Alta", status: "Pendente", due: lead.nextContact, estimatedHours: 1, spentHours: 0, checklist: ["Triagem", "Solicitar documentos", "Enviar proposta", "Gerar contrato"] });
    await commit("leads", { ...lead, stage: "Cliente convertido" }, "update");
    notify({ tone: "success", title: "Lead convertido", message: `${lead.name} virou cliente, caso e tarefa inicial.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><Users /><strong>{state.clients.length}</strong><span>clientes cadastrados</span></Panel>
      <Panel className="stat-panel"><UserCheck /><strong>{state.leads.length}</strong><span>leads no funil</span></Panel>
      <Panel className="stat-panel"><BadgeCheck /><strong>{money(state.leads.reduce((a, l) => a + l.value, 0))}</strong><span>potencial em negociação</span></Panel>
      <Panel className="stat-panel"><Plus /><strong>{state.clients.filter((c) => c.status === "Ativo").length}</strong><span>carteira ativa</span></Panel>
    </div>

    <Panel>
      <PanelTitle title="CRM e clientes editáveis" subtitle="Cadastro completo, edição, exclusão, conversão de lead e busca simples." action={<ActionBar><Button variant="ghost" onClick={() => setEditingLead({ ...emptyLead, id: uid("lead") })}><Plus size={16}/> Novo lead</Button><Button onClick={() => setEditingClient({ ...emptyClient, id: uid("client") })}><Plus size={16}/> Novo cliente</Button></ActionBar>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, CPF/CNPJ, cidade, origem, status ou telefone" /></div>
    </Panel>

    <Panel>
      <PanelTitle title="Funil comercial" subtitle="Arraste futuramente; hoje cada card é editável e conversível." />
      <div className="kanban">
        {stages.map((stage) => <div className="kanban-col" key={stage}>
          <h3>{stage}</h3>
          {filteredLeads.filter((l) => l.stage === stage).map((lead) => <div className="kanban-card floating-card" key={lead.id}>
            <strong>{lead.name}</strong>
            <small>{lead.origin} · {lead.area} · {lead.phone || "sem telefone"}</small>
            <span>{money(lead.value)}</span>
            <p>Próximo contato: {lead.nextContact || "sem data"}</p>
            <ActionBar><Button variant="ghost" onClick={() => convertLead(lead)}>Converter</Button><Button variant="ghost" onClick={() => setEditingLead(lead)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteLead(lead)}><Trash2 size={15}/></Button><MoreVertical size={17}/></ActionBar>
          </div>)}
        </div>)}
      </div>
    </Panel>

    <Panel>
      <PanelTitle title="Clientes PF/PJ" subtitle="Base central para processos, financeiro, documentos e portal." />
      <div className="data-grid">
        {filteredClients.map((client) => <article className="data-card floating-card" key={client.id}>
          <div className="avatar-circle">{client.name.slice(0, 2).toUpperCase()}</div>
          <strong>{client.name}</strong>
          <small>{client.type} · {client.document || "documento pendente"}</small>
          <p>{client.email || "sem e-mail"} · {client.phone || "sem telefone"}</p>
          <p>{client.city || "Cidade não informada"}</p>
          <div className="card-footer"><StatusBadge tone={statusTone(client.status)}>{client.status}</StatusBadge><span>{money(client.lifetimeValue)}</span></div>
          <ActionBar><Button variant="ghost" onClick={() => { history.pushState({}, "", `/clientes/${client.id}`); dispatchEvent(new Event("popstate")); }}>Ver ficha</Button><Button variant="ghost" onClick={() => setEditingClient(client)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteClient(client)}><Trash2 size={15}/> Excluir</Button></ActionBar>
        </article>)}
      </div>
    </Panel>

    {editingClient && <EntityFormModal<Client> open={!!editingClient} title={state.clients.some((item) => item.id === editingClient.id) ? "Editar cliente" : "Novo cliente"} subtitle="Todos os dados do cliente podem ser alterados e salvos." value={editingClient} fields={clientFields} onClose={() => setEditingClient(null)} onSave={saveClient} />}
    {editingLead && <EntityFormModal<Lead> open={!!editingLead} title={state.leads.some((item) => item.id === editingLead.id) ? "Editar lead" : "Novo lead"} subtitle="Atualize etapa, origem, valor, responsável e próximo contato." value={editingLead} fields={leadFields} onClose={() => setEditingLead(null)} onSave={saveLead} />}
  </div>;
}
