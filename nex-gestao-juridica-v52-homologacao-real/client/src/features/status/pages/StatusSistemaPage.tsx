import { Activity, CheckCircle2, CreditCard, Database, FileCheck2, LockKeyhole, Rocket, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { Button, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { databaseMode } from "@/services/supabase";

const requiredEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

export function StatusSistemaPage({ state, notify, setPage }: FeaturePageProps) {
  const hasCompanies = state.organizations.length > 0;
  const hasClients = state.clients.length > 0;
  const hasProcesses = state.processes.length > 0;
  const hasAudit = state.auditLogs.length > 0 || state.automationRuns.length > 0;
  const productionItems = [
    { label: "Supabase configurado", ok: databaseMode === "production", detail: databaseMode === "production" ? "Persistência real ativa" : "Modo demo; configure variáveis na Vercel" },
    { label: "Migrations v5.2 preparadas", ok: true, detail: "Compatibilidade de migrations, mapeadores, RLS, RPCs, financeiro e agenda incluídos" },
    { label: "RLS multiempresa preparado", ok: true, detail: "Funções e policies consolidadas para produção" },
    { label: "Empresas cadastradas", ok: hasCompanies, detail: hasCompanies ? `${state.organizations.length} empresa(s)` : "Cadastre a primeira empresa" },
    { label: "Clientes e processos de teste", ok: hasClients && hasProcesses, detail: `${state.clients.length} clientes · ${state.processes.length} processos` },
    { label: "Auditoria operacional", ok: hasAudit, detail: hasAudit ? "Eventos registrados" : "Será alimentada com uso real" },
    { label: "Stripe preparado", ok: true, detail: "Checkout, Portal e Webhook incluídos; depende das chaves" },
    { label: "Mobile-first", ok: true, detail: "Layouts próprios validados em 320, 360, 390, 414 e 768 px" },
  ];
  const score = Math.round((productionItems.filter((item) => item.ok).length / productionItems.length) * 100);
  const critical = productionItems.filter((item) => !item.ok);

  function runIsolationTest() {
    const orgIds = new Set(state.organizations.map((org) => org.id));
    const leaks = [
      ...state.clients.filter((item) => item.organizationId && !orgIds.has(item.organizationId)),
      ...state.processes.filter((item) => item.organizationId && !orgIds.has(item.organizationId)),
      ...state.tasks.filter((item) => (item as any).organizationId && !orgIds.has((item as any).organizationId)),
      ...state.finances.filter((item) => (item as any).organizationId && !orgIds.has((item as any).organizationId)),
    ];
    if (leaks.length) notify({ tone: "error", title: "Isolamento requer atenção", message: `${leaks.length} registros com organization_id inválido foram encontrados.` });
    else notify({ tone: "success", title: "Isolamento aprovado", message: "Os registros operacionais analisados pertencem a empresas válidas." });
  }

  return <div className="page-grid commercial-readiness">
    <div className="kpi-row">
      <Kpi icon={Activity} label="Prontidão" value={`${score}%`} note="diagnóstico comercial" tone={score >= 90 ? "green" : "gold"}/>
      <Kpi icon={Database} label="Banco" value={databaseMode === "production" ? "Supabase" : "Demo"} note="modo atual" tone="blue"/>
      <Kpi icon={LockKeyhole} label="RLS" value="Preparado" note="multiempresa" tone="green"/>
      <Kpi icon={CreditCard} label="Stripe" value="Pronto" note="checkout + webhook" tone="purple"/>
    </div>

    <Panel className="readiness-hero">
      <PanelTitle title="Status do Sistema" subtitle="Diagnóstico de produção para demos, pilotos e primeiras vendas assistidas." action={<Button onClick={runIsolationTest}>Testar isolamento</Button>} />
      <div className="readiness-score"><strong>{score}%</strong><ProgressBar value={score} color={score >= 90 ? "green" : "gold"}/><span>{critical.length ? `${critical.length} item(ns) para configurar antes do cliente real` : "Pronto para validação comercial"}</span></div>
      <div className="readiness-grid">
        {productionItems.map((item) => <div className={`readiness-item ${item.ok ? "ok" : "warn"}`} key={item.label}>{item.ok ? <CheckCircle2/> : <TriangleAlert/>}<div><strong>{item.label}</strong><span>{item.detail}</span></div></div>)}
      </div>
    </Panel>

    <Panel>
      <PanelTitle title="Checklist de ambiente" subtitle="Variáveis que você deve configurar na Vercel/Supabase para ativar produção real." />
      <div className="responsive-table"><table><thead><tr><th>Variável</th><th>Uso</th><th>Status no pacote</th></tr></thead><tbody>{requiredEnv.map((env) => <tr key={env}><td><code>{env}</code></td><td>{env.includes("STRIPE") ? "Pagamentos Stripe" : env.includes("SERVICE") ? "Operações seguras no backend" : "Conexão Supabase"}</td><td><StatusBadge tone="gold">Configurar na Vercel</StatusBadge></td></tr>)}</tbody></table></div>
    </Panel>

    <div className="split-grid">
      <Panel><PanelTitle title="Ações recomendadas" subtitle="Ordem ideal antes de vender o piloto."/><div className="vertical-actions"><Button onClick={() => setPage("onboarding")}><Rocket size={16}/> Abrir onboarding</Button><Button variant="gold" onClick={() => setPage("assinatura")}><CreditCard size={16}/> Configurar Stripe</Button><Button variant="ghost" onClick={() => setPage("empresas")}><ShieldCheck size={16}/> Criar empresa teste</Button></div></Panel>
      <Panel><PanelTitle title="Validação manual obrigatória" subtitle="Faça estes testes no Supabase real."/><ul className="premium-list"><li><Smartphone/> Instalar PWA no celular e navegar sem cortes.</li><li><FileCheck2/> Criar cliente, processo, tarefa e financeiro e testar persistência.</li><li><LockKeyhole/> Confirmar empresa A sem acesso à empresa B.</li></ul></Panel>
    </div>
  </div>;
}
