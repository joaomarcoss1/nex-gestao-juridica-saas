import { useMemo, useState, type ReactNode } from "react";
import { Bell, ChevronDown, Cloud, Menu, Plus, Search, ShieldCheck } from "lucide-react";
import type { PageKey } from "@/types/app";
import { pages } from "@/data/defaultState";
import { Button } from "@/components/ui/Primitives";

export function AppShell({ page, setPage, syncStatus, children }: { page: PageKey; setPage: (page: PageKey) => void; syncStatus: "demo" | "online" | "offline"; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const current = useMemo(() => pages.find((item) => item.key === page) ?? pages[0], [page]);
  const Icon = current.icon;

  function go(next: PageKey) {
    setPage(next);
    history.pushState({}, "", next === "dashboard" ? "/" : `/${next}`);
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
        {pages.map((item) => {
          const ItemIcon = item.icon;
          return <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => go(item.key)} title={item.label}>
            <ItemIcon size={18} /><span>{item.label}</span>
          </button>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={() => go("configuracoes")}><ShieldCheck size={18} /><span>Produção segura</span></button>
        <div className="dev-by">Desenvolvido por <b>NexLabs</b></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="search"><Search size={17} /><input placeholder="Buscar cliente, processo, documento ou tarefa..." /></div>
        <div className="top-actions">
          <span className={`sync-pill ${syncStatus}`}><Cloud size={15} /> {syncStatus === "online" ? "Supabase online" : syncStatus === "offline" ? "Local seguro" : "Modo demo"}</span>
          <Bell size={18} />
          <div className="user-avatar">JM</div>
          <ChevronDown size={16} />
          <Button onClick={() => go("tarefas")}><Plus size={16} /> Nova ação</Button>
        </div>
      </header>
      <section className="page-head">
        <div><Icon size={25} /><div><h1>{current.label}</h1><p>{current.description} · Plataforma corporativa NexLabs</p></div></div>
        <div className="head-actions"><Button variant="ghost" onClick={() => window.print()}>Exportar visão</Button><Button variant="gold" onClick={() => go("automacoes")}>Automatizar</Button></div>
      </section>
      <div className="content page-transition" key={page}>{children}</div>
    </main>
  </div>;
}

export function ToastStack({ toasts }: { toasts: Array<{ id: string; tone: string; title: string; message?: string }> }) {
  return <div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}><strong>{toast.title}</strong>{toast.message && <span>{toast.message}</span>}</div>)}</div>;
}
