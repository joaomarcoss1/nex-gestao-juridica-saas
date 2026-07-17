import { useMemo, useState } from "react";
import { BadgeCheck, Edit3, FileCheck2, Receipt, Scale, Send, Trash2 } from "lucide-react";
import type { FeaturePageProps, FinanceEntry, PricingProposal } from "@/types/app";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { areaLabels, calculateLegalPricing, defaultCaseInput, defaultOfficeCosts, servicoLabels, type AreaDireito, type CasePricingInput, type OfficeCostConfig, type ServicoJuridico } from "@/lib/legalPricing";
import { money, statusTone, todayIso, uid } from "@/utils/format";
import { requestConfirmation } from "@/services/dialog.service";

const costFields: Array<[keyof OfficeCostConfig, string]> = [["aluguel","Aluguel"],["energia","Energia"],["agua","Água"],["internet","Internet"],["sistemas","Sistemas"],["contador","Contador"],["marketing","Marketing"],["materialEscritorio","Material de escritório"],["manutencao","Manutenção"],["impostosFixos","Impostos fixos"],["folhaFuncionarios","Folha dos funcionários"],["proLaboreSocios","Pró-labore dos sócios"],["outros","Outros custos"],["horasProdutivasMes","Horas produtivas mensais"],["margemLucroDesejada","Margem desejada (%)"],["impostosVariaveisPercentual","Impostos variáveis (%)"],["reservaRiscoPercentual","Reserva de risco (%)"],["custoKm","Custo por km"]];
const expenseFields: Array<[keyof CasePricingInput, string]> = [["custas","Custas"],["copiasDigitalizacoes","Cópias/digitalizações"],["certidoes","Certidões"],["diligenciasTerceiros","Diligências"],["alimentacao","Alimentação"],["hospedagem","Hospedagem"],["estacionamento","Estacionamento"],["outrasDespesas","Outras despesas"]];
const proposalStatuses: PricingProposal["status"][] = ["Rascunho", "Enviada", "Aceita", "Recusada"];

export function PrecificacaoPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [tab, setTab] = useState("custos");
  const [office, setOffice] = useState<OfficeCostConfig>(defaultOfficeCosts);
  const [caseInput, setCaseInput] = useState<CasePricingInput>(defaultCaseInput);
  const [client, setClient] = useState(state.clients[0]?.name ?? "");
  const [editingProposal, setEditingProposal] = useState<PricingProposal | null>(null);
  const result = useMemo(() => calculateLegalPricing(office, caseInput), [office, caseInput]);

  function setOfficeNumber(key: keyof OfficeCostConfig, value: string) { setOffice((current) => ({ ...current, [key]: Number(value) || 0 })); }
  function setCaseNumber(key: keyof CasePricingInput, value: string) { setCaseInput((current) => ({ ...current, [key]: Number(value) || 0 })); }
  function buildProposal(status: PricingProposal["status"]): PricingProposal {
    return { id: uid("pricing"), title: servicoLabels[caseInput.servico], client, processId: state.processes.find((p) => p.client === client)?.id, area: areaLabels[caseInput.area], service: servicoLabels[caseInput.servico], minimum: result.minimoTecnico, recommended: result.recomendado, premium: result.premium, entry: result.entradaSugerida, successFee: result.honorarioExito, status, createdAt: todayIso() };
  }

  async function saveProposal(status: PricingProposal["status"] = "Rascunho") {
    const proposal = buildProposal(status);
    await commit("pricings", proposal);
    if (status === "Aceita") {
      const entry: FinanceEntry = { id: uid("fin"), type: "Receita", category: "Entrada de honorários", client, processId: proposal.processId, amount: proposal.entry, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: `Gerado pela proposta ${proposal.title}` };
      await commit("finances", entry);
      await commit("automationRuns", { id: uid("run"), ruleId: "proposta-aceita", ruleName: "Proposta aceita gera cobrança", result: `Cobrança de entrada criada para ${client}`, date: todayIso(), status: "Sucesso" });
    }
    notify({ tone: "success", title: "Proposta salva", message: status === "Aceita" ? "Entrada financeira criada automaticamente." : "Precificação registrada em tabela normalizada." });
  }

  async function saveProposalEdit(proposal: PricingProposal) {
    await commit("pricings", proposal, "update");
    setEditingProposal(null);
    notify({ tone: "success", title: "Proposta atualizada" });
  }
  async function deleteProposal(proposal: PricingProposal) {
    if (!await requestConfirmation("Arquivar proposta", `A proposta ${proposal.title} será arquivada. Deseja continuar?`)) return;
    await remove("pricings", proposal.id);
    notify({ tone: "info", title: "Proposta removida" });
  }
  async function acceptExisting(proposal: PricingProposal) {
    const accepted = { ...proposal, status: "Aceita" as const };
    await commit("pricings", accepted, "update");
    const entry: FinanceEntry = { id: uid("fin"), type: "Receita", category: "Entrada de honorários", client: proposal.client, processId: proposal.processId, amount: proposal.entry, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: `Gerado pela proposta ${proposal.title}` };
    await commit("finances", entry);
    notify({ tone: "success", title: "Proposta aceita", message: "Cobrança de entrada criada no financeiro." });
  }

  const proposalFields: FieldConfig<PricingProposal>[] = [
    { key: "title", label: "Título", required: true },
    { key: "client", label: "Cliente", kind: "select", options: state.clients.map((c) => c.name) },
    { key: "processId", label: "Processo", kind: "select", options: [{ value: "", label: "Sem processo" }, ...state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area}` }))] },
    { key: "area", label: "Área" },
    { key: "service", label: "Serviço" },
    { key: "minimum", label: "Valor mínimo técnico", kind: "number" },
    { key: "recommended", label: "Valor recomendado", kind: "number" },
    { key: "premium", label: "Valor premium", kind: "number" },
    { key: "entry", label: "Entrada sugerida", kind: "number" },
    { key: "successFee", label: "Honorário de êxito", kind: "number" },
    { key: "status", label: "Status", kind: "select", options: proposalStatuses },
    { key: "createdAt", label: "Data", kind: "date" },
  ];

  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={Scale} label="Mínimo técnico" value={money(result.minimoTecnico)} note="custo + piso ético" tone="blue"/><Kpi icon={BadgeCheck} label="Recomendado" value={money(result.recomendado)} note="melhor proposta" tone="green"/><Kpi icon={Receipt} label="Premium" value={money(result.premium)} note="valor estratégico" tone="gold"/><Kpi icon={FileCheck2} label="Entrada" value={money(result.entradaSugerida)} note="sugestão de contrato" tone="purple"/></div>
    <Panel>
      <PanelTitle title="Precificação jurídica completa" subtitle="Todos os campos são editáveis, recalculados em tempo real e salvos como proposta." action={<ActionBar><Button variant="ghost" onClick={() => saveProposal("Rascunho")}>Salvar</Button><Button onClick={() => saveProposal("Aceita")}><Send size={15}/> Aceitar e cobrar</Button></ActionBar>} />
      <div className="tabs">{[["custos","Custos"],["caso","Caso"],["mao","Mão de obra"],["eventos","Eventos"],["despesas","Despesas"],["resultado","Resultado"]].map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? "active" : ""}>{label}</button>)}</div>
      {tab === "custos" && <div className="pricing-grid">{costFields.map(([key,label]) => <Field key={key} label={label}><input type="number" value={office[key]} onChange={(e) => setOfficeNumber(key, e.target.value)} /></Field>)}</div>}
      {tab === "caso" && <div className="pricing-grid"><Field label="Cliente"><select value={client} onChange={(e) => setClient(e.target.value)}>{state.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field><Field label="Área"><select value={caseInput.area} onChange={(e) => setCaseInput((c) => ({...c, area: e.target.value as AreaDireito}))}>{Object.entries(areaLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Tipo de serviço"><select value={caseInput.servico} onChange={(e) => setCaseInput((c) => ({...c, servico: e.target.value as ServicoJuridico}))}>{Object.entries(servicoLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Valor da causa"><input type="number" value={caseInput.valorCausa} onChange={(e) => setCaseNumber("valorCausa", e.target.value)} /></Field><Field label="Complexidade"><input type="number" min="1" max="5" value={caseInput.complexidade} onChange={(e) => setCaseNumber("complexidade", e.target.value)} /></Field><Field label="Urgência"><input type="number" min="1" max="5" value={caseInput.urgencia} onChange={(e) => setCaseNumber("urgencia", e.target.value)} /></Field><Field label="Risco"><input type="number" min="1" max="5" value={caseInput.risco} onChange={(e) => setCaseNumber("risco", e.target.value)} /></Field></div>}
      {tab === "mao" && <div className="pricing-grid"><Field label="Horas técnicas"><input type="number" value={caseInput.horasTecnicas} onChange={(e) => setCaseNumber("horasTecnicas", e.target.value)} /></Field><Field label="Horas administrativas"><input type="number" value={caseInput.horasAdministrativas} onChange={(e) => setCaseNumber("horasAdministrativas", e.target.value)} /></Field><Field label="Horas de deslocamento"><input type="number" value={caseInput.horasDeslocamento} onChange={(e) => setCaseNumber("horasDeslocamento", e.target.value)} /></Field><Field label="Advogado responsável"><select defaultValue={state.employees[0]?.name ?? ""}>{state.employees.map((e) => <option key={e.id}>{e.name}</option>)}</select></Field><Field label="Valor hora base"><input value={money(result.custoHoraEscritorio)} readOnly /></Field></div>}
      {tab === "eventos" && <div className="pricing-grid"><Field label="Audiência conciliação"><input type="number" value={caseInput.audienciasConciliacao} onChange={(e) => setCaseNumber("audienciasConciliacao", e.target.value)} /></Field><Field label="Audiência instrução"><input type="number" value={caseInput.audienciasInstrucao} onChange={(e) => setCaseNumber("audienciasInstrucao", e.target.value)} /></Field><Field label="Audiência custódia"><input type="number" value={caseInput.audienciasCustodia} onChange={(e) => setCaseNumber("audienciasCustodia", e.target.value)} /></Field><Field label="Ida à delegacia"><input type="number" value={caseInput.idasDelegacia} onChange={(e) => setCaseNumber("idasDelegacia", e.target.value)} /></Field><Field label="Ida ao tribunal"><input type="number" value={caseInput.idasTribunal} onChange={(e) => setCaseNumber("idasTribunal", e.target.value)} /></Field><Field label="KM total"><input type="number" value={caseInput.kmTotal} onChange={(e) => setCaseNumber("kmTotal", e.target.value)} /></Field><label className="check-row"><input type="checkbox" checked={caseInput.plantao} onChange={(e) => setCaseInput((c) => ({...c, plantao: e.target.checked}))}/> Plantão</label><label className="check-row"><input type="checkbox" checked={caseInput.foraComarca} onChange={(e) => setCaseInput((c) => ({...c, foraComarca: e.target.checked}))}/> Fora da comarca</label></div>}
      {tab === "despesas" && <div className="pricing-grid">{expenseFields.map(([key,label]) => <Field key={key} label={label}><input type="number" value={caseInput[key] as number} onChange={(e) => setCaseNumber(key, e.target.value)} /></Field>)}</div>}
      {tab === "resultado" && <div className="result-grid"><Panel><PanelTitle title="Resultado da proposta" subtitle="Valores de honorários e margem real estimada."/><div className="price-list"><span>Custo operacional <b>{money(result.custoOperacional)}</b></span><span>Referência OAB <b>{money(result.baseOab)}</b></span><span>Mínimo técnico <b>{money(result.minimoTecnico)}</b></span><span>Recomendado <b>{money(result.recomendado)}</b></span><span>Premium <b>{money(result.premium)}</b></span><span>Entrada sugerida <b>{money(result.entradaSugerida)}</b></span><span>Êxito <b>{money(result.honorarioExito)}</b></span><span>Margem real <b>{result.margemRealEstimada.toFixed(1)}%</b></span></div></Panel><Panel><PanelTitle title="Alertas técnicos" subtitle="Conferência profissional antes do contrato."/>{result.alertas.map((alert) => <p className="alert-line" key={alert}>{alert}</p>)}<p className="legal-note">Os valores são estimativas gerenciais e devem ser validados pelo advogado responsável conforme tabela da OAB aplicável, complexidade do caso e estratégia profissional.</p></Panel></div>}
    </Panel>
    <Panel><PanelTitle title="Propostas salvas" subtitle="Edite valores, altere status, aceite e converta em cobrança." />
      <div className="responsive-table"><table><thead><tr><th>Título</th><th>Cliente</th><th>Recomendado</th><th>Entrada</th><th>Status</th><th>Ações</th></tr></thead><tbody>{state.pricings.map((proposal) => <tr key={proposal.id}><td>{proposal.title}</td><td>{proposal.client}</td><td>{money(proposal.recommended)}</td><td>{money(proposal.entry)}</td><td><StatusBadge tone={statusTone(proposal.status)}>{proposal.status}</StatusBadge></td><td><ActionBar>{proposal.status !== "Aceita" && <Button variant="ghost" onClick={() => acceptExisting(proposal)}>Aceitar</Button>}<Button variant="ghost" onClick={() => setEditingProposal(proposal)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={() => deleteProposal(proposal)}><Trash2 size={15}/></Button></ActionBar></td></tr>)}</tbody></table></div>
    </Panel>
    {editingProposal && <EntityFormModal<PricingProposal> open={!!editingProposal} title="Editar proposta" subtitle="Ajuste valores e status sem refazer o cálculo." value={editingProposal} fields={proposalFields} onClose={() => setEditingProposal(null)} onSave={saveProposalEdit} />}
  </div>;
}
