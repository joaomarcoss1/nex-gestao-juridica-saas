import { useState } from "react";
import { ArrowLeft, Banknote, Download, Receipt, ShieldCheck } from "lucide-react";
import type { FeaturePageProps, FinanceEntry } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone } from "@/utils/format";
import { PaymentModal } from "@/features/financeiro/components/PaymentModal";
import { ReceiptPDF } from "@/features/financeiro/components/ReceiptPDF";
import { CashFlowReport } from "@/features/financeiro/components/CashFlowReport";
import { DREReport } from "@/features/financeiro/components/DREReport";

export function FinanceiroDetalhePage({ state, financeId, executeAtomic, notify, setPage }: FeaturePageProps & { financeId: string }) {
  const entry = state.finances.find((item) => item.id === financeId);
  const [paying, setPaying] = useState(false);
  if (!entry) return <Panel><PanelTitle title="Lançamento não encontrado" subtitle="O registro pode ter sido removido."/><Button onClick={() => setPage("financeiro")}><ArrowLeft size={15}/> Voltar</Button></Panel>;
  const process = state.processes.find((p) => p.id === entry.processId);
  const related = state.finances.filter((row) => row.client === entry.client || (entry.processId && row.processId === entry.processId));
  const revenue = related.filter((row) => row.type === "Receita").reduce((sum, row) => sum + row.amount, 0);
  const expenses = related.filter((row) => row.type === "Despesa").reduce((sum, row) => sum + row.amount, 0);

  function back() {
    history.pushState({}, "", "/financeiro");
    dispatchEvent(new Event("popstate"));
  }

  async function pay(next: FinanceEntry) {
    const amountCents = Math.round(Math.max(0, next.paidAmount ?? 0) * 100);
    if (!amountCents) {
      notify({ tone: "error", title: "Valor inválido", message: "Informe um valor de baixa maior que zero." });
      return;
    }
    await executeAtomic({ type: "registerPayment", financialEntryId: next.id, amountCents, paymentDate: next.paidDate ?? new Date().toISOString().slice(0, 10), paymentMethod: next.method, idempotencyKey: `payment:${next.id}:${next.version ?? 0}:${amountCents}` });
    setPaying(false);
    notify({ tone: "success", title: "Baixa registrada", message: "Pagamento, recibo e saldo foram confirmados em uma única operação idempotente." });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title={`${entry.category} · ${entry.client}`} subtitle="Detalhe financeiro com baixa, recibo, vínculo processual e auditoria." action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button>{["Pendente", "Parcial", "Atrasado"].includes(entry.status) && <Button onClick={() => setPaying(true)}><Banknote size={15}/> Dar baixa</Button>}<ReceiptPDF entry={entry}/></ActionBar>} /></Panel>
    <div className="kpi-row"><Kpi icon={Receipt} label="Valor" value={money(entry.amount)} note={entry.method} tone="gold"/><Kpi icon={ShieldCheck} label="Status" value={entry.status} note={entry.dueDate} tone={entry.status === "Pago" ? "green" : "red"}/><Kpi icon={Banknote} label="Receitas vinculadas" value={money(revenue)} note={entry.client} tone="green"/><Kpi icon={Download} label="Resultado vinculado" value={money(revenue - expenses)} note="cliente/processo" tone="blue"/></div>
    <div className="detail-layout"><Panel><PanelTitle title="Dados do lançamento" subtitle="Registro gerencial e auditável."/><div className="info-grid"><div><b>Tipo</b><span>{entry.type}</span></div><div><b>Categoria</b><span>{entry.category}</span></div><div><b>Cliente/Centro</b><span>{entry.client}</span></div><div><b>Processo</b><span>{process?.cnj || entry.processId || "Sem vínculo"}</span></div><div><b>Vencimento</b><span>{entry.dueDate}</span></div><div><b>Pagamento</b><span>{entry.paidDate ?? "Pendente"}</span></div><div><b>Status</b><span><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></span></div><div><b>Observações</b><span>{entry.notes ?? "-"}</span></div></div></Panel><Panel><PanelTitle title="Segurança financeira" subtitle="Baixas e recibos precisam ficar auditáveis."/><div className="security-note">Toda baixa, alteração de valor, cancelamento e emissão de relatório deve gerar log em auditoria. Integrações PIX, boleto e cartão exigem backend seguro e webhooks homologados.</div></Panel></div>
    <DREReport state={state}/>
    <CashFlowReport state={state}/>
    <PaymentModal entry={entry} open={paying} onClose={() => setPaying(false)} onPay={pay}/>
  </div>;
}
