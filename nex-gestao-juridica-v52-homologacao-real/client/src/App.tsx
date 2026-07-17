import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
import type { FeaturePageProps, Notification, PageKey } from "@/types/app";
import { AppShell, ToastStack } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useNexState } from "@/hooks/useNexState";
import { useAuth } from "@/hooks/useAuth";
import { canAccessRoute } from "@/services/accessControl.service";
import { Panel, PanelTitle, Button } from "@/components/ui/Primitives";
import { DialogHost } from "@/components/common/DialogHost";

function lazyNamed<T extends ComponentType<any>>(loader: () => Promise<Record<string, T>>, exportName: string) {
  return lazy(async () => ({ default: (await loader())[exportName] }));
}

const DashboardPage = lazyNamed(() => import("@/features/dashboard/pages/DashboardPage"), "DashboardPage");
const CRMPage = lazyNamed(() => import("@/features/crm/pages/CRMPage"), "CRMPage");
const ClientesPage = lazyNamed(() => import("@/features/clientes/pages/ClientesPage"), "ClientesPage");
const ClienteDetalhePage = lazyNamed(() => import("@/features/clientes/pages/ClienteDetalhePage"), "ClienteDetalhePage");
const ProcessosPage = lazyNamed(() => import("@/features/processos/pages/ProcessosPage"), "ProcessosPage");
const ProcessoDetalhePage = lazyNamed(() => import("@/features/processos/pages/ProcessoDetalhePage"), "ProcessoDetalhePage");
const PrazosPage = lazyNamed(() => import("@/features/prazos/pages/PrazosPage"), "PrazosPage");
const AgendaPage = lazyNamed(() => import("@/features/agenda/pages/AgendaPage"), "AgendaPage");
const TarefasPage = lazyNamed(() => import("@/features/tarefas/pages/TarefasPage"), "TarefasPage");
const FinanceiroPage = lazyNamed(() => import("@/features/financeiro/pages/FinanceiroPage"), "FinanceiroPage");
const FinanceiroDetalhePage = lazyNamed(() => import("@/features/financeiro/pages/FinanceiroDetalhePage"), "FinanceiroDetalhePage");
const PrecificacaoPage = lazyNamed(() => import("@/features/precificacao/pages/PrecificacaoPage"), "PrecificacaoPage");
const DocumentosPage = lazyNamed(() => import("@/features/documentos/pages/DocumentosPage"), "DocumentosPage");
const PontoPage = lazyNamed(() => import("@/features/ponto/pages/PontoPage"), "PontoPage");
const FolhaPage = lazyNamed(() => import("@/features/folha/pages/FolhaPage"), "FolhaPage");
const PortalClientePage = lazyNamed(() => import("@/features/portal-cliente/pages/PortalClientePage"), "PortalClientePage");
const ChatJuridicoPage = lazyNamed(() => import("@/features/chat/pages/ChatJuridicoPage"), "ChatJuridicoPage");
const AutomacoesPage = lazyNamed(() => import("@/features/automacoes/pages/AutomacoesPage"), "AutomacoesPage");
const RelatoriosPage = lazyNamed(() => import("@/features/relatorios/pages/RelatoriosPage"), "RelatoriosPage");
const AuditoriaPage = lazyNamed(() => import("@/features/auditoria/pages/AuditoriaPage"), "AuditoriaPage");
const IntegracoesPage = lazyNamed(() => import("@/features/integracoes/pages/IntegracoesPage"), "IntegracoesPage");
const ConfiguracoesPage = lazyNamed(() => import("@/features/configuracoes/pages/ConfiguracoesPage"), "ConfiguracoesPage");
const StatusSistemaPage = lazyNamed(() => import("@/features/status/pages/StatusSistemaPage"), "StatusSistemaPage");
const OnboardingPage = lazyNamed(() => import("@/features/onboarding/pages/OnboardingPage"), "OnboardingPage");
const AssinaturaPage = lazyNamed(() => import("@/features/assinatura/pages/AssinaturaPage"), "AssinaturaPage");
const EquipePage = lazyNamed(() => import("@/features/equipe/pages/EquipePage"), "EquipePage");
const EmpresasPage = lazyNamed(() => import("@/features/empresas/pages/EmpresasPage"), "EmpresasPage");
const ModulosJuridicosPage = lazyNamed(() => import("@/features/modulos/pages/ModulosJuridicosPage"), "ModulosJuridicosPage");

type RouteState = { page: PageKey; detail?: "cliente" | "processo" | "financeiro"; id?: string };

function parseRoute(pathname: string): RouteState {
  const parts = pathname.replace(/^\//, "").split("/").filter(Boolean);
  const valid: PageKey[] = ["dashboard", "crm", "clientes", "processos", "tarefas", "prazos", "agenda", "documentos", "financeiro", "precificacao", "portal", "chat", "ponto", "relatorios", "equipe", "empresas", "modulos", "folha", "automacoes", "auditoria", "integracoes", "status", "onboarding", "assinatura", "configuracoes"];
  if (!parts.length) return { page: "dashboard" };
  if (parts[0] === "clientes" && parts[1]) return { page: "clientes", detail: "cliente", id: parts[1] };
  if (parts[0] === "processos" && parts[1]) return { page: "processos", detail: "processo", id: parts[1] };
  if (parts[0] === "financeiro" && parts[1]) return { page: "financeiro", detail: "financeiro", id: parts[1] };
  const page = parts[0] as PageKey;
  return valid.includes(page) ? { page } : { page: "dashboard" };
}

function PageLoading() {
  return <div className="module-loading" role="status"><div className="brand-mark">NX</div><div><strong>Carregando módulo</strong><span>Buscando apenas os recursos necessários desta tela.</span></div></div>;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(location.pathname));
  const { profile } = useAuth();
  const { state, loading, syncStatus, commit, remove, archive, restore, executeAtomic, notify, toasts } = useNexState(profile, profile?.organizationId ?? "demo", route.page);

  useEffect(() => {
    const handler = () => setRoute(parseRoute(location.pathname));
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  const setPage = (page: PageKey) => {
    history.pushState({}, "", page === "dashboard" ? "/" : `/${page}`);
    setRoute({ page });
  };

  const props = useMemo<FeaturePageProps>(() => ({ state, commit, remove, archive, restore, executeAtomic, notify, setPage }), [state, commit, remove, archive, restore, executeAtomic, notify]);
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;
      notify({ tone: "error", title: "Ação não concluída", message: custom.detail || "O botão encontrou uma falha operacional." });
    };
    addEventListener("nex:button-error", handler);
    return () => removeEventListener("nex:button-error", handler);
  }, [notify]);

  async function markNotificationRead(notification: Notification) {
    await commit("notifications", notification, "update");
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark big">NX</div><strong>Carregando Nex Gestão Jurídica...</strong><span>Preparando permissões e dados do escritório.</span></div>;

  const denied = !canAccessRoute(profile, route.page);

  return <ProtectedRoute>
    <AppShell page={route.page} setPage={setPage} syncStatus={syncStatus} profile={profile} state={state} onReadNotification={markNotificationRead}>
      {denied ? <Panel><PanelTitle title="Acesso bloqueado" subtitle="Seu perfil não possui permissão para este módulo."/><Button onClick={() => setPage(profile?.role === "cliente" ? "portal" : "dashboard")}>Voltar para área permitida</Button></Panel> : null}
      {!denied && <Suspense fallback={<PageLoading/>}>
        {route.detail === "cliente" && route.id ? <ClienteDetalhePage {...props} clientId={route.id}/> : null}
        {route.detail === "processo" && route.id ? <ProcessoDetalhePage {...props} processId={route.id}/> : null}
        {route.detail === "financeiro" && route.id ? <FinanceiroDetalhePage {...props} financeId={route.id}/> : null}
        {!route.detail && route.page === "dashboard" && <DashboardPage {...props}/>} {!route.detail && route.page === "crm" && <CRMPage {...props}/>} {!route.detail && route.page === "clientes" && <ClientesPage {...props}/>} {!route.detail && route.page === "processos" && <ProcessosPage {...props}/>} {!route.detail && route.page === "tarefas" && <TarefasPage {...props}/>} {!route.detail && route.page === "prazos" && <PrazosPage {...props}/>} {!route.detail && route.page === "agenda" && <AgendaPage {...props}/>} {!route.detail && route.page === "financeiro" && <FinanceiroPage {...props}/>} {!route.detail && route.page === "precificacao" && <PrecificacaoPage {...props}/>} {!route.detail && route.page === "documentos" && <DocumentosPage {...props}/>} {!route.detail && route.page === "ponto" && <PontoPage {...props}/>} {!route.detail && route.page === "folha" && <FolhaPage {...props}/>} {!route.detail && route.page === "portal" && <PortalClientePage {...props}/>} {!route.detail && route.page === "chat" && <ChatJuridicoPage {...props}/>} {!route.detail && route.page === "automacoes" && <AutomacoesPage {...props}/>} {!route.detail && route.page === "relatorios" && <RelatoriosPage {...props}/>} {!route.detail && route.page === "equipe" && <EquipePage {...props}/>} {!route.detail && route.page === "empresas" && <EmpresasPage {...props}/>} {!route.detail && route.page === "modulos" && <ModulosJuridicosPage {...props}/>} {!route.detail && route.page === "auditoria" && <AuditoriaPage {...props}/>} {!route.detail && route.page === "integracoes" && <IntegracoesPage {...props}/>} {!route.detail && route.page === "status" && <StatusSistemaPage {...props}/>} {!route.detail && route.page === "onboarding" && <OnboardingPage {...props}/>} {!route.detail && route.page === "assinatura" && <AssinaturaPage {...props}/>} {!route.detail && route.page === "configuracoes" && <ConfiguracoesPage {...props}/>} 
      </Suspense>}
    </AppShell>
    <ToastStack toasts={toasts}/>
    <DialogHost/>
  </ProtectedRoute>;
}
