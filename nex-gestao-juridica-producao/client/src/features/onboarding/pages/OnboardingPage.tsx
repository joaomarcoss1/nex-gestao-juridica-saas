import { Building2, CheckCircle2, ClipboardList, FileText, Rocket, Users } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { Button, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";

export function OnboardingPage({ state, setPage, notify }: FeaturePageProps) {
  const steps = [
    { title: "Criar primeira empresa", done: state.organizations.length > 0, page: "empresas" as const, icon: Building2, text: "Cadastre escritório, matrícula e admin responsável." },
    { title: "Criar usuário admin", done: state.employees.some((e) => /admin|sócio|socio/i.test(e.role)), page: "equipe" as const, icon: Users, text: "Defina responsável, cargo, permissões e status." },
    { title: "Cadastrar primeiro cliente", done: state.clients.length > 0, page: "clientes" as const, icon: Users, text: "Valide CPF/CNPJ, origem e responsável." },
    { title: "Cadastrar primeiro processo", done: state.processes.length > 0, page: "processos" as const, icon: ClipboardList, text: "Vincule ao cliente e responsável correto." },
    { title: "Gerar primeiro relatório", done: state.reportExports.length > 0, page: "relatorios" as const, icon: FileText, text: "Exporte PDF/Excel para validar apresentação." },
    { title: "Testar portal do cliente", done: state.messages.length > 0 || state.documents.some((doc) => doc.clientVisible), page: "portal" as const, icon: Rocket, text: "Confirme visual mobile e dados liberados." },
  ];
  const progress = Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
  return <div className="page-grid onboarding-page">
    <div className="kpi-row"><Kpi icon={Rocket} label="Onboarding" value={`${progress}%`} note="implantação assistida" tone={progress >= 80 ? "green" : "gold"}/><Kpi icon={Building2} label="Empresas" value={state.organizations.length} note="ativos/cadastrados" tone="blue"/><Kpi icon={Users} label="Clientes" value={state.clients.length} note="base inicial" tone="purple"/><Kpi icon={ClipboardList} label="Processos" value={state.processes.length} note="operações" tone="green"/></div>
    <Panel className="onboarding-hero"><PanelTitle title="Assistente de Primeira Configuração" subtitle="Fluxo guiado para deixar o escritório pronto para usar o Nex Gestão Jurídica." action={<Button variant="gold" onClick={() => notify({ tone: "info", title: "Modo demo", message: "Use o seed_demo_v46.sql no Supabase para carregar uma apresentação premium." })}>Carregar demo via seed</Button>} /><ProgressBar value={progress} color={progress >= 80 ? "green" : "gold"}/></Panel>
    <div className="onboarding-steps">{steps.map((step, index) => { const Icon = step.icon; return <Panel key={step.title} className={`onboarding-step ${step.done ? "done" : ""}`}><div className="step-number">{step.done ? <CheckCircle2/> : index + 1}</div><Icon/><div><strong>{step.title}</strong><p>{step.text}</p><StatusBadge tone={step.done ? "green" : "gold"}>{step.done ? "Concluído" : "Pendente"}</StatusBadge></div><Button variant={step.done ? "ghost" : "primary"} onClick={() => setPage(step.page)}>{step.done ? "Revisar" : "Configurar"}</Button></Panel>; })}</div>
  </div>;
}
