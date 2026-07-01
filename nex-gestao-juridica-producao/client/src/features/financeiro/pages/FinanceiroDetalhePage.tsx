import { useState } from "react";
import { ArrowLeft, Banknote, Download, Receipt, ShieldCheck } from "lucide-react";
import type { FeaturePageProps, FinanceEntry } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { money, statusTone } from "@/utils/format";
import { PaymentModal } from "@/features/financeiro/components/PaymentModal";
import { ReceiptPDF } from "@/features/financeiro/components/ReceiptPDF";
import { CashFlowReport } from "@/features/financeiro/components/CashFlowReport";
import { DREReport } from "@/features/financeiro/components/DREReport";
import { financialService } from "@/services/financial.service";

export function FinanceiroDetalhePage({ state, financeId, commit, notify, setPage }: FeaturePageProps & { financeId: string }) {
  const entry = state.finances.find((item) => item.id === financeId);
  const [paying, setPaying] = useState(false);
  if (!entry) return <Panel><PanelTitle title="Lançamento não encontrado" subtitle="O registro pode ter sido removido."/><Button onClick={() => setPage("financeiro")}><ArrowLeft size={15}/> Voltar</Button></Panel>;
  const process = state.processes.find((p) => p.id === entry.processId);
  const related = state.finances.filter((row) => row.client === entry.client || (entry.processId && row.processId === entry.processId));
  const revenue = related.filter((row) => row.type === "Receita").reduce((sum, row) => sum + row.amount, 0);
  const expenses = related.filter((row) => row.type === "Despesa").reduce((sum, row) => sum + row.amount, 0);

  function back() {
    history.pushState({}, "", "/financeiro");
    dispatchEvent(new PopStateEvent("popstate"));
  }

  async function pay(next: FinanceEntry) {
    const paid = financialService.markPaid(next, next.paidAmount ?? next.amount);
    await commit("finances", paid, "update");
    await commit("paymentReceipts", { id: `receipt_${paid.id}_${Date.now()}`, financeId: paid.id, receiptNumber: paid.receiptNumber ?? `REC-${paid.id}`, amount: paid.paidAmount ?? paid.amount, issuedAt: new Date().toISOString() });
    setPaying(false);
    notify({ tone: "success", title: "Baixa registrada", message: `Status atualizado para ${paid.status} e recibo ${paid.receiptNumber} registrado.` });
  }

  return <div className="page-grid">
    <Panel><PanelTitle title={`${entry.category} · ${entry.client}`} subtitle="Detalhe financeiro com baixa, recibo, vínculo processual e auditoria." action={<ActionBar><Button variant="ghost" onClick={back}><ArrowLeft size={15}/> Voltar</Button><Button onClick={() => setPaying(true)}><Banknote size={15}/> Dar baixa</Button><ReceiptPDF entry={entry}/></ActionBar>} /></Panel>
    <div className="kpi-row"><Kpi icon={Receipt} label="Valor" value={money(entry.amount)} note={entry.method} tone="gold"/><Kpi icon={ShieldCheck} label="Status" value={entry.status} note={entry.dueDate} tone={entry.status === "Pago" ? "green" : "red"}/><Kpi icon={Banknote} label="Receitas vinculadas" value={money(revenue)} note={entry.client} tone="green"/><Kpi icon={Download} label="Resultado vinculado" value={money(revenue - expenses)} note="cliente/processo" tone="blue"/></div>
    <div className="detail-layout"><Panel><PanelTitle title="Dados do lançamento" subtitle="Registro gerencial e auditável."/><div className="info-grid"><div><b>Tipo</b><span>{entry.type}</span></div><div><b>Categoria</b><span>{entry.category}</span></div><div><b>Cliente/Centro</b><span>{entry.client}</span></div><div><b>Processo</b><span>{process?.cnj || entry.processId || "Sem vínculo"}</span></div><div><b>Vencimento</b><span>{entry.dueDate}</span></div><div><b>Pagamento</b><span>{entry.paidDate ?? "Pendente"}</span></div><div><b>Status</b><span><StatusBadge tone={statusTone(entry.status)}>{entry.status}</StatusBadge></span></div><div><b>Observações</b><span>{entry.notes ?? "-"}</span></div></div></Panel><Panel><PanelTitle title="Segurança financeira" subtitle="Baixas e recibos precisam ficar auditáveis."/><div className="security-note">Toda baixa, alteração de valor, cancelamento e emissão de relatório deve gerar log em auditoria. Integrações PIX, boleto e cartão exigem backend seguro e webhooks homologados.</div></Panel></div>
    <DREReport state={state}/>
    <CashFlowReport state={state}/>
    <PaymentModal entry={entry} open={paying} onClose={() => setPaying(false)} onPay={pay}/>
  </div>;
}
