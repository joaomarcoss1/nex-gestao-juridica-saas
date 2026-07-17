import { useMemo, useState } from "react";
import { BadgeCheck, CreditCard, Crown, ExternalLink, FileText, Gift, LockKeyhole, ShieldCheck, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import type { FeaturePageProps, Organization } from "@/types/app";
import { Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { openStripeCustomerPortal, startStripeCheckout } from "@/services/billing.service";
import { useAuth } from "@/hooks/useAuth";
import { requestTextInput } from "@/services/dialog.service";

const plans = [
  { key: "starter" as const, name: "Starter", price: "R$ 197/mês", subtitle: "Escritório pequeno", features: ["Até 3 usuários", "Clientes e processos", "Portal do cliente", "Relatórios essenciais"] },
  { key: "pro" as const, name: "Pro", price: "R$ 397/mês", subtitle: "Equipe em crescimento", features: ["Até 10 usuários", "Financeiro completo", "Documentos", "Relatórios executivos"] },
  { key: "enterprise" as const, name: "Enterprise", price: "Sob consulta", subtitle: "Multiunidade e suporte", features: ["Usuários avançados", "Suporte assistido", "Onboarding", "Auditoria e BI"] },
];

function isGlobalMaster(role?: string) {
  return ["admin_master", "admin_master_global"].includes(String(role ?? "").toLowerCase());
}

function todayIso() {
  return new Date().toISOString();
}

function billingLabel(org?: Organization) {
  if (!org) return { tone: "neutral" as const, label: "Sem empresa" };
  if (org.billingExemptForever) return { tone: "green" as const, label: "Isenta para sempre" };
  if (org.manualTrialEnabled) return { tone: "gold" as const, label: "Teste gratuito ativo" };
  if (String(org.subscriptionStatus ?? "").toLowerCase() === "active") return { tone: "green" as const, label: "Assinatura ativa" };
  if (String(org.subscriptionStatus ?? "").toLowerCase() === "past_due") return { tone: "red" as const, label: "Pagamento pendente" };
  return { tone: "blue" as const, label: "Cobrança via Stripe" };
}

function billingModeNote(org?: Organization) {
  if (!org) return "Selecione ou cadastre uma empresa para gerenciar assinatura.";
  if (org.billingExemptForever) return org.billingExemptReason || "Esta empresa foi liberada permanentemente de cobrança pelo Admin Master Global.";
  if (org.manualTrialEnabled) return org.manualTrialReason || "Esta empresa está em teste gratuito manual até o Admin Master Global desativar.";
  return "Empresa elegível para assinatura recorrente via Stripe.";
}

export function AssinaturaPage({ state, commit, notify }: FeaturePageProps) {
  const { profile } = useAuth();
  const isMaster = isGlobalMaster(profile?.role);
  const visibleOrganizations = useMemo(() => isMaster ? state.organizations : state.organizations.filter((item) => item.id === profile?.organizationId), [isMaster, profile?.organizationId, state.organizations]);
  const [selectedOrgId, setSelectedOrgId] = useState(() => visibleOrganizations[0]?.id ?? "");
  const organization = visibleOrganizations.find((item) => item.id === selectedOrgId) ?? visibleOrganizations[0];
  const currentBilling = billingLabel(organization);

  async function updateOrganization(updated: Organization, success: string) {
    await commit("organizations", { ...updated, updatedAt: new Date().toISOString().slice(0, 10) }, "update");
    notify({ tone: "success", title: "Assinatura atualizada", message: success });
  }

  async function enableManualTrial() {
    if (!isMaster || !organization) return;
    const reason = await requestTextInput("Ativar teste gratuito", "Motivo ou observação do teste gratuito:", "Teste comercial liberado pelo Admin Master Global");
    if (!reason) return;
    await updateOrganization({
      ...organization,
      billingMode: "manual_trial",
      manualTrialEnabled: true,
      manualTrialStartedAt: organization.manualTrialStartedAt || todayIso(),
      manualTrialDisabledAt: undefined,
      manualTrialDisabledBy: undefined,
      manualTrialReason: reason,
      billingExemptForever: false,
      billingExemptReason: undefined,
      subscriptionStatus: "manual_trial",
      status: "Ativa",
      accessBlocked: false,
      blockedReason: undefined,
      billingNotes: `Teste gratuito ativo: ${reason}`,
    }, "Teste gratuito ativado. A empresa poderá usar o sistema até o Admin Master desativar.");
  }

  async function disableManualTrial() {
    if (!isMaster || !organization) return;
    const reason = await requestTextInput("Desativar teste gratuito", "Informe o motivo para desativar o teste gratuito:", "Teste gratuito encerrado pelo Admin Master Global");
    if (!reason) return;
    await updateOrganization({
      ...organization,
      billingMode: organization.billingExemptForever ? "lifetime_exempt" : "stripe",
      manualTrialEnabled: false,
      manualTrialDisabledAt: todayIso(),
      manualTrialDisabledBy: profile?.id,
      manualTrialReason: reason,
      subscriptionStatus: organization.billingExemptForever ? "exempt_forever" : "trial_disabled",
      billingNotes: `Teste gratuito desativado: ${reason}`,
    }, "Teste gratuito desativado. A empresa volta para o fluxo de cobrança definido.");
  }

  async function grantLifetimeExemption() {
    if (!isMaster || !organization) return;
    const reason = await requestTextInput("Conceder isenção permanente", "Motivo da isenção permanente de cobrança:", "Isenção permanente concedida pelo Admin Master Global");
    if (!reason) return;
    await updateOrganization({
      ...organization,
      billingMode: "lifetime_exempt",
      billingExemptForever: true,
      billingExemptReason: reason,
      billingExemptGrantedAt: todayIso(),
      billingExemptGrantedBy: profile?.id,
      manualTrialEnabled: false,
      manualTrialDisabledAt: organization.manualTrialEnabled ? todayIso() : organization.manualTrialDisabledAt,
      manualTrialDisabledBy: organization.manualTrialEnabled ? profile?.id : organization.manualTrialDisabledBy,
      subscriptionStatus: "exempt_forever",
      status: "Ativa",
      accessBlocked: false,
      blockedReason: undefined,
      billingNotes: `Cobrança abolida permanentemente: ${reason}`,
    }, "Cobranças abolidas permanentemente para esta empresa.");
  }

  async function removeLifetimeExemption() {
    if (!isMaster || !organization) return;
    const reason = await requestTextInput("Remover isenção permanente", "Motivo para remover a isenção permanente:", "Isenção removida pelo Admin Master Global");
    if (!reason) return;
    await updateOrganization({
      ...organization,
      billingMode: "stripe",
      billingExemptForever: false,
      billingExemptReason: reason,
      subscriptionStatus: "exemption_removed",
      billingNotes: `Isenção removida: ${reason}`,
    }, "Isenção removida. A empresa volta a poder contratar plano via Stripe.");
  }

  async function checkout(plan: "starter" | "pro" | "enterprise") {
    if (!organization?.id) throw new Error("Cadastre uma empresa antes de criar assinatura.");
    if (organization.billingExemptForever) {
      notify({ tone: "info", title: "Empresa isenta", message: "Esta empresa está liberada permanentemente de cobrança e não precisa assinar plano." });
      return;
    }
    if (organization.manualTrialEnabled) {
      notify({ tone: "info", title: "Teste gratuito ativo", message: "Esta empresa está em teste gratuito manual. O checkout fica bloqueado até o Admin Master desativar o teste." });
      return;
    }
    await startStripeCheckout({ organizationId: organization.id, plan });
  }

  async function portal() {
    if (!organization?.id) throw new Error("Empresa não localizada para abrir portal Stripe.");
    if (organization.billingExemptForever || organization.manualTrialEnabled) {
      notify({ tone: "info", title: "Portal Stripe indisponível", message: "Empresas em teste gratuito manual ou isenção permanente não possuem cobrança ativa no Stripe." });
      return;
    }
    await openStripeCustomerPortal(organization.id);
  }

  return <div className="page-grid billing-page">
    <div className="kpi-row">
      <Kpi icon={CreditCard} label="Cobrança" value="Stripe" note="Checkout seguro" tone="blue"/>
      <Kpi icon={Gift} label="Teste gratuito" value={organization?.manualTrialEnabled ? "Ativo" : "Inativo"} note="controle do Admin Master" tone="gold"/>
      <Kpi icon={ShieldCheck} label="Isenção" value={organization?.billingExemptForever ? "Permanente" : "Não aplicada"} note="sem cobrança futura" tone="green"/>
      <Kpi icon={FileText} label="Plano atual" value={organization?.plan ?? "Demo"} note={organization?.registrationCode ?? "sem matrícula"} tone="purple"/>
    </div>

    <Panel className="billing-hero">
      <PanelTitle
        title="Assinatura e Pagamentos"
        subtitle="Controle assinatura Stripe, teste gratuito manual e isenção permanente por empresa."
        action={<StatusBadge tone={currentBilling.tone}>{currentBilling.label}</StatusBadge>}
      />
      <p>{billingModeNote(organization)}</p>
      <div className="billing-flow"><span>Empresa</span><ExternalLink/><span>Regra comercial</span><ExternalLink/><span>Stripe ou isenção</span><ExternalLink/><span>Supabase</span></div>
      {isMaster ? <div className="billing-admin-select"><label>Empresa gerenciada pelo Admin Master</label><select value={organization?.id ?? ""} onChange={(event) => setSelectedOrgId(event.target.value)}>{visibleOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name} · Matrícula {item.registrationCode}</option>)}</select></div> : null}
    </Panel>

    {isMaster ? <Panel className="billing-master-panel">
      <PanelTitle title="Funções exclusivas do Admin Master Global" subtitle="Essas ações não aparecem para admins de empresa, funcionários ou clientes." />
      <div className="billing-master-actions">
        <div className="billing-master-card">
          <div><Gift size={20}/><strong>Assinatura Teste</strong></div>
          <p>Libera o uso do sistema por tempo indeterminado até o Admin Master desativar manualmente.</p>
          <div className="button-row">
            <Button variant="gold" onClick={enableManualTrial} disabled={!organization || organization.manualTrialEnabled || organization.billingExemptForever}><ToggleRight size={16}/> Ativar teste grátis</Button>
            <Button variant="ghost" onClick={disableManualTrial} disabled={!organization?.manualTrialEnabled}><ToggleLeft size={16}/> Desativar teste grátis</Button>
          </div>
        </div>
        <div className="billing-master-card">
          <div><Crown size={20}/><strong>Abolir cobranças para sempre</strong></div>
          <p>Marca a empresa como isenta permanentemente. O checkout e o portal Stripe ficam bloqueados para ela.</p>
          <div className="button-row">
            <Button variant="primary" onClick={grantLifetimeExemption} disabled={!organization || organization.billingExemptForever}>Conceder isenção permanente</Button>
            <Button variant="danger" onClick={removeLifetimeExemption} disabled={!organization?.billingExemptForever}>Remover isenção</Button>
          </div>
        </div>
      </div>
    </Panel> : null}

    <div className="plan-grid">{plans.map((plan) => {
      const blockedByCommercialRule = Boolean(organization?.billingExemptForever || organization?.manualTrialEnabled);
      return <Panel key={plan.key} className={`plan-card ${plan.key === "pro" ? "featured" : ""} ${blockedByCommercialRule ? "plan-card-disabled" : ""}`}>
        <div className="plan-head"><div><strong>{plan.name}</strong><span>{plan.subtitle}</span></div>{plan.key === "pro" ? <StatusBadge tone="gold">Recomendado</StatusBadge> : <StatusBadge tone="blue">Plano</StatusBadge>}</div>
        <h2>{plan.price}</h2>
        <ul>{plan.features.map((item) => <li key={item}><BadgeCheck size={16}/>{item}</li>)}</ul>
        <Button variant={plan.key === "enterprise" ? "gold" : "primary"} onClick={() => checkout(plan.key)} disabled={blockedByCommercialRule}>{blockedByCommercialRule ? "Cobrança dispensada" : plan.key === "enterprise" ? "Solicitar implantação" : "Assinar com Stripe"}</Button>
      </Panel>;
    })}</div>

    <Panel>
      <PanelTitle title="Portal de cobrança" subtitle="Atualização de cartão, faturas e cancelamento via Stripe quando houver assinatura ativa." action={<Button onClick={portal} disabled={Boolean(organization?.billingExemptForever || organization?.manualTrialEnabled)}><Crown size={16}/> Abrir portal Stripe</Button>} />
      <div className="premium-note"><Sparkles/> Teste gratuito e isenção permanente são regras comerciais internas controladas somente pelo Admin Master Global.</div>
      <div className="premium-note"><LockKeyhole/> As chaves Stripe continuam apenas na Vercel. Cartões e dados de pagamento não passam pelo front-end.</div>
    </Panel>
  </div>;
}
