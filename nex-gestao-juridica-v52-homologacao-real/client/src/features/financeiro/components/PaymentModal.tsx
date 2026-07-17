import { useState } from "react";
import type { FinanceEntry } from "@/types/app";
import { Button, Field, Modal } from "@/components/ui/Primitives";
import { todayIso } from "@/utils/format";

export function PaymentModal({ entry, open, onClose, onPay }: { entry: FinanceEntry; open: boolean; onClose: () => void; onPay: (entry: FinanceEntry) => Promise<void> | void }) {
  const balance = Math.max(0, entry.amount - (entry.paidAmount ?? 0));
  const [paidAmount, setPaidAmount] = useState(balance);
  const [paidDate, setPaidDate] = useState(entry.paidDate ?? todayIso());
  return <Modal open={open} title="Baixa financeira" subtitle="Registre baixa total ou parcial com auditoria." onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => onPay({ ...entry, paidAmount, paidDate, status: paidAmount >= balance ? "Pago" : "Parcial" })}>Confirmar baixa</Button></>}>
    <div className="form-grid">
      <Field label={`Valor desta baixa · saldo ${balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}><input type="number" min="0.01" max={balance} step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value) || 0)} /></Field>
      <Field label="Data de pagamento"><input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></Field>
      <Field label="Observação"><textarea value={entry.notes ?? ""} readOnly /></Field>
    </div>
  </Modal>;
}
