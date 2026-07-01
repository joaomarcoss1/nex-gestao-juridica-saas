import { ArrowLeft, CalendarClock, CircleDollarSign, FileText, ShieldAlert } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, ProgressBar, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone, uid } from "@/utils/format";
import { processesService } from "@/services/processes.service";

export function ProcessoDetalhePage({ state, processId, commit, notify, setPage }: FeaturePageProps & { processId: string }) {
  const process = state.processes.find((item) => item.id === processId);
  if (!process) return <Panel><PanelTitle title="Processo não encontrado" subtitle="O registro pode ter sido arquivado ou removido."/><Button onClick={() => setPage("processos")}><ArrowLeft size={15}/> Voltar</Button></Panel>;
  const targetProcess = process;
  const deadlines = state.deadlines.filter((d) => d.processId === targetProcess.id);
  const tasks = state.tasks.filter((t) => t.processId === targetProcess.id);
  const docs = state.documents.filter((d) => d.processId === targetProcess.id);
  const finances = state.finances.filter((f) => f.processId === targetProcess.id);
  const revenue = finances.filter((f) => f.type === "Receita").reduce((s, f) => s + f.amount, 0);
  const expenses = finances.filter((f) => f.type === "Despesa").reduce((s, f) => s + f.amount, 0);

  function back() {
    history.pushState({}, "", "/processos");
    dispatchEvent(new PopStateEvent("popstate"));
  }

  async function createDeadline() {
    const dueDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
    await commit("deadlines", { id: uid("deadline"), processId: targetProcess.id, client: targetProcess.client, responsible: targetProcess.responsible, type: "Prazo de conferência", publicationDate: new Date().toISOString().slice(0, 10), awarenessDate: new Date().toISOString().slice(0, 10), startDate: new Date().toISOString().slice(0, 10), days: 5, countType: "Dias úteis", dueDate, fatal: false, priority: "Alta", status: "Pendente", notes: "Prazo criado pelo detalhe do processo. Validar manualmente." });
    notify({ tone: "success", title: "Prazo criado", message: "Prazo gerencial vinculado ao processo." });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title={targetProcess.client} subtitle={`${targetProcess.cnj || "CNJ pendente"} · ${targetProcess.area} · ${targetProcess.court || "tribunal não informado"}`} action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button><Button variant="ghost" onClick={() => processesService.printProcessReport(state, targetProcess)}>Gerar relatório</Button><Button onClick={createDeadline}><CalendarClock size={15}/> Novo prazo</Button></ActionBar>} /><ProgressBar value={targetProcess.progress} color={targetProcess.risk === "Alto" ? "red" : targetProcess.risk === "Médio" ? "gold" : "green"}/><div className="detail-tabs"><span>Resumo</span><span>Movimentações</span><span>Prazos</span><span>Tarefas</span><span>Audiências</span><span>Documentos</span><span>Financeiro</span><span>Estratégia interna</span><span>Relatório</span></div></Panel>
    <div className="kpi-row"><Kpi icon={ShieldAlert} label="Risco" value={targetProcess.risk} note={`${targetProcess.successChance}% chance estimada`} tone={targetProcess.risk === "Alto" ? "red" : "gold"}/><Kpi icon={CalendarClock} label="Prazos" value={deadlines.length} note="validar pelo advogado" tone="blue"/><Kpi icon={FileText} label="Documentos" value={docs.length} note="vinculados" tone="purple"/><Kpi icon={CircleDollarSign} label="Resultado" value={money(revenue - expenses)} note="rentabilidade estimada" tone="green"/></div>
    <div className="detail-layout"><Panel><PanelTitle title="Dados do processo" subtitle="Ficha operacional e jurídica."/><div className="info-grid"><div><b>Parte contrária</b><span>{targetProcess.opposite || "Não informada"}</span></div><div><b>Classe</b><span>{targetProcess.class}</span></div><div><b>Fase</b><span>{targetProcess.phase}</span></div><div><b>Status</b><span>{targetProcess.status}</span></div><div><b>Valor da causa</b><span>{money(targetProcess.value)}</span></div><div><b>Honorários</b><span>{money(targetProcess.fees)}</span></div></div></Panel><Panel><PanelTitle title="Estratégia interna" subtitle="Não aparece no portal do cliente."/><div className="security-note">Campo reservado para análise de risco, probabilidade, documentos sensíveis e tese jurídica. Deve ser protegido por permissão e auditoria.</div><p>{targetProcess.notes || "Sem estratégia registrada."}</p></Panel></div>
    <Panel><PanelTitle title="Prazos jurídicos" subtitle="Controle gerencial com aviso de conferência obrigatória."/><div className="security-note">O cálculo de prazos é ferramenta de apoio gerencial. O advogado responsável deve validar conforme legislação, tribunal e regras processuais vigentes.</div><div className="responsive-table"><table><thead><tr><th>Tipo</th><th>Vencimento</th><th>Prioridade</th><th>Status</th></tr></thead><tbody>{deadlines.map(d => <tr key={d.id}><td>{d.type}</td><td>{d.dueDate}</td><td><StatusBadge tone={statusTone(d.priority)}>{d.priority}</StatusBadge></td><td>{d.status}</td></tr>)}</tbody></table></div></Panel>
    <div className="detail-layout"><Panel><PanelTitle title="Tarefas" subtitle="Workflow do processo."/><ul className="timeline-list">{tasks.map(t => <li key={t.id}><b>{t.title}</b><span>{t.status} · {t.due}</span></li>)}</ul></Panel><Panel><PanelTitle title="Financeiro" subtitle="Receitas, despesas e rentabilidade."/><ul className="timeline-list">{finances.map(f => <li key={f.id}><b>{f.category}</b><span>{f.type} · {f.status} · {money(f.amount)}</span></li>)}</ul></Panel></div>
    <Panel><PanelTitle title="Documentos e histórico" subtitle="Versões, storage e rastreabilidade."/><ul className="timeline-list">{docs.map(d => <li key={d.id}><b>{d.name}</b><span>{d.status} · {d.version} · {d.hash ? "com hash" : "sem hash"}</span></li>)}</ul></Panel>
  </div>;
}
