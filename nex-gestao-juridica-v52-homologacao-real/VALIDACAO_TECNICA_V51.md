# Validação técnica — Nex Gestão Jurídica v5.1

Data da validação: 14/07/2026.

## Resultado local

| Validação | Resultado |
|---|---|
| Instalação limpa com `npm ci` | aprovada |
| `npm run typecheck` | aprovado |
| `npm run lint` | aprovado |
| Testes unitários | 27 aprovados |
| Testes estruturais/integração | 19 aprovados |
| Testes E2E | 3 aprovados |
| Viewports E2E | 1440, 320, 360, 390, 414 e 768 px |
| Build Vite | aprovado |
| Módulos transformados | 2.329 |
| `npm audit --audit-level=high` | 0 vulnerabilidades encontradas |
| Overflow horizontal global | não encontrado nos fluxos testados |

## Regras cobertas

- Distribuição exata de centavos em parcelas.
- Datas mensais e dias úteis.
- Pagamento parcial, pagamento total, excesso e repetição.
- Conversão do CRM idempotente e rollback local.
- Aplicação única de workflow e bloqueios de etapa.
- Horas trabalhadas sem copiar horas estimadas.
- Contratos, custas e folha sem duplicar lançamento em edição.
- Normalização, deduplicação e conflito de agenda.
- Sincronização entre reunião, evento e tarefa.
- Contratos de RLS, `security definer`, `search_path` e ausência de `DROP TABLE` nas migrations v5.1.
- Navegação de CRM, Processos, Tarefas, Financeiro e Agenda em desktop e mobile.

## Build

O build foi dividido em chunks por página. Os maiores chunks observados foram:

- bundle principal: aproximadamente 584 kB antes de gzip;
- Dashboard: aproximadamente 402 kB antes de gzip;
- CSS principal: aproximadamente 118 kB antes de gzip.

O code splitting está ativo. O Dashboard ainda concentra gráficos e é o principal candidato a otimização futura.

## Limitações da validação

Não havia neste ambiente:

- credenciais de um Supabase de homologação;
- Supabase CLI local;
- PostgreSQL local;
- Docker;
- credenciais Stripe, Google Calendar, Google Leads ou SMTP.

Por isso, as migrations e RPCs foram validadas por contratos automatizados e revisão estática, mas precisam ser executadas em um projeto Supabase de homologação antes de produção. As integrações externas também dependem de teste com as credenciais reais do proprietário.

## Conclusão

O código entregue foi reinstalado em uma pasta limpa, sem `node_modules` ou `dist`, e passou nas validações locais disponíveis. Isso reduz significativamente o risco de regressão, mas não constitui garantia absoluta de ausência de falhas em infraestrutura externa ou dados de produção. Use backup, homologação, logs e rollout gradual.
