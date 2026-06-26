import { useEffect, useMemo, useState } from "react";
import type { PageKey } from "@/types/app";
import { AppShell, ToastStack } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ClientesPage } from "@/features/clientes/pages/ClientesPage";
import { ProcessosPage } from "@/features/processos/pages/ProcessosPage";
import { TarefasPage } from "@/features/tarefas/pages/TarefasPage";
import { FinanceiroPage } from "@/features/financeiro/pages/FinanceiroPage";
import { PrecificacaoPage } from "@/features/precificacao/pages/PrecificacaoPage";
import { DocumentosPage } from "@/features/documentos/pages/DocumentosPage";
import { PontoPage } from "@/features/ponto/pages/PontoPage";
import { PortalClientePage } from "@/features/portal-cliente/pages/PortalClientePage";
import { AutomacoesPage } from "@/features/automacoes/pages/AutomacoesPage";
import { RelatoriosPage } from "@/features/relatorios/pages/RelatoriosPage";
import { ConfiguracoesPage } from "@/features/configuracoes/pages/ConfiguracoesPage";
import { useNexState } from "@/hooks/useNexState";

function routeToPage(pathname: string): PageKey {
  const key = pathname.replace(/^\//, "") as PageKey;
  const valid: PageKey[] = ["dashboard", "clientes", "processos", "tarefas", "financeiro", "precificacao", "documentos", "ponto", "portal", "automacoes", "relatorios", "configuracoes"];
  if (!key) return "dashboard";
  return valid.includes(key) ? key : "dashboard";
}

export default function App() {
  const [page, setPage] = useState<PageKey>(() => routeToPage(location.pathname));
  const { state, loading, syncStatus, commit, remove, notify, toasts } = useNexState();

  useEffect(() => {
    const handler = () => setPage(routeToPage(location.pathname));
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);

  const props = useMemo(() => ({ state, commit, remove, notify, setPage }), [state, commit, remove, notify]);

  if (loading) {
    return <div className="loading-screen"><div className="brand-mark big">NX</div><strong>Carregando Nex Gestão Jurídica...</strong><span>Sincronizando módulos, Supabase e segurança.</span></div>;
  }

  return <>
    <AppShell page={page} setPage={setPage} syncStatus={syncStatus}>
      {page === "dashboard" && <DashboardPage {...props} />}
      {page === "clientes" && <ClientesPage {...props} />}
      {page === "processos" && <ProcessosPage {...props} />}
      {page === "tarefas" && <TarefasPage {...props} />}
      {page === "financeiro" && <FinanceiroPage {...props} />}
      {page === "precificacao" && <PrecificacaoPage {...props} />}
      {page === "documentos" && <DocumentosPage {...props} />}
      {page === "ponto" && <PontoPage {...props} />}
      {page === "portal" && <PortalClientePage {...props} />}
      {page === "automacoes" && <AutomacoesPage {...props} />}
      {page === "relatorios" && <RelatoriosPage {...props} />}
      {page === "configuracoes" && <ConfiguracoesPage {...props} />}
    </AppShell>
    <ToastStack toasts={toasts} />
  </>;
}
