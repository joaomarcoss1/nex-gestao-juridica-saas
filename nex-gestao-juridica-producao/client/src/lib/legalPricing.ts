export type AreaDireito =
  | "criminal"
  | "civil"
  | "trabalhista"
  | "previdenciario"
  | "familia"
  | "consumidor"
  | "empresarial"
  | "tributario"
  | "administrativo"
  | "outro";

export type ServicoJuridico =
  | "flagrante_diurno"
  | "flagrante_noturno"
  | "habeas_corpus_singular"
  | "habeas_corpus_tribunal"
  | "habeas_corpus_superior"
  | "audiencia_custodia"
  | "acao_civel"
  | "acao_trabalhista"
  | "acao_previdenciaria"
  | "consultoria"
  | "contrato"
  | "recurso"
  | "acompanhamento_processual"
  | "defesa_criminal_completa";

export type ProfissionalCaso = {
  papel: string;
  horas: number;
  valorHora?: number;
  fator?: number;
};

export type OfficeCostConfig = {
  aluguel: number;
  energia: number;
  agua: number;
  internet: number;
  sistemas: number;
  contador: number;
  marketing: number;
  materialEscritorio: number;
  manutencao: number;
  impostosFixos: number;
  folhaFuncionarios: number;
  proLaboreSocios: number;
  outros: number;
  horasProdutivasMes: number;
  margemLucroDesejada: number;
  impostosVariaveisPercentual: number;
  reservaRiscoPercentual: number;
  custoKm: number;
};

export type CasePricingInput = {
  area: AreaDireito;
  servico: ServicoJuridico;
  valorCausa: number;
  complexidade: number;
  urgencia: number;
  risco: number;
  horasTecnicas: number;
  horasAdministrativas: number;
  profissionais: ProfissionalCaso[];
  audienciasConciliacao: number;
  audienciasInstrucao: number;
  audienciasCustodia: number;
  idasDelegacia: number;
  idasTribunal: number;
  kmTotal: number;
  horasDeslocamento: number;
  custas: number;
  copiasDigitalizacoes: number;
  certidoes: number;
  diligenciasTerceiros: number;
  alimentacao: number;
  hospedagem: number;
  estacionamento: number;
  outrasDespesas: number;
  plantao: boolean;
  foraComarca: boolean;
};

export type PricingResult = {
  custoFixoMensal: number;
  custoHoraEscritorio: number;
  custoMaoObra: number;
  custoHorasInternas: number;
  custoDeslocamento: number;
  custoEventos: number;
  despesasDiretas: number;
  custoOperacional: number;
  baseOab: number;
  pisoEtico: number;
  fatorComplexidade: number;
  fatorUrgencia: number;
  fatorRisco: number;
  percentualExito: number;
  minimoTecnico: number;
  recomendado: number;
  premium: number;
  entradaSugerida: number;
  parcelasSugeridas: number[];
  honorarioExito: number;
  margemRealEstimada: number;
  alertas: string[];
  breakdown: { item: string; valor: number; observacao: string }[];
};

export const servicoLabels: Record<ServicoJuridico, string> = {
  flagrante_diurno: "Acompanhamento de flagrante — diurno",
  flagrante_noturno: "Acompanhamento de flagrante — noturno/plantão",
  habeas_corpus_singular: "Habeas Corpus — juízo singular",
  habeas_corpus_tribunal: "Habeas Corpus — tribunal",
  habeas_corpus_superior: "Habeas Corpus — tribunais superiores",
  audiencia_custodia: "Audiência de custódia",
  acao_civel: "Ação cível",
  acao_trabalhista: "Ação trabalhista",
  acao_previdenciaria: "Ação previdenciária",
  consultoria: "Consultoria jurídica",
  contrato: "Elaboração/revisão de contrato",
  recurso: "Recurso",
  acompanhamento_processual: "Acompanhamento processual mensal",
  defesa_criminal_completa: "Defesa criminal completa",
};

export const areaLabels: Record<AreaDireito, string> = {
  criminal: "Criminal",
  civil: "Cível",
  trabalhista: "Trabalhista",
  previdenciario: "Previdenciário",
  familia: "Família e Sucessões",
  consumidor: "Consumidor",
  empresarial: "Empresarial",
  tributario: "Tributário",
  administrativo: "Administrativo",
  outro: "Outro",
};

// Valores editáveis usados como referência inicial. Em produção, devem virar tabela configurável por seccional/ano.
export const oabMaReference: Record<ServicoJuridico, { minimo: number; percentualExito: number; fonte: string }> = {
  flagrante_diurno: { minimo: 2043.02, percentualExito: 0, fonte: "OAB-MA — acompanhamento de auto de prisão em flagrante diurno" },
  flagrante_noturno: { minimo: 4086.03, percentualExito: 0, fonte: "OAB-MA — acompanhamento de auto de prisão em flagrante noturno" },
  habeas_corpus_singular: { minimo: 5238.5, percentualExito: 0, fonte: "OAB-MA — Habeas Corpus perante juízo singular" },
  habeas_corpus_tribunal: { minimo: 7333.9, percentualExito: 0, fonte: "OAB-MA — Habeas Corpus perante tribunais" },
  habeas_corpus_superior: { minimo: 12572.4, percentualExito: 0, fonte: "OAB-MA — Habeas Corpus perante tribunais superiores" },
  audiencia_custodia: { minimo: 2619.25, percentualExito: 0, fonte: "OAB-MA — audiência de custódia" },
  acao_civel: { minimo: 4200, percentualExito: 0.12, fonte: "Parâmetro interno + tabela OAB configurável" },
  acao_trabalhista: { minimo: 5500, percentualExito: 0.18, fonte: "Parâmetro interno + tabela OAB configurável" },
  acao_previdenciaria: { minimo: 6072, percentualExito: 0.3, fonte: "OAB-MA — fase judicial previdenciária como referência" },
  consultoria: { minimo: 500, percentualExito: 0, fonte: "OAB-MA — hora intelectual" },
  contrato: { minimo: 1592.5, percentualExito: 0, fonte: "OAB-MA — elaboração/revisão de contratos diversos como referência" },
  recurso: { minimo: 5175.64, percentualExito: 0.05, fonte: "OAB-MA — recurso criminal/cível como referência" },
  acompanhamento_processual: { minimo: 1100, percentualExito: 0, fonte: "Parâmetro interno de mensalidade mínima" },
  defesa_criminal_completa: { minimo: 20954, percentualExito: 0, fonte: "OAB-MA — rito comum ordinário criminal como referência" },
};

const eventMinimums = {
  audienciaConciliacao: 377.17,
  audienciaInstrucao: 607.67,
  audienciaCustodia: 2619.25,
  idaDelegacia: 770,
  idaTribunal: 770,
  foraComarcaDiaria: 1508.69,
};

const areaRisk: Record<AreaDireito, number> = {
  criminal: 1.24,
  tributario: 1.2,
  empresarial: 1.18,
  familia: 1.14,
  trabalhista: 1.12,
  previdenciario: 1.1,
  civil: 1.1,
  consumidor: 1.06,
  administrativo: 1.12,
  outro: 1.08,
};

export function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(value) ? value : 0);
}

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const defaultOfficeCosts: OfficeCostConfig = {
  aluguel: 2500,
  energia: 650,
  agua: 180,
  internet: 180,
  sistemas: 950,
  contador: 700,
  marketing: 900,
  materialEscritorio: 450,
  manutencao: 350,
  impostosFixos: 650,
  folhaFuncionarios: 16800,
  proLaboreSocios: 10000,
  outros: 700,
  horasProdutivasMes: 176,
  margemLucroDesejada: 35,
  impostosVariaveisPercentual: 8,
  reservaRiscoPercentual: 6,
  custoKm: 1.65,
};

export const defaultCaseInput: CasePricingInput = {
  area: "criminal",
  servico: "flagrante_noturno",
  valorCausa: 50000,
  complexidade: 4,
  urgencia: 5,
  risco: 4,
  horasTecnicas: 8,
  horasAdministrativas: 2,
  profissionais: [
    { papel: "Advogado responsável", horas: 8, fator: 1.6 },
    { papel: "Estagiário/apoio", horas: 2, fator: 0.55 },
  ],
  audienciasConciliacao: 0,
  audienciasInstrucao: 0,
  audienciasCustodia: 1,
  idasDelegacia: 1,
  idasTribunal: 0,
  kmTotal: 30,
  horasDeslocamento: 1.5,
  custas: 0,
  copiasDigitalizacoes: 60,
  certidoes: 80,
  diligenciasTerceiros: 0,
  alimentacao: 60,
  hospedagem: 0,
  estacionamento: 20,
  outrasDespesas: 0,
  plantao: true,
  foraComarca: false,
};

function sumOfficeCosts(config: OfficeCostConfig) {
  return Object.entries(config).reduce((acc, [key, value]) => {
    if (["horasProdutivasMes", "margemLucroDesejada", "impostosVariaveisPercentual", "reservaRiscoPercentual", "custoKm"].includes(key)) return acc;
    return acc + safeNumber(value);
  }, 0);
}

export function calculateLegalPricing(config: OfficeCostConfig, input: CasePricingInput): PricingResult {
  const custoFixoMensal = sumOfficeCosts(config);
  const horasProdutivas = Math.max(1, safeNumber(config.horasProdutivasMes, 176));
  const custoHoraEscritorio = custoFixoMensal / horasProdutivas;

  const totalHorasInternas = safeNumber(input.horasTecnicas) + safeNumber(input.horasAdministrativas) + safeNumber(input.horasDeslocamento);
  const custoHorasInternas = totalHorasInternas * custoHoraEscritorio;
  const custoMaoObra = input.profissionais.reduce((acc, p) => {
    const valorHora = safeNumber(p.valorHora, custoHoraEscritorio * safeNumber(p.fator, 1));
    return acc + safeNumber(p.horas) * valorHora;
  }, 0);

  const custoDeslocamento = safeNumber(input.kmTotal) * safeNumber(config.custoKm, 1.65);
  const despesasDiretas = [
    input.custas,
    input.copiasDigitalizacoes,
    input.certidoes,
    input.diligenciasTerceiros,
    input.alimentacao,
    input.hospedagem,
    input.estacionamento,
    input.outrasDespesas,
  ].reduce((acc, v) => acc + safeNumber(v), 0) + custoDeslocamento;

  const custoEventos =
    safeNumber(input.audienciasConciliacao) * eventMinimums.audienciaConciliacao +
    safeNumber(input.audienciasInstrucao) * eventMinimums.audienciaInstrucao +
    safeNumber(input.audienciasCustodia) * eventMinimums.audienciaCustodia +
    safeNumber(input.idasDelegacia) * eventMinimums.idaDelegacia +
    safeNumber(input.idasTribunal) * eventMinimums.idaTribunal +
    (input.foraComarca ? eventMinimums.foraComarcaDiaria : 0);

  const serviceRef = oabMaReference[input.servico] ?? oabMaReference.consultoria;
  const baseOab = serviceRef.minimo;
  const pisoEtico = Math.max(baseOab, custoEventos * 0.65);

  const fatorComplexidade = 1 + (Math.max(1, safeNumber(input.complexidade, 3)) - 1) * 0.14;
  const fatorUrgencia = 1 + (Math.max(1, safeNumber(input.urgencia, 3)) - 1) * 0.13 + (input.plantao ? 0.18 : 0);
  const fatorRisco = (areaRisk[input.area] ?? 1.08) + (Math.max(1, safeNumber(input.risco, 3)) - 1) * 0.08;

  const impostos = safeNumber(config.impostosVariaveisPercentual) / 100;
  const reservaRisco = safeNumber(config.reservaRiscoPercentual) / 100;
  const margem = Math.min(0.75, Math.max(0.05, safeNumber(config.margemLucroDesejada, 35) / 100));

  const custoOperacional = custoHorasInternas + custoMaoObra + despesasDiretas + custoEventos;
  const custoComImpostosRisco = custoOperacional * (1 + impostos + reservaRisco);
  const precoPorCusto = custoComImpostosRisco / (1 - margem);
  const valorEconomico = safeNumber(input.valorCausa) * serviceRef.percentualExito * 0.35;
  const minimoTecnico = Math.max(pisoEtico, precoPorCusto, custoOperacional * 1.2);
  const recomendado = Math.max(minimoTecnico, (pisoEtico + precoPorCusto + valorEconomico) * 0.78) * fatorComplexidade * fatorUrgencia * fatorRisco;
  const premium = recomendado * 1.32;
  const entradaSugerida = Math.max(pisoEtico * 0.35, recomendado * 0.35);
  const honorarioExito = safeNumber(input.valorCausa) * serviceRef.percentualExito;
  const parcelasSugeridas = [3, 6, 10].map((qtd) => Number(((recomendado - entradaSugerida) / qtd).toFixed(2)));
  const margemRealEstimada = recomendado > 0 ? ((recomendado - custoComImpostosRisco) / recomendado) * 100 : 0;

  const alertas: string[] = [];
  if (recomendado < pisoEtico) alertas.push("Valor recomendado abaixo do piso ético de referência. Revise antes de enviar proposta.");
  if (margemRealEstimada < safeNumber(config.margemLucroDesejada) * 0.75) alertas.push("Margem estimada baixa para a complexidade do caso.");
  if (input.plantao || input.urgencia >= 5) alertas.push("Caso urgente/plantão: registrar adicional de disponibilidade e risco operacional.");
  if (input.foraComarca) alertas.push("Fora da comarca: conferir diária profissional, transporte, alimentação e hospedagem.");
  if (input.area === "criminal" && input.risco >= 4) alertas.push("Criminal de alto risco: prever acompanhamento posterior, recursos e custódia em proposta separada.");

  const breakdown = [
    { item: "Custo fixo mensal do escritório", valor: custoFixoMensal, observacao: "Base para calcular custo/hora real" },
    { item: "Custo/hora do escritório", valor: custoHoraEscritorio, observacao: `${horasProdutivas} horas produtivas/mês` },
    { item: "Horas internas alocadas", valor: custoHorasInternas, observacao: `${totalHorasInternas}h de trabalho/deslocamento` },
    { item: "Mão de obra por profissional", valor: custoMaoObra, observacao: "Advogados, estagiários e apoio" },
    { item: "Despesas diretas", valor: despesasDiretas, observacao: "Custas, certidões, gasolina, alimentação e terceiros" },
    { item: "Eventos jurídicos", valor: custoEventos, observacao: "Audiências, delegacia, tribunal e diária" },
    { item: "Piso OAB/referência", valor: pisoEtico, observacao: serviceRef.fonte },
    { item: "Custo operacional total", valor: custoOperacional, observacao: "Custo antes de impostos, risco e lucro" },
    { item: "Preço mínimo técnico", valor: minimoTecnico, observacao: "Maior entre custo, OAB e margem mínima" },
    { item: "Valor recomendado", valor: recomendado, observacao: "Aplicado complexidade, urgência e risco" },
  ];

  return {
    custoFixoMensal,
    custoHoraEscritorio,
    custoMaoObra,
    custoHorasInternas,
    custoDeslocamento,
    custoEventos,
    despesasDiretas,
    custoOperacional,
    baseOab,
    pisoEtico,
    fatorComplexidade,
    fatorUrgencia,
    fatorRisco,
    percentualExito: serviceRef.percentualExito,
    minimoTecnico,
    recomendado,
    premium,
    entradaSugerida,
    parcelasSugeridas,
    honorarioExito,
    margemRealEstimada,
    alertas,
    breakdown,
  };
}

export function pricingHtml(input: CasePricingInput, result: PricingResult) {
  const rows = result.breakdown.map((b) => `<tr><td>${b.item}</td><td>${money(b.valor)}</td><td>${b.observacao}</td></tr>`).join("");
  const alertas = result.alertas.length ? `<h2>Alertas técnicos</h2><ul>${result.alertas.map((a) => `<li>${a}</li>`).join("")}</ul>` : "";
  return `<div class="cards"><div class="card"><small>Serviço</small><b>${servicoLabels[input.servico]}</b></div><div class="card"><small>Custo/hora real</small><b>${money(result.custoHoraEscritorio)}</b></div><div class="card"><small>Recomendado</small><b>${money(result.recomendado)}</b></div><div class="card"><small>Premium</small><b>${money(result.premium)}</b></div></div><h2>Precificação jurídica completa</h2><table><thead><tr><th>Item</th><th>Valor</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table><h2>Proposta comercial sugerida</h2><table><tbody><tr><td>Valor mínimo técnico</td><td><b>${money(result.minimoTecnico)}</b></td></tr><tr><td>Valor recomendado</td><td><b>${money(result.recomendado)}</b></td></tr><tr><td>Valor premium</td><td><b>${money(result.premium)}</b></td></tr><tr><td>Entrada sugerida</td><td><b>${money(result.entradaSugerida)}</b></td></tr><tr><td>Parcelamento sugerido</td><td>${result.parcelasSugeridas.map((p, i) => `${[3, 6, 10][i]}x de ${money(p)}`).join(" · ")}</td></tr><tr><td>Honorário de êxito</td><td>${money(result.honorarioExito)}</td></tr><tr><td>Margem estimada</td><td>${result.margemRealEstimada.toFixed(1)}%</td></tr></tbody></table>${alertas}`;
}
