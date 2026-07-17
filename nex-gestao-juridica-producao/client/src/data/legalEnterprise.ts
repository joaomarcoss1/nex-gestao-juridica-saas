import type { Process, TaskStatus } from "@/types/app";

export type LegalModuleKey =
  | "Civil" | "Família e Sucessões" | "Previdenciário" | "Trabalhista" | "Empresarial" | "Tributário"
  | "Penal" | "Administrativo" | "Consumidor" | "Imobiliário" | "Agrário/Rural" | "Médico/Saúde"
  | "Digital/LGPD" | "Ambiental";

export type LegalModuleBlueprint = {
  area: LegalModuleKey;
  objective: string;
  services: string[];
  requiredFields: string[];
  checklist: string[];
  workflow: string[];
  reports: string[];
};

export const crmPipeline = [
  "Novo lead",
  "Primeiro contato",
  "Triagem",
  "Documentos solicitados",
  "Análise jurídica",
  "Proposta enviada",
  "Negociação",
  "Contrato enviado",
  "Cliente convertido",
  "Perdido",
];

export const matterWorkflow = [
  "Novo caso",
  "Triagem",
  "Análise documental",
  "Documentação pendente",
  "Estratégia definida",
  "Peça/ato em elaboração",
  "Revisão",
  "Protocolo",
  "Aguardando movimentação",
  "Audiência/perícia/reunião",
  "Cumprimento",
  "Encerrado",
  "Arquivado",
];

export const taskWorkflowStatuses: TaskStatus[] = [
  "Pendente",
  "Triagem",
  "Em produção",
  "Revisão",
  "Aguardando cliente",
  "Aguardando tribunal",
  "Concluída",
  "Atrasada",
];

export const enterpriseRoles = [
  { role: "Admin Master", scope: "Acesso total: financeiro, precificação, relatórios sensíveis, permissões, auditoria e promoção de novos Admin Master." },
  { role: "Sócio / Diretor Jurídico", scope: "Dashboards estratégicos, produtividade, relatórios de área, delegação e aprovações críticas." },
  { role: "Coordenador / Gestor de Área", scope: "Distribuição de tarefas, prazos, aprovações operacionais e produtividade da equipe." },
  { role: "Advogado", scope: "Processos atribuídos, prazos, documentos, clientes vinculados e gestão de estagiários/auxiliares." },
  { role: "Estagiário / Assistente", scope: "Tarefas atribuídas, anexos, observações e andamento sem financeiro sensível ou exclusões críticas." },
  { role: "Financeiro", scope: "Honorários, custas, receitas, despesas, parcelamentos, recibos e relatórios financeiros permitidos." },
  { role: "Administrativo / RH", scope: "Cadastros administrativos, controle de frequência, relatórios de ponto e documentos internos permitidos." },
  { role: "Cliente", scope: "Portal próprio com processos, mensagens, documentos liberados, pendências e financeiro individual." },
];

export const legalModules: LegalModuleBlueprint[] = [
  {
    area: "Civil",
    objective: "Cobranças, indenizações, obrigações, responsabilidade civil, execuções, acordos e contratos.",
    services: ["Cobrança", "Indenização", "Execução", "Cumprimento de sentença", "Acordos"],
    requiredFields: ["Tipo de obrigação", "Valor principal", "Correção", "Juros", "Multa", "Data do fato", "Provas", "Testemunhas", "Acordo proposto"],
    checklist: ["Documentos pessoais", "Contrato", "Comprovantes", "Notificações", "Provas", "Conversas", "Cálculos", "Procuração"],
    workflow: ["Triagem", "Análise de provas", "Cálculos", "Notificação", "Petição/ação", "Acordo", "Execução"],
    reports: ["Relatório de cobrança", "Cálculos", "Acordos por status"],
  },
  {
    area: "Família e Sucessões",
    objective: "Divórcio, guarda, alimentos, visitas, inventário, partilha, interdição e curatela.",
    services: ["Divórcio", "Guarda", "Alimentos", "Inventário", "Partilha"],
    requiredFields: ["Núcleo familiar", "Cônjuge", "Filhos", "Regime de bens", "Bens", "Dívidas", "Pensão", "Guarda", "Herdeiros", "Inventariante"],
    checklist: ["Certidões", "Documentos pessoais", "Comprovantes de renda", "Relação de bens", "Dívidas", "Procuração"],
    workflow: ["Triagem familiar", "Documentos", "Minuta/acordo", "Audiência", "Homologação", "Cumprimento"],
    reports: ["Controle de pensão", "Calendário de visitas", "Relação de bens"],
  },
  {
    area: "Previdenciário",
    objective: "Aposentadorias, BPC/LOAS, auxílio-doença, pensão por morte, revisões e recursos.",
    services: ["Aposentadoria", "BPC/LOAS", "Revisão", "Recurso administrativo", "Ação judicial"],
    requiredFields: ["NIT/PIS/PASEP", "CNIS", "DER", "NB", "Benefício", "Tempo de contribuição", "Carência", "PPP", "LTCAT", "Perícia"],
    checklist: ["CNIS", "CTPS", "Contribuições", "PPP", "Laudos", "Exames", "Comprovante de residência", "Indeferimento"],
    workflow: ["Triagem", "CNIS", "Cálculo", "Requerimento", "Exigência", "Recurso", "Judicialização"],
    reports: ["Planejamento previdenciário", "Exigências INSS", "Perícias"],
  },
  {
    area: "Trabalhista",
    objective: "Atuação para empregados e empregadores com verbas, jornada, rescisão e execução.",
    services: ["Reclamação trabalhista", "Defesa patronal", "Acordo", "Execução", "Consultivo"],
    requiredFields: ["Empregador", "Empregado", "Cargo", "Salário", "Admissão", "Demissão", "Jornada", "FGTS", "CCT/ACT", "Testemunhas"],
    checklist: ["Contrato", "Holerites", "Ponto", "Rescisão", "FGTS", "Conversas", "Testemunhas", "Procuração"],
    workflow: ["Triagem", "Cálculos", "Petição/defesa", "Audiência", "Acordo", "Sentença", "Execução"],
    reports: ["Verbas por caso", "Audiências", "Acordos"],
  },
  {
    area: "Empresarial",
    objective: "Empresas, sócios, contratos, governança, compliance, atas, due diligence e licenças.",
    services: ["Contrato social", "Alteração societária", "Due diligence", "Compliance", "Governança"],
    requiredFields: ["CNPJ", "Quadro societário", "Participação", "Administradores", "Contratos", "Atas", "Licenças", "Riscos"],
    checklist: ["Contrato social", "Alterações", "Atas", "Procurações", "Licenças", "Certidões"],
    workflow: ["Diagnóstico", "Documentos", "Minutas", "Aprovação", "Registro", "Calendário de obrigações"],
    reports: ["Controle societário", "Obrigações recorrentes", "Riscos empresariais"],
  },
  {
    area: "Tributário",
    objective: "Execuções fiscais, autos de infração, parcelamentos, compensações, restituições e dívida ativa.",
    services: ["Execução fiscal", "Defesa administrativa", "Auto de infração", "Parcelamento", "Restituição"],
    requiredFields: ["Tributo", "Competência", "Valor original", "Multa", "Juros", "Órgão fiscal", "Auto", "CDA", "Garantia"],
    checklist: ["Auto/CDA", "Notificações", "DARFs", "Comprovantes", "Procuração", "Contabilidade"],
    workflow: ["Triagem", "Débitos", "Defesa", "Recurso", "Garantia", "Parcelamento", "Encerramento"],
    reports: ["Débitos", "Parcelamentos", "Autos por competência"],
  },
  {
    area: "Penal",
    objective: "Inquéritos, ações penais, habeas corpus, prisões, execução penal e benefícios.",
    services: ["Inquérito", "Ação penal", "Habeas corpus", "Execução penal", "Revisão criminal"],
    requiredFields: ["Investigado", "Vítima", "Delegacia", "Tipo penal", "Inquérito", "Mandados", "Prisão", "Regime", "Remição"],
    checklist: ["BO", "Inquérito", "Mandados", "Decisões", "Provas", "Testemunhas", "Procuração"],
    workflow: ["Urgência", "Custódia", "Defesa", "Audiência", "Sentença", "Recursos", "Execução"],
    reports: ["Custódias", "Execução penal", "Prazos urgentes"],
  },
  {
    area: "Administrativo",
    objective: "PAD, sindicância, licitações, contratos públicos, concursos e servidores.",
    services: ["PAD", "Sindicância", "Licitação", "Servidor público", "Recurso administrativo"],
    requiredFields: ["Órgão", "Procedimento", "Comissão", "Autoridade", "Fase", "Penalidade", "Edital", "Contrato público"],
    checklist: ["Portaria", "Notificações", "Edital", "Contrato", "Provas", "Defesa", "Recursos"],
    workflow: ["Autuação", "Defesa", "Instrução", "Decisão", "Recurso", "Judicialização"],
    reports: ["Prazos administrativos", "Recursos", "Decisões"],
  },
  {
    area: "Consumidor",
    objective: "PROCON, juizados, bancos, saúde, telefonia, e-commerce, defeitos, cobranças e negativações.",
    services: ["PROCON", "Juizado", "Negativação", "Cobrança indevida", "Plano de saúde"],
    requiredFields: ["Fornecedor", "Produto/serviço", "Valor", "Data do problema", "Protocolos", "Danos", "Tentativa de solução"],
    checklist: ["Nota fiscal", "Protocolos", "Conversas", "Comprovantes", "Provas", "Procuração"],
    workflow: ["Triagem", "Tentativa administrativa", "Ação", "Audiência", "Acordo", "Cumprimento"],
    reports: ["Casos repetitivos", "Fornecedores", "Acordos"],
  },
  {
    area: "Imobiliário",
    objective: "Compra e venda, locação, usucapião, regularização urbana, condomínio e registro.",
    services: ["Compra e venda", "Locação", "Usucapião", "Regularização", "Condomínio"],
    requiredFields: ["Imóvel", "Matrícula", "Cartório", "IPTU", "Proprietário", "Possuidor", "Área", "Ônus", "Locador", "Locatário"],
    checklist: ["Matrícula", "IPTU", "Contrato", "Escritura", "Certidões", "Comprovantes", "Procuração"],
    workflow: ["Cadastro imóvel", "Certidões", "Contrato", "Registro", "Entrega"],
    reports: ["Matrículas", "Certidões vencidas", "Contratos de locação"],
  },
  {
    area: "Agrário/Rural",
    objective: "Diferencial estratégico para imóveis rurais, regularização fundiária, CAR, CCIR, ITR, CIB, SIGEF, INCRA, georreferenciamento e conflitos possessórios.",
    services: ["Regularização fundiária", "Georreferenciamento", "CAR/CCIR/ITR/CIB", "Usucapião rural", "Contratos agrários", "Inventário rural"],
    requiredFields: ["Nome da propriedade", "Tipo", "Proprietário", "Possuidor", "Município/UF", "Área declarada", "Área medida", "Matrícula", "CCIR", "CAR", "ITR", "CIB", "NIRF", "SIGEF", "INCRA", "Coordenadas", "Memorial", "Confrontantes", "APP", "Reserva legal", "Pendências", "Responsável técnico"],
    checklist: ["Matrícula", "CCIR", "CAR", "ITR", "CIB/NIRF", "Memorial", "Mapa", "ART/RRT", "Fotos", "Laudos", "Procuração"],
    workflow: ["Novo cliente", "Cadastro do imóvel", "Análise documental", "Checklist rural", "Levantamento técnico", "Vistoria", "Georreferenciamento", "Mapas/memoriais", "Protocolo", "Exigência", "Aprovação", "Registro", "Entrega final"],
    reports: ["Dossiê do imóvel", "Pendências rurais", "Situação fundiária", "Situação ambiental", "Situação tributária", "Histórico de protocolos"],
  },
  {
    area: "Médico/Saúde",
    objective: "Planos de saúde, erro médico, medicamentos, internações, home care, negativas, ANS e SUS.",
    services: ["Negativa de cobertura", "Medicamento", "Internação", "Home care", "Erro médico"],
    requiredFields: ["Paciente", "CID", "Médico", "Hospital", "Plano", "Carteirinha", "Negativa", "Prontuário", "Urgência"],
    checklist: ["Laudos", "Exames", "Pedido médico", "Negativa", "Prontuário", "Contrato do plano"],
    workflow: ["Urgência", "Documentos médicos", "Tutela", "Cumprimento", "Relatório médico"],
    reports: ["Negativas", "Tutelas", "Laudos pendentes"],
  },
  {
    area: "Digital/LGPD",
    objective: "LGPD, incidentes, vazamento de dados, contratos digitais, termos, privacidade, compliance e crimes digitais.",
    services: ["LGPD", "Incidente", "Política de privacidade", "Termos de uso", "Compliance digital"],
    requiredFields: ["Titular", "Controlador", "Operador", "DPO", "Incidente", "Dados", "Risco", "Autoridade", "Medidas"],
    checklist: ["Registro de incidente", "Políticas", "Contratos", "Mapeamento", "Comunicações", "Evidências"],
    workflow: ["Registro", "Análise de risco", "Medidas", "Comunicação", "Relatório", "Conformidade"],
    reports: ["Incidentes", "Conformidade", "Prazos LGPD"],
  },
  {
    area: "Ambiental",
    objective: "Licenciamento, autos de infração, TAC, embargos, multas, APP, reserva legal e regularização ambiental.",
    services: ["Licenciamento", "Auto de infração", "TAC", "Embargo", "Regularização ambiental"],
    requiredFields: ["Órgão", "Auto", "Infração", "Área afetada", "Multa", "Embargo", "Licença", "Prazo", "Laudos", "Imóvel"],
    checklist: ["Auto", "Licenças", "Laudos", "Mapas", "Notificações", "Defesa", "TAC"],
    workflow: ["Diagnóstico", "Defesa", "Laudos", "Negociação", "Regularização", "Cumprimento"],
    reports: ["Licenças", "Autos ambientais", "Prazos"],
  },
];

export const ruralPropertyModel = [
  "Nome da propriedade", "Tipo", "Proprietário", "Possuidor", "Cliente vinculado", "Município", "Estado", "Localidade", "Área declarada", "Área medida", "Área registrada", "Matrícula", "Cartório", "CCIR", "CAR", "ITR", "CIB", "NIRF", "SIGEF", "INCRA", "Coordenadas", "Memorial descritivo", "Mapa", "Confrontantes", "Reserva legal", "APP", "Área produtiva", "Área de preservação", "Situação ambiental", "Situação tributária", "Situação registral", "Situação fundiária", "Pendências", "Protocolos", "Fotos", "Vídeos", "Laudos", "ART/RRT", "Responsável técnico",
];

export const enterpriseReportGroups = [
  "Processos por área", "Processos por advogado", "Prazos vencidos", "Prazos próximos", "Tarefas atrasadas", "Produtividade por equipe", "Clientes ativos", "Casos novos", "Casos encerrados", "Tempo médio por demanda", "Processos parados", "Protocolos pendentes", "Faturamento", "Inadimplência", "Custas", "Rentabilidade por cliente", "Rentabilidade por área", "Ponto", "Frequência", "Tempo de resposta ao cliente", "Pendências documentais",
];

export function moduleForProcess(process: Process) {
  return legalModules.find((module) => module.area === process.area || process.area.toLowerCase().includes(module.area.split("/")[0].toLowerCase())) ?? legalModules[0];
}
