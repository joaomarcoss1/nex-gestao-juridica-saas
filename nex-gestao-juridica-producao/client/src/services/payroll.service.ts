import type { AppState, Payroll } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { openPrintableReport } from "./reportsEngine.service";
import { money } from "@/utils/format";

export const payrollService = {
  ...createCrudService("payrolls"),
  calculateNet(payroll: Payroll) {
    return payroll.baseSalary + payroll.benefits + payroll.commissions + payroll.overtime * 25 - payroll.discounts - payroll.absences * 80 - payroll.delays * 20;
  },
  printPayslip(payroll: Payroll) {
    openPrintableReport(`Holerite gerencial - ${payroll.employeeName}`, [
      ["Mês/Ano", `${payroll.month}/${payroll.year}`],
      ["Salário base", money(payroll.baseSalary)],
      ["Horas trabalhadas", String(payroll.workedHours)],
      ["Horas extras", String(payroll.overtime)],
      ["Benefícios", money(payroll.benefits)],
      ["Descontos", money(payroll.discounts)],
      ["Comissões", money(payroll.commissions)],
      ["Líquido", money(payroll.net)],
      ["Aviso", "Folha gerencial. Não substitui folha trabalhista, contador, eSocial ou obrigações legais."],
    ]);
  },
};
