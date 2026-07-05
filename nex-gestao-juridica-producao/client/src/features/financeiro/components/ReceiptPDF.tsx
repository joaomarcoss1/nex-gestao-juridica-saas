import type { FinanceEntry } from "@/types/app";
import { Button } from "@/components/ui/Primitives";
import { financialService } from "@/services/financial.service";

export function ReceiptPDF({ entry }: { entry: FinanceEntry }) {
  return <Button variant="ghost" onClick={() => financialService.printReceipt(entry)}>Gerar recibo</Button>;
}
