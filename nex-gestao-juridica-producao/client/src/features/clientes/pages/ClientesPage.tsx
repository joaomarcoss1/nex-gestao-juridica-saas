import { useState } from "react";
import { BadgeCheck, MoreVertical, Plus, UserCheck, Users } from "lucide-react";
import type { Client, FeaturePageProps, Lead } from "@/types/app";
import { stages } from "@/data/defaultState";
import { Button, Field, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone, uid } from "@/utils/format";

export function ClientesPage({ state, commit, notify }: FeaturePageProps) {
  const [leadName, setLeadName] = useState("");
  const [clientName, setClientName] = useState("");

  async function addLead() {
    if (!leadName.trim()) return;
    const lead: Lead = { id: uid("lead"), name: leadName, phone: "", origin: "Manual", area: "Cível", stage: "Novo lead", value: 0, nextContact: new Date().toISOString().slice(0, 10), responsible: "e1" };
    await commit("leads", lead);
    setLeadName("");
    notify({ tone: "success", title: "Lead criado", message: "Funil comercial atualizado e salvo." });
  }

  async function addClient() {
    if (!clientName.trim()) return;
    const client: Client = { id: uid("client"), type: "PF", name: clientName, document: "", city: "", origin: "Atendimento", status: "Prospecto", responsible: "e1", processes: 0, lifetimeValue: 0 };
    await commit("clients", client);
    setClientName("");
    notify({ tone: "success", title: "Cliente salvo", message: "Cadastro gravado no módulo normalizado." });
  }

  async function convertLead(lead: Lead) {
    const client: Client = { id: uid("client"), type: "PF", name: lead.name, document: "", city: "", origin: lead.origin, status: "Ativo", responsible: lead.responsible, processes: 0, lifetimeValue: lead.value, phone: lead.phone };
    await commit("clients", client);
    await commit("leads", { ...lead, stage: "Contrato fechado" }, "update");
    notify({ tone: "success", title: "Lead convertido", message: `${lead.name} virou cliente ativo.` });
  }

  return <div className="page-grid">
    <div className="kpi-row">
      <Panel className="stat-panel"><Users /><strong>{state.clients.length}</strong><span>clientes cadastrados</span></Panel>
      <Panel className="stat-panel"><UserCheck /><strong>{state.leads.length}</strong><span>leads no funil</span></Panel>
      <Panel className="stat-panel"><BadgeCheck /><strong>{money(state.leads.reduce((a, l) => a + l.value, 0))}</strong><span>potencial em negociação</span></Panel>
      <Panel className="stat-panel"><Plus /><strong>{state.clients.filter((c) => c.status === "Ativo").length}</strong><span>carteira ativa</span></Panel>
    </div>
    <Panel>
      <PanelTitle title="CRM jurídico" subtitle="Funil dinâmico com ações de conversão e persistência por tabela." />
      <div className="quick-form">
        <Field label="Novo lead"><input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Nome do lead" /></Field>
        <Button onClick={addLead}><Plus size={16} /> Adicionar lead</Button>
      </div>
      <div className="kanban">
        {stages.map((stage) => <div className="kanban-col" key={stage}>
          <h3>{stage}</h3>
          {state.leads.filter((l) => l.stage === stage).map((lead) => <div className="kanban-card floating-card" key={lead.id}>
            <strong>{lead.name}</strong>
            <small>{lead.origin} · {lead.area}</small>
            <span>{money(lead.value)}</span>
            <p>Próximo contato: {lead.nextContact || "sem data"}</p>
            <div className="row-actions"><Button variant="ghost" onClick={() => convertLead(lead)}>Converter</Button><MoreVertical size={17}/></div>
          </div>)}
        </div>)}
      </div>
    </Panel>
    <Panel>
      <PanelTitle title="Clientes PF/PJ" subtitle="Cadastro centralizado para processos, documentos, financeiro e portal." />
      <div className="quick-form">
        <Field label="Novo cliente"><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome ou razão social" /></Field>
        <Button onClick={addClient}><Plus size={16} /> Salvar cliente</Button>
      </div>
      <div className="data-grid">
        {state.clients.map((client) => <article className="data-card floating-card" key={client.id}>
          <div className="avatar-circle">{client.name.slice(0, 2).toUpperCase()}</div>
          <strong>{client.name}</strong>
          <small>{client.type} · {client.document || "documento pendente"}</small>
          <p>{client.city || "Cidade não informada"}</p>
          <div className="card-footer"><StatusBadge tone={statusTone(client.status)}>{client.status}</StatusBadge><span>{money(client.lifetimeValue)}</span></div>
        </article>)}
      </div>
    </Panel>
  </div>;
}
