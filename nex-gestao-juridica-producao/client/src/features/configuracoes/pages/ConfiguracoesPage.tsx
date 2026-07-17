import { CheckCircle2, Database, LockKeyhole, Palette, PhoneCall, ShieldCheck, Sparkles } from "lucide-react";
import { InviteUserPage } from "@/features/auth/pages/InviteUserPage";
import type { FeaturePageProps } from "@/types/app";
import { Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { databaseMode } from "@/services/supabase";

export function ConfiguracoesPage({ state }: FeaturePageProps) {
  const checks = [
    ["App.tsx modularizado", "Ativo", "Páginas movidas para features/*/pages"],
    ["Persistência normalizada", "Ativo", "Clientes, processos, tarefas, financeiro, documentos e automações usam tabelas específicas"],
    ["Fallback local seguro", "Ativo", "Modo demo mantém operação quando Supabase não está configurado"],
    ["RLS preparado", "Ativo", "supabase/rls.sql com isolamento por organização"],
    ["Scanner funcional", "Ativo", "Câmera/upload, canvas, hash, PDF e Storage"],
    ["Ponto com sequência", "Ativo", "PIN, ordem de batida, justificativa e auditoria"],
    ["Animações corporativas", "Ativo", "Transições suaves, cards vivos e feedback por toast"],
  ];
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={ShieldCheck} label="Segurança" value="RLS" note="políticas preparadas" tone="green"/><Kpi icon={Database} label="Banco" value={databaseMode === "production" ? "Supabase" : "Demo"} note="modo atual" tone="blue"/><Kpi icon={LockKeyhole} label="Auditoria" value={state.automationRuns.length} note="logs internos" tone="gold"/><Kpi icon={Sparkles} label="UX" value="Premium" note="animações discretas" tone="purple"/></div>
    <Panel><PanelTitle title="Checklist técnico de produção" subtitle="Última evolução aplicada para padrão SaaS maduro." />
      <div className="responsive-table"><table><thead><tr><th>Item</th><th>Status</th><th>Detalhe</th></tr></thead><tbody>{checks.map(([item,status,detail]) => <tr key={item}><td>{item}</td><td><StatusBadge tone="green">{status}</StatusBadge></td><td>{detail}</td></tr>)}</tbody></table></div>
    </Panel>
    <InviteUserPage />
    <Panel><PanelTitle title="Personalização do escritório" subtitle="Prepare a marca do cliente para portal, relatórios e comunicações."/><div className="office-brand-grid"><div><Palette/> Logo, cores e nome fantasia</div><div><PhoneCall/> WhatsApp, e-mail e endereço do escritório</div><div><ShieldCheck/> Texto de boas-vindas do portal</div><div><Sparkles/> Assinatura NexLabs em relatórios</div></div></Panel>
    <Panel><PanelTitle title="Ambiente Vercel/Supabase" subtitle="Para produção real, crie o projeto Supabase, rode schema.sql + rls.sql + seed.sql e preencha as variáveis."/><div className="config-grid"><div><CheckCircle2/> npm run check</div><div><CheckCircle2/> npm run build</div><div><CheckCircle2/> npm audit --audit-level=high</div><div><CheckCircle2/> vercel.json configurado</div></div></Panel>
  </div>;
}
