import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, Network, Plus, Save, Sprout, Workflow } from "lucide-react";
import type { FeaturePageProps, LegalModuleRecord, RuralProperty, WorkflowStep } from "@/types/app";
import { legalModules, matterWorkflow, moduleForProcess, ruralPropertyModel } from "@/data/legalEnterprise";
import { ActionBar, Button, Field, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { money, statusTone, uid } from "@/utils/format";

const ruralStatuses = ["Regular", "Pendente", "Em análise", "Com exigência", "Irregular", "Concluído"];

function blankModuleRecord(moduleArea: string, props: FeaturePageProps): LegalModuleRecord {
  const process = props.state.processes.find((item) => moduleForProcess(item).area === moduleArea) ?? props.state.processes[0];
  const blueprint = legalModules.find((module) => module.area === moduleArea) ?? legalModules[0];
  return {
    id: uid("module"),
    organizationId: props.state.organizations[0]?.id,
    moduleArea,
    processId: process?.id ?? "",
    clientId: process?.clientId,
    client: process?.client ?? props.state.clients[0]?.name ?? "",
    serviceType: blueprint.services[0] ?? "Serviço jurídico",
    stage: blueprint.workflow[0] ?? "Triagem",
    status: "Ativo",
    responsibleId: process?.responsible,
    fieldValues: Object.fromEntries(blueprint.requiredFields.slice(0, 8).map((field) => [field, "Pendente"])),
    checklist: blueprint.checklist.map((label) => ({ label, done: false })),
    indicators: { pendencias: blueprint.checklist.length, progresso: 0 },
  };
}

function blankRuralProperty(props: FeaturePageProps): RuralProperty {
  const process = props.state.processes.find((p) => moduleForProcess(p).area === "Agrário/Rural") ?? props.state.processes[0];
  return {
    id: uid("rural"),
    organizationId: props.state.organizations[0]?.id,
    clientId: process?.clientId ?? props.state.clients[0]?.id,
    processId: process?.id,
    name: "",
    propertyType: "Fazenda",
    owner: process?.client ?? "",
    municipality: "",
    state: "MA",
    declaredArea: 0,
    measuredArea: 0,
    registeredArea: 0,
    environmentalStatus: "Pendente",
    taxStatus: "Pendente",
    registryStatus: "Pendente",
    landStatus: "Pendente",
    pendingItems: [],
    protocols: [],
  };
}

export function ModulosJuridicosPage(props: FeaturePageProps) {
  const { state, commit, notify } = props;
  const [selectedArea, setSelectedArea] = useState<string>("Agrário/Rural");
  const [editingRecord, setEditingRecord] = useState<LegalModuleRecord | null>(null);
  const [editingRural, setEditingRural] = useState<RuralProperty | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const activeAreas = new Set(state.processes.map((process) => moduleForProcess(process).area));
  const rural = legalModules.find((module) => module.area === "Agrário/Rural")!;
  const selectedBlueprint = legalModules.find((module) => module.area === selectedArea) ?? legalModules[0];
  const moduleRecords = state.legalModuleRecords.filter((record) => record.moduleArea === selectedArea);
  const workflows = state.workflowTemplates.filter((template) => template.moduleArea === selectedArea || template.moduleArea === "Geral");
  const steps = useMemo(() => state.workflowSteps.filter((step) => workflows.some((workflow) => workflow.id === step.workflowId)).sort((a, b) => a.order - b.order), [state.workflowSteps, workflows]);

  const recordFields: FieldConfig<LegalModuleRecord>[] = [
    { key: "moduleArea", label: "Área jurídica", kind: "select", options: legalModules.map((m) => m.area) },
    { key: "processId", label: "Processo/caso", kind: "select", options: state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.area} · ${p.cnj || p.class}` })) },
    { key: "client", label: "Cliente" },
    { key: "serviceType", label: "Serviço específico", kind: "select", options: selectedBlueprint.services },
    { key: "stage", label: "Etapa do módulo", kind: "select", options: selectedBlueprint.workflow },
    { key: "status", label: "Status", kind: "select", options: ["Ativo", "Pendente", "Em análise", "Aguardando cliente", "Concluído", "Arquivado"] },
    { key: "responsibleId", label: "Responsável", kind: "select", options: state.employees.map((employee) => ({ value: employee.id, label: employee.name })) },
  ];

  const ruralFields: FieldConfig<RuralProperty>[] = [
    { key: "name", label: "Nome da propriedade", required: true },
    { key: "propertyType", label: "Tipo", kind: "select", options: ["Fazenda", "Sítio", "Chácara", "Gleba", "Lote rural", "Área produtiva"] },
    { key: "owner", label: "Proprietário" },
    { key: "possessor", label: "Possuidor" },
    { key: "clientId", label: "Cliente vinculado", kind: "select", options: state.clients.map((c) => ({ value: c.id, label: c.name })) },
    { key: "processId", label: "Processo vinculado", kind: "select", options: state.processes.map((p) => ({ value: p.id, label: `${p.client} · ${p.cnj || p.class}` })) },
    { key: "municipality", label: "Município" },
    { key: "state", label: "UF" },
    { key: "locality", label: "Localidade" },
    { key: "declaredArea", label: "Área declarada", kind: "number" },
    { key: "measuredArea", label: "Área medida", kind: "number" },
    { key: "registeredArea", label: "Área registrada", kind: "number" },
    { key: "registryNumber", label: "Matrícula" },
    { key: "notaryOffice", label: "Cartório" },
    { key: "ccir", label: "CCIR" },
    { key: "car", label: "CAR" },
    { key: "itr", label: "ITR" },
    { key: "cib", label: "CIB" },
    { key: "nirf", label: "NIRF" },
    { key: "sigef", label: "SIGEF" },
    { key: "incra", label: "INCRA" },
    { key: "coordinates", label: "Coordenadas" },
    { key: "memorial", label: "Memorial descritivo", kind: "textarea" },
    { key: "boundaries", label: "Confrontantes", kind: "textarea" },
    { key: "legalReserve", label: "Reserva legal" },
    { key: "appArea", label: "APP" },
    { key: "productiveArea", label: "Área produtiva" },
    { key: "preservationArea", label: "Área de preservação" },
    { key: "environmentalStatus", label: "Situação ambiental", kind: "select", options: ruralStatuses },
    { key: "taxStatus", label: "Situação tributária", kind: "select", options: ruralStatuses },
    { key: "registryStatus", label: "Situação registral", kind: "select", options: ruralStatuses },
    { key: "landStatus", label: "Situação fundiária", kind: "select", options: ruralStatuses },
    { key: "technicalResponsible", label: "Responsável técnico" },
    { key: "artRrt", label: "ART/RRT" },
  ];

  const stepFields: FieldConfig<WorkflowStep>[] = [
    { key: "workflowId", label: "Workflow", kind: "select", options: state.workflowTemplates.map((w) => ({ value: w.id, label: `${w.name} · ${w.moduleArea}` })) },
    { key: "order", label: "Ordem", kind: "number" },
    { key: "name", label: "Nome da etapa" },
    { key: "taskTitle", label: "Tarefa automática" },
    { key: "responsibleRole", label: "Papel responsável" },
    { key: "autoPriority", label: "Prioridade automática", kind: "select", options: ["Baixa", "Média", "Alta", "Urgente", "Crítica"] },
  ];

  async function saveRecord(record: LegalModuleRecord) {
    const process = state.processes.find((item) => item.id === record.processId);
    const blueprint = legalModules.find((module) => module.area === record.moduleArea) ?? selectedBlueprint;
    const prepared: LegalModuleRecord = {
      ...record,
      clientId: process?.clientId ?? record.clientId,
      client: process?.client ?? record.client,
      fieldValues: Object.keys(record.fieldValues ?? {}).length ? record.fieldValues : Object.fromEntries(blueprint.requiredFields.slice(0, 12).map((field) => [field, "Pendente"])),
      checklist: record.checklist?.length ? record.checklist : blueprint.checklist.map((label) => ({ label, done: false })),
    };
    const isNew = !state.legalModuleRecords.some((item) => item.id === record.id);
    await commit("legalModuleRecords", prepared, isNew ? "create" : "update");
    setEditingRecord(null);
    notify({ tone: "success", title: isNew ? "Módulo aplicado ao caso" : "Módulo atualizado", message: "Campos especializados, checklist e indicadores foram salvos no Core jurídico." });
  }

  async function saveRural(property: RuralProperty) {
    const normalized = {
      ...property,
      pendingItems: Array.isArray(property.pendingItems) ? property.pendingItems : String(property.pendingItems || "").split(",").map((item) => item.trim()).filter(Boolean),
      protocols: Array.isArray(property.protocols) ? property.protocols : String(property.protocols || "").split(",").map((item) => item.trim()).filter(Boolean),
    };
    const isNew = !state.ruralProperties.some((item) => item.id === property.id);
    await commit("ruralProperties", normalized, isNew ? "create" : "update");
    setEditingRural(null);
    notify({ tone: "success", title: isNew ? "Imóvel rural cadastrado" : "Imóvel rural atualizado", message: "Dossiê rural salvo com dados fundiários, ambientais, tributários e registrais." });
  }

  async function saveStep(step: WorkflowStep) {
    const isNew = !state.workflowSteps.some((item) => item.id === step.id);
    await commit("workflowSteps", step, isNew ? "create" : "update");
    setEditingStep(null);
    notify({ tone: "success", title: "Workflow salvo", message: "Etapa configurável pronta para criar tarefas e notificações sem IA." });
  }

  function makeStep() {
    const workflow = state.workflowTemplates.find((w) => w.moduleArea === selectedArea) ?? state.workflowTemplates[0];
    setEditingStep({ id: uid("step"), workflowId: workflow.id, order: steps.length + 1, name: "Nova etapa", createsTask: true, taskTitle: "Nova tarefa automática", responsibleRole: "Advogado", requiresDocument: false, notifyClient: false, autoPriority: "Alta" });
  }

  return <div className="page-grid modulos-page">
    <div className="kpi-row">
      <Kpi icon={Network} label="Módulos especializados" value={legalModules.length} note="campos, checklists, fluxos e relatórios próprios" tone="blue" />
      <Kpi icon={CheckCircle2} label="Casos especializados" value={state.legalModuleRecords.length} note="vinculados ao Core jurídico" tone="green" />
      <Kpi icon={ClipboardList} label="Etapas configuráveis" value={state.workflowSteps.length} note="automação por regra, sem IA" tone="gold" />
      <Kpi icon={Sprout} label="Imóveis rurais" value={state.ruralProperties.length} note="CAR, CCIR, ITR, CIB, SIGEF e INCRA" tone="purple" />
    </div>

    <Panel>
      <PanelTitle title="Módulos Jurídicos Enterprise" subtitle="Cada área usa clientes, processos, tarefas, documentos e financeiro do Core; a especialização adiciona campos próprios, checklist, workflow e relatórios." action={<ActionBar><Button variant="ghost" onClick={() => setEditingRecord(blankModuleRecord(selectedArea, props))}><Plus size={16}/> Vincular caso ao módulo</Button><Button onClick={() => setEditingRural(blankRuralProperty(props))}><Sprout size={16}/> Novo imóvel rural</Button></ActionBar>} />
      <div className="form-grid">
        <Field label="Área jurídica"><select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>{legalModules.map((module) => <option key={module.area} value={module.area}>{module.area}</option>)}</select></Field>
        <Field label="Áreas em uso"><div className="chip-cloud">{Array.from(activeAreas).map((area) => <span key={area}>{area}</span>)}</div></Field>
      </div>
    </Panel>

    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title={selectedBlueprint.area} subtitle={selectedBlueprint.objective} />
        <div className="module-section"><b>Serviços atendidos</b><small>{selectedBlueprint.services.join(" · ")}</small></div>
        <div className="module-section"><b>Campos próprios exigidos</b><small>{selectedBlueprint.requiredFields.join(" · ")}</small></div>
        <div className="module-section"><b>Checklist padrão</b><small>{selectedBlueprint.checklist.join(" · ")}</small></div>
        <div className="module-section"><b>Relatórios do módulo</b><small>{selectedBlueprint.reports.join(" · ")}</small></div>
      </Panel>
      <Panel>
        <PanelTitle title="Workflow configurável" subtitle="As etapas abaixo criam tarefas, notificações e exigências conforme regra cadastrada." action={<Button variant="ghost" onClick={makeStep}><Plus size={15}/> Etapa</Button>} />
        <div className="stack-list">
          {steps.map((step) => <div className="data-card" key={step.id}>
            <Workflow size={17}/><strong>{step.order}. {step.name}</strong><small>{step.taskTitle || "sem tarefa automática"} · {step.responsibleRole || "responsável livre"}</small>
            <div className="card-tags"><StatusBadge tone={step.createsTask ? "green" : "neutral"}>{step.createsTask ? "Cria tarefa" : "Sem tarefa"}</StatusBadge><StatusBadge tone={step.notifyClient ? "blue" : "neutral"}>{step.notifyClient ? "Notifica cliente" : "Interno"}</StatusBadge></div>
            <Button variant="ghost" onClick={() => setEditingStep(step)}>Editar etapa</Button>
          </div>)}
        </div>
      </Panel>
    </div>

    <Panel>
      <PanelTitle title="Casos especializados do módulo" subtitle="Registros reais vinculados ao processo/caso, sem duplicar cliente, financeiro, documentos ou agenda." />
      <div className="data-grid">
        {moduleRecords.map((record) => <article className="data-card floating-card" key={record.id}>
          <strong>{record.client}</strong><small>{record.serviceType} · {record.stage}</small>
          <p>Processo: {state.processes.find((p) => p.id === record.processId)?.cnj || record.processId}</p>
          <div className="card-tags"><StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge><StatusBadge tone="gold">{record.checklist.filter((item) => item.done).length}/{record.checklist.length} checklist</StatusBadge></div>
          <div className="chip-cloud">{Object.entries(record.fieldValues).slice(0, 6).map(([key, value]) => <span key={key}>{key}: {String(value)}</span>)}</div>
          <Button variant="ghost" onClick={() => setEditingRecord(record)}><Save size={14}/> Editar módulo</Button>
        </article>)}
      </div>
    </Panel>

    <div className="dashboard-layout secondary">
      <Panel>
        <PanelTitle title="Cadastro Agrário/Rural completo" subtitle="Dossiê técnico do imóvel rural com situação fundiária, ambiental, tributária, registral e protocolos." action={<Button variant="ghost" onClick={() => setEditingRural(blankRuralProperty(props))}><Plus size={16}/> Imóvel rural</Button>} />
        <div className="data-grid">
          {state.ruralProperties.map((property) => <article className="data-card floating-card" key={property.id}>
            <Sprout size={22}/><strong>{property.name}</strong><small>{property.propertyType} · {property.municipality}/{property.state}</small>
            <p>Matrícula: {property.registryNumber || "pendente"} · CAR: {property.car || "pendente"} · CCIR: {property.ccir || "pendente"}</p>
            <p>Áreas: declarada {property.declaredArea} ha · medida {property.measuredArea} ha · registrada {property.registeredArea} ha</p>
            <div className="card-tags"><StatusBadge tone={statusTone(property.landStatus)}>{property.landStatus}</StatusBadge><StatusBadge tone={statusTone(property.environmentalStatus)}>{property.environmentalStatus}</StatusBadge><StatusBadge tone="gold">{property.protocols.length} protocolos</StatusBadge></div>
            <div className="chip-cloud">{property.pendingItems.map((item) => <span key={item}>{item}</span>)}</div>
            <ActionBar><Button variant="ghost" onClick={() => setEditingRural(property)}>Editar dossiê</Button><Button variant="ghost" onClick={() => window.print()}><FileText size={14}/> Dossiê PDF</Button></ActionBar>
          </article>)}
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Modelo rural exigido" subtitle="Todos os campos estratégicos do prompt foram transformados em estrutura de dados e formulário." />
        <div className="chip-cloud">{ruralPropertyModel.map((field) => <span key={field}>{field}</span>)}</div>
        <PanelTitle title="Relatórios rurais" subtitle="Disponíveis para impressão/exportação e evolução para PDF customizado." />
        <div className="stack-list">{rural.reports.map((report) => <div className="data-card" key={report}><FileText size={17}/><strong>{report}</strong><small>Agrário/Rural</small></div>)}</div>
      </Panel>
    </div>

    <Panel>
      <PanelTitle title="Catálogo completo de áreas" subtitle="Visão rápida de todos os módulos enterprise disponíveis." />
      <div className="modules-grid">
        {legalModules.map((module) => {
          const count = state.legalModuleRecords.filter((record) => record.moduleArea === module.area).length;
          return <article className="module-card floating-card" key={module.area}>
            <div className="module-head"><strong>{module.area}</strong><StatusBadge tone={count ? "green" : "neutral"}>{count} casos</StatusBadge></div>
            <p>{module.objective}</p>
            <div className="module-section"><b>Campos próprios</b><small>{module.requiredFields.slice(0, 8).join(" · ")}{module.requiredFields.length > 8 ? " · ..." : ""}</small></div>
            <div className="card-tags"><StatusBadge tone="blue">Workflow</StatusBadge><StatusBadge tone="gold">Checklist</StatusBadge><StatusBadge tone={statusTone(module.area)}>{module.area}</StatusBadge></div>
          </article>;
        })}
      </div>
    </Panel>

    {editingRecord && <EntityFormModal<LegalModuleRecord> open={!!editingRecord} title="Caso especializado" subtitle="Vincule o caso ao módulo e salve etapa, serviço, responsável e checklist próprio." value={editingRecord} fields={recordFields} onClose={() => setEditingRecord(null)} onSave={saveRecord} />}
    {editingRural && <EntityFormModal<RuralProperty> open={!!editingRural} title="Cadastro de imóvel rural" subtitle="CAR, CCIR, ITR, CIB, NIRF, SIGEF, INCRA, matrícula, memorial, APP, reserva legal, protocolos e responsável técnico." value={editingRural} fields={ruralFields} onClose={() => setEditingRural(null)} onSave={saveRural} />}
    {editingStep && <EntityFormModal<WorkflowStep> open={!!editingStep} title="Etapa de workflow" subtitle="Configure a regra da etapa: tarefa automática, responsável, prioridade e notificação." value={editingStep} fields={stepFields} onClose={() => setEditingStep(null)} onSave={saveStep} />}
  </div>;
}
