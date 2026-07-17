import { useEffect, useMemo, useState } from "react";
import type { PageKey } from "@/types/app";
import { AppShell, ToastStack } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { CRMPage } from "@/features/crm/pages/CRMPage";
import { ClientesPage } from "@/features/clientes/pages/ClientesPage";
import { ClienteDetalhePage } from "@/features/clientes/pages/ClienteDetalhePage";
import { ProcessosPage } from "@/features/processos/pages/ProcessosPage";
import { ProcessoDetalhePage } from "@/features/processos/pages/ProcessoDetalhePage";
import { PrazosPage } from "@/features/prazos/pages/PrazosPage";
import { AgendaPage } from "@/features/agenda/pages/AgendaPage";
import { TarefasPage } from "@/features/tarefas/pages/TarefasPage";
import { FinanceiroPage } from "@/features/financeiro/pages/FinanceiroPage";
import { FinanceiroDetalhePage } from "@/features/financeiro/pages/FinanceiroDetalhePage";
import { PrecificacaoPage } from "@/features/precificacao/pages/PrecificacaoPage";
import { DocumentosPage } from "@/features/documentos/pages/DocumentosPage";
import { PontoPage } from "@/features/ponto/pages/PontoPage";
import { FolhaPage } from "@/features/folha/pages/FolhaPage";
import { PortalClientePage } from "@/features/portal-cliente/pages/PortalClientePage";
import { ChatJuridicoPage } from "@/features/chat/pages/ChatJuridicoPage";
import { AutomacoesPage } from "@/features/automacoes/pages/AutomacoesPage";
import { RelatoriosPage } from "@/features/relatorios/pages/RelatoriosPage";
import { AuditoriaPage } from "@/features/auditoria/pages/AuditoriaPage";
import { IntegracoesPage } from "@/features/integracoes/pages/IntegracoesPage";
import { ConfiguracoesPage } from "@/features/configuracoes/pages/ConfiguracoesPage";
import { StatusSistemaPage } from "@/features/status/pages/StatusSistemaPage";
import { OnboardingPage } from "@/features/onboarding/pages/OnboardingPage";
import { AssinaturaPage } from "@/features/assinatura/pages/AssinaturaPage";
import { EquipePage } from "@/features/equipe/pages/EquipePage";
import { EmpresasPage } from "@/features/empresas/pages/EmpresasPage";
import { ModulosJuridicosPage } from "@/features/modulos/pages/ModulosJuridicosPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useNexState } from "@/hooks/useNexState";
import { useAuth } from "@/hooks/useAuth";
import { canAccessRoute } from "@/services/accessControl.service";
import { Panel, PanelTitle, Button } from "@/components/ui/Primitives";

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

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(location.pathname));
  const { profile } = useAuth();
  const { state, loading, syncStatus, commit, remove, archive, restore, notify, toasts } = useNexState(profile, profile?.organizationId ?? "demo");

  useEffect(() => {
    const handler = () => setRoute(parseRoute(location.pathname));
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  const setPage = (page: PageKey) => {
    history.pushState({}, "", page === "dashboard" ? "/" : `/${page}`);
    setRoute({ page });
  };

  const props = useMemo(() => ({ state, commit, remove, archive, restore, notify, setPage }), [state, commit, remove, archive, restore, notify]);
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;
      notify({ tone: "error", title: "Ação não concluída", message: custom.detail || "O botão encontrou uma falha operacional." });
    };
    addEventListener("nex:button-error", handler);
    return () => removeEventListener("nex:button-error", handler);
  }, [notify]);


  if (loading) {
    return <div className="loading-screen"><div className="brand-mark big">NX</div><strong>Carregando Nex Gestão Jurídica...</strong><span>Sincronizando módulos, Supabase e segurança.</span></div>;
  }

  const denied = !canAccessRoute(profile, route.page);

  return <ProtectedRoute>
    <AppShell page={route.page} setPage={setPage} syncStatus={syncStatus} profile={profile}>
      {denied ? <Panel><PanelTitle title="Acesso bloqueado" subtitle="Seu perfil não possui permissão para este módulo."/><Button onClick={() => setPage(profile?.role === "cliente" ? "portal" : "dashboard")}>Voltar para área permitida</Button></Panel> : null}
      {!denied && route.detail === "cliente" && route.id ? <ClienteDetalhePage {...props} clientId={route.id} /> : null}
      {!denied && route.detail === "processo" && route.id ? <ProcessoDetalhePage {...props} processId={route.id} /> : null}
      {!denied && route.detail === "financeiro" && route.id ? <FinanceiroDetalhePage {...props} financeId={route.id} /> : null}
      {!denied && !route.detail && route.page === "dashboard" && <DashboardPage {...props} />}
      {!denied && !route.detail && route.page === "crm" && <CRMPage {...props} />}
      {!denied && !route.detail && route.page === "clientes" && <ClientesPage {...props} />}
      {!denied && !route.detail && route.page === "processos" && <ProcessosPage {...props} />}
      {!denied && !route.detail && route.page === "tarefas" && <TarefasPage {...props} />}
      {!denied && !route.detail && route.page === "prazos" && <PrazosPage {...props} />}
      {!denied && !route.detail && route.page === "agenda" && <AgendaPage {...props} />}
      {!denied && !route.detail && route.page === "financeiro" && <FinanceiroPage {...props} />}
      {!denied && !route.detail && route.page === "precificacao" && <PrecificacaoPage {...props} />}
      {!denied && !route.detail && route.page === "documentos" && <DocumentosPage {...props} />}
      {!denied && !route.detail && route.page === "ponto" && <PontoPage {...props} />}
      {!denied && !route.detail && route.page === "folha" && <FolhaPage {...props} />}
      {!denied && !route.detail && route.page === "portal" && <PortalClientePage {...props} />}
      {!denied && !route.detail && route.page === "chat" && <ChatJuridicoPage {...props} />}
      {!denied && !route.detail && route.page === "automacoes" && <AutomacoesPage {...props} />}
      {!denied && !route.detail && route.page === "relatorios" && <RelatoriosPage {...props} />}
      {!denied && !route.detail && route.page === "equipe" && <EquipePage {...props} />}
      {!denied && !route.detail && route.page === "empresas" && <EmpresasPage {...props} />}
      {!denied && !route.detail && route.page === "modulos" && <ModulosJuridicosPage {...props} />}
      {!denied && !route.detail && route.page === "auditoria" && <AuditoriaPage {...props} />}
      {!denied && !route.detail && route.page === "integracoes" && <IntegracoesPage {...props} />}
      {!denied && !route.detail && route.page === "status" && <StatusSistemaPage {...props} />}
      {!denied && !route.detail && route.page === "onboarding" && <OnboardingPage {...props} />}
      {!denied && !route.detail && route.page === "assinatura" && <AssinaturaPage {...props} />}
      {!denied && !route.detail && route.page === "configuracoes" && <ConfiguracoesPage {...props} />}
    </AppShell>
    <ToastStack toasts={toasts} />
  </ProtectedRoute>;
}
