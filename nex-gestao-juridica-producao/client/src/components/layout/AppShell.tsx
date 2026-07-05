import { useMemo, useState, type ReactNode } from "react";
import { Bell, ChevronDown, Cloud, LogOut, Menu, Plus, Search, ShieldCheck } from "lucide-react";
import type { AuthProfile, PageKey, PermissionKey } from "@/types/app";
import { pages } from "@/data/defaultState";
import { Button } from "@/components/ui/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

const pagePermissions: Partial<Record<PageKey, PermissionKey>> = {
  dashboard: "dashboard.view",
  crm: "leads.view",
  clientes: "clients.view",
  processos: "processes.view",
  tarefas: "tasks.view",
  prazos: "deadlines.view",
  agenda: "deadlines.view",
  financeiro: "financial.view",
  precificacao: "pricing.view",
  documentos: "documents.view",
  ponto: "time.view",
  folha: "payroll.view",
  portal: "portal.view",
  chat: "chat.view",
  automacoes: "automations.view",
  relatorios: "reports.view",
  equipe: "users.view",
  empresas: "companies.view",
  modulos: "processes.view",
  auditoria: "audit.view",
  integracoes: "integrations.view",
  configuracoes: "settings.view",
};

export function AppShell({ page, setPage, syncStatus, profile, children }: { page: PageKey; setPage: (page: PageKey) => void; syncStatus: "demo" | "online" | "offline"; profile: AuthProfile | null; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut, isDemo } = useAuth();
  const visiblePages = useMemo(() => pages.filter((item) => can(profile, pagePermissions[item.key] ?? "dashboard.view")), [profile]);
  const canCreateTask = can(profile, "tasks.create");
  const canOpenSettings = can(profile, "settings.view");
  const canOpenAutomations = can(profile, "automations.view");
  const current = useMemo(() => pages.find((item) => item.key === page) ?? pages[0], [page]);
  const mobilePrimaryKeys = useMemo<PageKey[]>(() => ["dashboard", "processos", "tarefas", profile?.role === "cliente" ? "portal" : "chat", "ponto"], [profile?.role]);
  const mobilePrimaryPages = useMemo(() => mobilePrimaryKeys.map((key) => visiblePages.find((item) => item.key === key)).filter(Boolean) as typeof visiblePages, [mobilePrimaryKeys, visiblePages]);
  const mobileExtraPages = useMemo(() => visiblePages.filter((item) => !mobilePrimaryKeys.includes(item.key)), [mobilePrimaryKeys, visiblePages]);
  const Icon = current.icon;

  function go(next: PageKey) {
    setMobileMenuOpen(false);
    setPage(next);
  }

  return <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
    <aside className="sidebar">
      <button className="collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Recolher menu"><Menu size={18} /></button>
      <div className="brand">
        <div className="brand-mark">NX</div>
        <div>
          <strong>Nex Gestão Jurídica</strong>
          <span>NexLabs</span>
        </div>
      </div>
      <nav>
        {visiblePages.map((item) => {
          const ItemIcon = item.icon;
          return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)} title={item.label}>
            <ItemIcon size={18} /><span>{item.label}</span>
          </button>;
        })}
      </nav>
      <div className="mobile-bottom-nav" aria-label="Navegação principal mobile">
        {mobilePrimaryPages.map((item) => {
          const ItemIcon = item.icon;
          return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)} title={item.label}><ItemIcon size={19}/><span>{item.label}</span></button>;
        })}
        <button className={mobileMenuOpen ? "active" : ""} onClick={() => setMobileMenuOpen((value) => !value)}><Menu size={19}/><span>Menu</span></button>
      </div>
      {mobileMenuOpen && <div className="mobile-menu-drawer" role="dialog" aria-label="Menu completo">
        <div className="mobile-menu-head"><strong>Nex Gestão Jurídica</strong><button onClick={() => setMobileMenuOpen(false)}><Menu size={18}/></button></div>
        <div className="mobile-menu-grid">
          {mobileExtraPages.map((item) => {
            const ItemIcon = item.icon;
            return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)}><ItemIcon size={18}/><span>{item.label}</span></button>;
          })}
          {canOpenSettings && <button onClick={() => go("configuracoes")}><ShieldCheck size={18}/><span>Produção segura</span></button>}
        </div>
      </div>}
      <div className="sidebar-bottom">
        {canOpenSettings && <button onClick={() => go("configuracoes")}><ShieldCheck size={18} /><span>Produção segura</span></button>}
        <div className="dev-by">Desenvolvido por <b>NexLabs</b></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="search"><Search size={17} /><input placeholder="Busca rápida visual — use os filtros de cada módulo" title="A busca global avançada será integrada ao Supabase; os módulos já possuem filtros próprios." /></div>
        <div className="top-actions">
          <span className={`sync-pill ${syncStatus}`}><Cloud size={15} /> {syncStatus === "online" ? "Supabase online" : syncStatus === "offline" ? "Local seguro" : "Modo demo"}</span>
          <Bell size={18} />
          <div className="user-avatar">{(profile?.name ?? "NX").slice(0, 2).toUpperCase()}</div>
          <div className="profile-mini"><strong>{profile?.name ?? "Usuário"}</strong><span>{profile?.organizationRegistrationCode && profile.organizationRegistrationCode !== "GLOBAL" ? `${String(profile?.role ?? "perfil").replaceAll("_", " ")} · Matrícula ${profile.organizationRegistrationCode}` : isDemo ? `demo · ${String(profile?.role ?? "").replaceAll("_", " ")}` : String(profile?.role ?? "perfil").replaceAll("_", " ")}</span></div>
          <ChevronDown size={16} className="desktop-only" />
          {canCreateTask && <Button onClick={() => go("tarefas")} className="desktop-only"><Plus size={16} /> Nova ação</Button>}
          <Button variant="ghost" onClick={signOut}><LogOut size={16}/> Sair</Button>
        </div>
      </header>
      <section className="page-head">
        <div><Icon size={25} /><div><h1>{current.label}</h1><p>{current.description} · Plataforma corporativa NexLabs</p></div></div>
        <div className="head-actions"><Button variant="ghost" onClick={() => window.print()}>Exportar visão</Button>{canOpenAutomations && <Button variant="gold" onClick={() => go("automacoes")}>Automatizar</Button>}</div>
      </section>
      <div className="content page-transition" key={`${page}-${location.pathname}`}>{children}</div>
    </main>
  </div>;
}

export function ToastStack({ toasts }: { toasts: Array<{ id: string; tone: string; title: string; message?: string }> }) {
  return <div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}><strong>{toast.title}</strong>{toast.message && <span>{toast.message}</span>}</div>)}</div>;
}
