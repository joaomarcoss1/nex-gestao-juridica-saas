import { ArrowLeft, FileText, Mail, MessageCircle, Plus, ShieldCheck } from "lucide-react";
import type { FeaturePageProps } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone, uid } from "@/utils/format";
import { clientsService } from "@/services/clients.service";

export function ClienteDetalhePage({ state, clientId, commit, notify, setPage }: FeaturePageProps & { clientId: string }) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return <Panel><PanelTitle title="Cliente não encontrado" subtitle="O registro pode ter sido arquivado ou removido."/><Button onClick={() => setPage("clientes")}><ArrowLeft size={15}/> Voltar</Button></Panel>;
  const targetClient = client;
  const processes = state.processes.filter((p) => p.client === targetClient.name);
  const docs = state.documents.filter((d) => d.client === targetClient.name);
  const finances = state.finances.filter((f) => f.client === targetClient.name);
  const tasks = state.tasks.filter((t) => t.client === targetClient.name);
  const pricings = state.pricings.filter((p) => p.client === targetClient.name);
  const messages = state.messages.filter((m) => m.client === targetClient.name);
  const revenue = finances.filter((f) => f.type === "Receita").reduce((sum, item) => sum + item.amount, 0);

  function back() {
    history.pushState({}, "", "/clientes");
    dispatchEvent(new PopStateEvent("popstate"));
  }

  async function createLinkedTask() {
    await commit("tasks", { id: uid("task"), title: `Follow-up do cliente ${targetClient.name}`, client: targetClient.name, processId: processes[0]?.id ?? "", responsible: targetClient.responsible, sector: "Atendimento", priority: "Média", status: "Pendente", due: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), estimatedHours: 1, spentHours: 0 });
    notify({ tone: "success", title: "Tarefa vinculada", message: "Follow-up criado na ficha do cliente." });
  }

  return <div className="page-grid">
    <Panel>
      <PanelTitle title={targetClient.name} subtitle={`${targetClient.type} · ${targetClient.document || "documento pendente"} · ficha 360º do cliente`} action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button><Button variant="ghost" onClick={() => clientsService.printClientFicha(state, targetClient)}>Gerar ficha PDF</Button><Button onClick={createLinkedTask}><Plus size={15}/> Criar tarefa</Button></ActionBar>} />
      <div className="detail-tabs"><span>Resumo</span><span>Dados cadastrais</span><span>Processos</span><span>Documentos</span><span>Financeiro</span><span>Propostas</span><span>Mensagens</span><span>LGPD</span></div>
    </Panel>
    <div className="kpi-row"><Kpi icon={ShieldCheck} label="Status" value={targetClient.status} note={targetClient.origin} tone="green"/><Kpi icon={FileText} label="Processos" value={processes.length} note="ativos/vinculados" tone="blue"/><Kpi icon={Mail} label="Financeiro" value={money(revenue)} note="receitas vinculadas" tone="gold"/><Kpi icon={MessageCircle} label="Mensagens" value={messages.length} note="histórico do portal" tone="purple"/></div>
    <div className="detail-layout">
      <Panel><PanelTitle title="Dados cadastrais" subtitle="Informações editáveis e auditáveis."/><div className="info-grid"><div><b>E-mail</b><span>{targetClient.email || "Não informado"}</span></div><div><b>Telefone</b><span>{targetClient.phone || targetClient.whatsapp || "Não informado"}</span></div><div><b>Cidade</b><span>{targetClient.city || "Não informada"}</span></div><div><b>Responsável</b><span>{state.employees.find(e=>e.id===targetClient.responsible)?.name || targetClient.responsible}</span></div><div><b>Endereço</b><span>{targetClient.address || "Não informado"}</span></div><div><b>Observações</b><span>{targetClient.notes || "Sem observações"}</span></div></div></Panel>
      <Panel><PanelTitle title="LGPD e sigilo" subtitle="Controle de dados sensíveis do cliente."/><div className="security-note">Dados pessoais devem ter base legal, acesso restrito, auditoria de visualização e exclusão controlada. O portal do cliente não exibe estratégia interna.</div></Panel>
    </div>
    <Panel><PanelTitle title="Processos vinculados" subtitle="Carteira jurídica por cliente."/><div className="responsive-table"><table><thead><tr><th>CNJ</th><th>Área</th><th>Fase</th><th>Risco</th><th>Ações</th></tr></thead><tbody>{processes.map(p => <tr key={p.id}><td>{p.cnj || "Sem CNJ"}</td><td>{p.area}</td><td>{p.phase}</td><td><StatusBadge tone={statusTone(p.risk)}>{p.risk}</StatusBadge></td><td><Button variant="ghost" onClick={() => { history.pushState({}, "", `/processos/${p.id}`); dispatchEvent(new PopStateEvent("popstate")); }}>Abrir</Button></td></tr>)}</tbody></table></div></Panel>
    <div className="detail-layout"><Panel><PanelTitle title="Documentos" subtitle="Storage privado e versões."/><ul className="timeline-list">{docs.map(d => <li key={d.id}><b>{d.name}</b><span>{d.status} · {d.version}</span></li>)}</ul></Panel><Panel><PanelTitle title="Financeiro e propostas" subtitle="Cobranças, honorários e propostas."/><ul className="timeline-list">{finances.map(f => <li key={f.id}><b>{f.category}</b><span>{f.status} · {money(f.amount)}</span></li>)}{pricings.map(p => <li key={p.id}><b>{p.title}</b><span>{p.status} · {money(p.recommended)}</span></li>)}</ul></Panel></div>
    <Panel><PanelTitle title="Timeline operacional" subtitle="Tarefas e mensagens vinculadas ao cliente."/><ul className="timeline-list">{tasks.map(t => <li key={t.id}><b>{t.title}</b><span>{t.status} · {t.due}</span></li>)}{messages.map(m => <li key={m.id}><b>{m.subject}</b><span>{m.channel} · {m.status}</span></li>)}</ul></Panel>
  </div>;
}
