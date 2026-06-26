# Análise sênior — Gestão Jurídica Nex

## Diagnóstico do produto

O sistema já possui uma base visual forte e módulos importantes: dashboard, CRM de clientes, processos, agenda, documentos, portal do cliente, funcionários, ponto, folha, relatórios e comunicação. A versão atual evoluiu bem como demonstração comercial, mas ainda precisa de uma separação clara entre funcionalidades de demonstração local e funcionalidades realmente persistidas em backend.

## Pontos fortes atuais

- Identidade visual premium NexLabs.
- Dashboard executivo com indicadores úteis.
- Portal do cliente com scanner por câmera, assinatura eletrônica e envio de documento.
- Documentos com revisão, protocolo, assinatura e relatórios.
- Funcionários com ponto, folha e desempenho operacional.
- Relatórios com exportação PDF/Excel em estética corporativa.
- Arquitetura React + Vite + TRPC + Drizzle, boa para MVP SaaS.

## Riscos técnicos identificados

1. Parte das novas funcionalidades roda em modo demo via localStorage, não em banco.
2. Backend ainda não possui rotas completas para folha, assinatura digital, protocolo documental e precificação avançada.
3. O controle de permissões ainda precisa ser aplicado de forma rígida por perfil.
4. O scanner melhora a imagem visualmente, mas ainda não possui OCR real, corte automático por bordas nem armazenamento em bucket de produção.
5. A assinatura atual é eletrônica simples com hash local; para produção precisa de trilha de auditoria, IP real, carimbo de data/hora e integração com assinatura digital/eletrônica válida.
6. O precificador antigo era simples demais para uso real por advogados.

## Melhorias aplicadas nesta versão

- Criado motor de precificação jurídica avançada em `client/src/lib/legalPricing.ts`.
- Substituído o módulo financeiro por um precificador robusto em `client/src/pages/Financeiro.tsx`.
- Incluído cálculo de custo/hora real do escritório com aluguel, energia, água, internet, sistemas, contador, marketing, folha, pró-labore, impostos e outros custos.
- Incluído cálculo por caso com área do direito, serviço, valor da causa, complexidade, urgência, risco, horas técnicas, horas administrativas, audiências, delegacia, tribunal, deslocamento, gasolina, custas, certidões, cópias, alimentação, hospedagem e terceiros.
- Incluída matriz inicial de referência OAB-MA e parâmetros editáveis por serviço.
- Criadas faixas de proposta: mínimo técnico, recomendado, premium, entrada, parcelamento e honorário de êxito.
- Adicionados alertas técnicos para plantão, fora da comarca, margem baixa e casos criminais de maior risco.
- Adicionadas tabelas de banco para configurações de precificação, serviços precificáveis e propostas de honorários em `drizzle/schema.ts` e `drizzle/0003_precificacao_juridica_avancada.sql`.

## Modelo de precificação recomendado

O preço sugerido deve ser composto por:

1. Custo real do escritório por hora.
2. Custo de mão de obra por profissional envolvido.
3. Despesas diretas do caso.
4. Eventos jurídicos: audiências, delegacia, tribunal, diligências e diária fora da comarca.
5. Piso ético de referência da OAB.
6. Fator de complexidade.
7. Fator de urgência e plantão.
8. Fator de risco da área jurídica.
9. Margem de lucro desejada.
10. Impostos variáveis.
11. Reserva de risco.
12. Honorário de êxito, quando aplicável.

## Próxima etapa técnica obrigatória

Para transformar o MVP em SaaS real, implementar no backend:

- CRUD de configurações de precificação.
- CRUD de serviços precificáveis.
- Geração e salvamento de proposta de honorários.
- PDF formal de proposta para cliente.
- Aprovação da proposta pelo cliente no portal.
- Conversão automática da proposta aprovada em contrato/honorário no financeiro.
- Relatório de rentabilidade por processo.
- Comparativo entre preço estimado e custo real após conclusão do processo.

## Diferencial comercial do Nex

O sistema passa a ter um diferencial que muitos sistemas jurídicos não oferecem de forma profunda: precificação baseada no custo real da operação do escritório. Isso torna o Nex útil não apenas para organizar processos, mas para ajudar o advogado a cobrar corretamente, evitar prejuízo e entender a rentabilidade de cada processo.
