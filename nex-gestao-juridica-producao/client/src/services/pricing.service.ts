import type { FinanceEntry, PricingProposal } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { openPrintableReport } from "./reportsEngine.service";
import { money, todayIso, uid } from "@/utils/format";

export const pricingService = {
  ...createCrudService("pricings"),
  acceptProposal(proposal: PricingProposal): { proposal: PricingProposal; finance: FinanceEntry } {
    return {
      proposal: { ...proposal, status: "Aceita" },
      finance: { id: uid("fin"), type: "Receita", category: "Entrada de honorários", client: proposal.client, processId: proposal.processId, amount: proposal.entry || proposal.recommended, dueDate: todayIso(), status: "Pendente", method: "PIX", notes: `Gerado pela proposta ${proposal.title}.` },
    };
  },
  printProposal(proposal: PricingProposal) {
    openPrintableReport(`Proposta de honorários - ${proposal.client}`, [
      ["Serviço", proposal.title],
      ["Área", proposal.area],
      ["Mínimo técnico", money(proposal.minimum)],
      ["Recomendado", money(proposal.recommended)],
      ["Premium", money(proposal.premium)],
      ["Entrada sugerida", money(proposal.entry)],
      ["Honorários de êxito", `${proposal.successFee}%`],
      ["Aviso", "Valores gerenciais. Validar com tabela OAB, complexidade e estratégia profissional."],
    ]);
  },
};
