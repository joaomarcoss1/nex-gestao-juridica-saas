import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bell, BriefcaseBusiness, CheckCheck, ChevronDown, Download, LogOut, Menu, MoreHorizontal, Plus, Search, Settings, X } from "lucide-react";
import type { AppState, AuthProfile, Notification, PageKey, PermissionKey } from "@/types/app";
import { pages } from "@/data/defaultState";
import { Button, StatusBadge } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { can, isMasterAdmin } from "@/lib/permissions";
import { useDebounce } from "@/hooks/useDebounce";

const pagePermissions: Partial<Record<PageKey, PermissionKey>> = {
  dashboard: "dashboard.view", crm: "leads.view", clientes: "clients.view", processos: "processes.view", tarefas: "tasks.view",
  prazos: "deadlines.view", agenda: "deadlines.view", financeiro: "financial.view", precificacao: "pricing.view", documentos: "documents.view",
  ponto: "time.view", folha: "payroll.view", portal: "portal.view", chat: "chat.view", automacoes: "automations.view", relatorios: "reports.view",
  equipe: "users.view", empresas: "companies.view", modulos: "processes.view", auditoria: "audit.view", integracoes: "integrations.view",
  configuracoes: "settings.view", status: "settings.view", onboarding: "settings.view", assinatura: "financial.view",
};

const masterOnlyPages: PageKey[] = ["empresas", "status", "onboarding", "assinatura", "auditoria", "integracoes", "configuracoes"];
const hiddenOperationalPages: PageKey[] = ["status", "onboarding", "integracoes"];

type SearchResult = { id: string; title: string; subtitle: string; page: PageKey; path?: string };

function csvCell(value: unknown) {
  const text = typeof value === "object" ? JSON.stringify(value ?? "") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false;
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const body = [keys.map(csvCell).join(","), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\n");
  const blob = new Blob(["\ufeff", body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function recordsForPage(page: PageKey, state: AppState): Array<Record<string, unknown>> {
  const map: Partial<Record<PageKey, unknown[]>> = {
    crm: state.leads, clientes: state.clients, processos: state.processes, tarefas: state.tasks, prazos: state.deadlines,
    agenda: state.scheduledEvents.length ? state.scheduledEvents : state.hearings, documentos: state.documents, financeiro: state.finances,
    precificacao: state.pricings, chat: state.messages, ponto: state.timeRecords, folha: state.payrolls, automacoes: state.automations,
    auditoria: state.auditLogs, integracoes: state.integrations, equipe: state.employees, empresas: state.organizations,
  };
  return (map[page] ?? []).map((item) => item as Record<string, unknown>);
}

export function AppShell({ page, setPage, profile, state, onReadNotification, children }: {
  page: PageKey;
  setPage: (page: PageKey) => void;
  syncStatus: "demo" | "online" | "offline";
  profile: AuthProfile | null;
  state: AppState;
  onReadNotification: (notification: Notification) => Promise<void>;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 180).trim().toLowerCase();
  const { signOut } = useAuth();
  const isGlobalMaster = isMasterAdmin(profile);
  const visiblePages = useMemo(() => pages.filter((item) => {
    if (hiddenOperationalPages.includes(item.key) && !isGlobalMaster) return false;
    if (masterOnlyPages.includes(item.key) && !isGlobalMaster) return false;
    return can(profile, pagePermissions[item.key] ?? "dashboard.view");
  }), [profile, isGlobalMaster]);
  const canCreateTask = can(profile, "tasks.create");
  const canOpenSettings = isGlobalMaster && can(profile, "settings.view");
  const current = useMemo(() => pages.find((item) => item.key === page) ?? pages[0], [page]);
  const mobilePrimaryKeys = useMemo<PageKey[]>(() => ["dashboard", "crm", "processos", "tarefas", profile?.role === "cliente" ? "portal" : "agenda"], [profile?.role]);
  const mobilePrimaryPages = useMemo(() => mobilePrimaryKeys.map((key) => visiblePages.find((item) => item.key === key)).filter(Boolean) as typeof visiblePages, [mobilePrimaryKeys, visiblePages]);
  const mobileExtraPages = useMemo(() => visiblePages.filter((item) => !mobilePrimaryKeys.includes(item.key)), [mobilePrimaryKeys, visiblePages]);
  const Icon = current.icon;

  const groupedPages = useMemo(() => {
    const groups: Array<{ label: string; keys: PageKey[] }> = [
      { label: "Atendimento e processos", keys: ["dashboard", "crm", "clientes", "processos", "agenda"] },
      { label: "Equipe e produção", keys: ["tarefas", "prazos", "documentos", "chat", "ponto"] },
      { label: "Gestão financeira", keys: ["financeiro", "precificacao", "folha", "relatorios"] },
      { label: "Administração", keys: isGlobalMaster ? ["empresas", "assinatura", "auditoria", "configuracoes"] : ["equipe", "configuracoes"] },
    ];
    return groups.map((group) => ({ ...group, items: group.keys.map((key) => visiblePages.find((item) => item.key === key)).filter(Boolean) as typeof visiblePages })).filter((group) => group.items.length > 0);
  }, [visiblePages, isGlobalMaster]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const match = (...values: unknown[]) => values.some((value) => String(value ?? "").toLowerCase().includes(debouncedQuery));
    return [
      ...state.clients.filter((item) => match(item.name, item.document, item.email, item.phone)).slice(0, 5).map((item) => ({ id: `client-${item.id}`, title: item.name, subtitle: `Cliente · ${item.document || item.phone || "cadastro"}`, page: "clientes" as const, path: `/clientes/${item.id}` })),
      ...state.processes.filter((item) => match(item.client, item.cnj, item.area, item.opposite)).slice(0, 5).map((item) => ({ id: `process-${item.id}`, title: item.client, subtitle: `Processo · ${item.cnj || item.area}`, page: "processos" as const, path: `/processos/${item.id}` })),
      ...state.leads.filter((item) => match(item.name, item.phone, item.email, item.area)).slice(0, 4).map((item) => ({ id: `lead-${item.id}`, title: item.name, subtitle: `Lead · ${item.stage}`, page: "crm" as const })),
      ...state.tasks.filter((item) => match(item.title, item.client, item.responsible)).slice(0, 4).map((item) => ({ id: `task-${item.id}`, title: item.title, subtitle: `Tarefa · ${item.status}`, page: "tarefas" as const })),
      ...state.documents.filter((item) => match(item.name, item.type, item.client)).slice(0, 4).map((item) => ({ id: `doc-${item.id}`, title: item.name, subtitle: `Documento · ${item.status}`, page: "documentos" as const })),
    ].slice(0, 12);
  }, [debouncedQuery, state.clients, state.documents, state.leads, state.processes, state.tasks]);

  const notifications = useMemo(() => state.notifications.filter((item) => {
    if (profile?.role === "cliente") return !item.clientId || item.clientId === profile.clientId;
    return !item.userId || item.userId === profile?.id;
  }).sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))).slice(0, 30), [profile, state.notifications]);
  const unread = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    const open = mobileMenuOpen || searchOpen || notificationsOpen;
    document.body.classList.toggle("nex-overlay-open", open);
    const close = (event: KeyboardEvent) => event.key === "Escape" && (setMobileMenuOpen(false), setSearchOpen(false), setNotificationsOpen(false));
    addEventListener("keydown", close);
    return () => { document.body.classList.remove("nex-overlay-open"); removeEventListener("keydown", close); };
  }, [mobileMenuOpen, notificationsOpen, searchOpen]);

  useEffect(() => { if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 40); }, [searchOpen]);

  const profileRole = String(profile?.role ?? "perfil").replaceAll("_", " ");
  const profileSubtitle = isGlobalMaster ? "Acesso interno" : profile?.organizationRegistrationCode && profile.organizationRegistrationCode !== "GLOBAL" ? `${profileRole} · ${profile.organizationRegistrationCode}` : profileRole;

  function go(next: PageKey) {
    setMobileMenuOpen(false); setSearchOpen(false); setNotificationsOpen(false); setPage(next);
  }
  function goResult(result: SearchResult) {
    setSearchOpen(false); setQuery("");
    if (result.path) { history.pushState({}, "", result.path); window.dispatchEvent(new Event("popstate")); return; }
    go(result.page);
  }
  function exportPage() {
    const rows = recordsForPage(page, state);
    if (!downloadCsv(`nex-${page}-${new Date().toISOString().slice(0, 10)}.csv`, rows)) window.print();
  }
  async function readNotification(item: Notification) {
    if (!item.readAt) await onReadNotification({ ...item, readAt: new Date().toISOString() });
    const modulePage = pages.find((entry) => entry.key === item.module)?.key;
    if (modulePage) go(modulePage);
  }

  return <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
    <aside className="sidebar">
      <button className="collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Recolher menu"><Menu size={18} /></button>
      <div className="brand"><div className="brand-mark">NX</div><div><strong>Nex Gestão Jurídica</strong><span>NexLabs</span></div></div>
      <nav>{groupedPages.map((group) => <div className="nav-group" key={group.label}>{!collapsed && <span className="nav-group-label">{group.label}</span>}{group.items.map((item) => { const ItemIcon = item.icon; return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)} title={item.label}><ItemIcon size={18} /><span>{item.label}</span></button>; })}</div>)}</nav>
      <div className="mobile-bottom-nav" aria-label="Navegação principal mobile">{mobilePrimaryPages.map((item) => { const ItemIcon = item.icon; return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)} title={item.label}><ItemIcon size={19}/><span>{item.label}</span></button>; })}<button className={mobileMenuOpen ? "active" : ""} onClick={() => setMobileMenuOpen((value) => !value)}><Menu size={19}/><span>Menu</span></button></div>
      {mobileMenuOpen && <><button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)}/><div className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Menu completo"><div className="mobile-menu-head"><strong>Nex Gestão Jurídica</strong><button onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu"><X size={18}/></button></div><div className="mobile-menu-grid">{mobileExtraPages.map((item) => { const ItemIcon = item.icon; return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)}><ItemIcon size={18}/><span>{item.label}</span></button>; })}</div><div className="mobile-menu-actions"><Button variant="ghost" onClick={() => void signOut()}><LogOut size={16}/> Sair</Button></div></div></>}
      <div className="sidebar-bottom">{canOpenSettings && <button className="internal-admin-entry" onClick={() => go("configuracoes")}><Settings size={16} /><span>Área interna</span></button>}<div className="security-seal"><BriefcaseBusiness size={14} /><span>Gestão jurídica</span></div><div className="dev-by">NexLabs</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-page-chip" onClick={() => setMobileMenuOpen(true)}><Menu size={18}/><span>{current.label}</span></button>
        <div className={`search ${searchOpen ? "open" : ""}`}><Search size={17}/><input ref={searchRef} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} placeholder="Pesquisar cliente, processo, tarefa ou documento" aria-label="Busca global" />{searchOpen && <div className="global-search-results">{debouncedQuery.length < 2 ? <small>Digite ao menos 2 caracteres.</small> : searchResults.length ? searchResults.map((result) => <button key={result.id} onClick={() => goResult(result)}><strong>{result.title}</strong><span>{result.subtitle}</span></button>) : <small>Nenhum resultado permitido para este perfil.</small>}</div>}</div>
        <div className="top-actions">
          <button className="icon-btn mobile-search-trigger" aria-label="Abrir busca global" onClick={() => setSearchOpen(true)}><Search size={17}/></button>
          <button className="icon-btn top-notification" aria-label={`Notificações: ${unread} não lidas`} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17}/>{unread > 0 && <span className="notification-count">{Math.min(unread, 99)}</span>}</button>
          {notificationsOpen && <div className="notification-panel" role="dialog" aria-label="Central de notificações"><div className="notification-head"><div><strong>Notificações</strong><small>{unread} não lidas</small></div><button onClick={() => setNotificationsOpen(false)}><X size={17}/></button></div><div className="notification-list">{notifications.length ? notifications.map((item) => <button key={item.id} className={!item.readAt ? "unread" : ""} onClick={() => void readNotification(item)}><div><strong>{item.title}</strong><span>{item.body}</span></div><StatusBadge tone={item.priority === "Urgente" ? "red" : item.priority === "Alta" ? "gold" : "blue"}>{item.priority}</StatusBadge></button>) : <div className="empty-notifications"><CheckCheck size={22}/><span>Nenhuma notificação pendente.</span></div>}</div></div>}
          <div className="profile-cluster"><div className="user-avatar">{(profile?.name ?? "NX").slice(0, 2).toUpperCase()}</div><div className="profile-mini"><strong>{profile?.name ?? "Usuário"}</strong><span>{profileSubtitle}</span></div><ChevronDown size={16} className="desktop-only topbar-chevron" /></div>
          {canCreateTask && <Button onClick={() => go("tarefas")} className="desktop-only topbar-primary"><Plus size={16}/> Nova tarefa</Button>}
          <Button variant="ghost" onClick={signOut} className="topbar-signout desktop-only"><LogOut size={16}/> Sair</Button>
          <button className="icon-btn mobile-more" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Mais ações"><MoreHorizontal size={18}/></button>
        </div>
      </header>
      <section className="page-head"><div><Icon size={25}/><div><h1>{current.label}</h1><p>{current.description}</p></div></div><div className="head-actions"><Button variant="ghost" onClick={exportPage}><Download size={15}/> Exportar CSV</Button></div></section>
      <div className="content page-transition" key={`${page}-${location.pathname}`}>{children}</div>
    </main>
  </div>;
}

export function ToastStack({ toasts }: { toasts: Array<{ id: string; tone: string; title: string; message?: string }> }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}><strong>{toast.title}</strong>{toast.message && <span>{toast.message}</span>}</div>)}</div>;
}
