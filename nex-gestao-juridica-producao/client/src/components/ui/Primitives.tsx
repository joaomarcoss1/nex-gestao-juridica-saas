import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

export function Button({ children, onClick, variant = "primary", type = "button", disabled = false, className = "" }: { children: ReactNode; onClick?: () => void | Promise<void>; variant?: "primary" | "ghost" | "danger" | "gold"; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!onClick || disabled || busy) return;
    try {
      const result = onClick();
      if (result && typeof (result as Promise<void>).then === "function") {
        setBusy(true);
        await result;
      }
    } catch (error) {
      console.error("Falha ao executar ação do botão", error);
      window.dispatchEvent(new CustomEvent("nex:button-error", { detail: error instanceof Error ? error.message : "Ação não concluída." }));
    } finally {
      setBusy(false);
    }
  }

  return <button type={type} onClick={onClick ? () => void handleClick() : undefined} disabled={disabled || busy} className={`nex-btn nex-btn-${variant} ${className} ${busy ? "is-busy" : ""}`}>{busy ? "Processando..." : children}</button>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel card-motion ${className}`}>{children}</section>;
}

export function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "blue" | "gold" | "green" | "red" | "purple" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Kpi({ icon: Icon, label, value, note, tone = "blue" }: { icon: LucideIcon; label: string; value: ReactNode; note?: string; tone?: "blue" | "gold" | "green" | "red" | "purple" }) {
  return <div className="kpi-card card-motion"><div className={`kpi-icon kpi-${tone}`}><Icon size={22} /></div><div><p>{label}</p><strong>{value}</strong>{note && <small>{note}</small>}</div></div>;
}

export function ProgressBar({ value, color = "blue" }: { value: number; color?: "blue" | "gold" | "green" | "red" }) {
  return <div className="progress"><span className={`progress-${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function EmptyState({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return <div className="empty-state"><Icon size={34} /><strong>{title}</strong><p>{subtitle}</p></div>;
}

export function Modal({ open, title, subtitle, children, footer, onClose }: { open: boolean; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
    <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="row-actions action-bar">{children}</div>;
}
