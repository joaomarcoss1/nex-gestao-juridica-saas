# Alterações aplicadas — Nex Gestão Jurídica v5.0

## Segurança P0 — corrigido

- Sessão/JWT obrigatórios nas APIs de Checkout e Billing Portal.
- Organização derivada do perfil autenticado; acesso cruzado bloqueado.
- Cliente Stripe obtido no backend, sem confiar em `customerId` do navegador.
- Webhooks bloqueados quando o segredo está ausente ou inválido.
- Stripe com validação de assinatura e janela temporal.
- Idempotência persistida em `payment_events`, com retry de eventos interrompidos.
- Respostas de erro sanitizadas e payloads limitados.
- Portal por link mágico e resposta genérica contra enumeração.
- `redirectTo` do navegador ignorado; URL pública derivada do servidor.
- RPCs antigas por nome/CPF/UUID revogadas para `anon` e `authenticated`.
- RPCs v2 derivam `client_id` e `organization_id` da sessão.
- Storage anônimo fechado e políticas por organização/cliente.
- Validação de PDF/JPEG/PNG e limite de 10 MB.

## Banco e multiempresa — corrigido/melhorado

- Nova migration incremental `20260713_v50_producao_segura_mobile.sql`.
- Correção da migration v4.9 para `public.financial_entries`.
- Nenhum `drop table` ou remoção de coluna.
- RLS ativada/reforçada em tabelas operacionais.
- Políticas restritivas específicas para clientes.
- Bloqueio de módulos internos para o perfil cliente.
- Rate limit distribuído por hash, sem guardar e-mail/IP em texto puro.
- Índices de idempotência, agenda, fontes e perfis.
- Guia de rollback não destrutivo.

## Agenda e CRM — melhorado

- `scheduled_events` integrado à interface.
- Eventos manuais e origem rastreável por `source_type/source_id`.
- Triggers para audiências, tarefas e financeiro.
- Índice exclusivo evita duplicidade.
- Backfill incremental dos registros existentes.
- `crm_lead_sources` integrado ao CRM.
- Fonte padrão, ativação/inativação, campanha e responsável.
- Google Leads com webhook real, organização autorizada e evento idempotente.
- Simulação local identificada como demonstração, sem falso positivo de produção.

## Desempenho — melhorado

- Rotas carregadas com `React.lazy` e `Suspense`.
- Bundle principal reduzido e módulos separados em chunks.
- Repositório normalizado com leituras paginadas em lotes e consultas paralelas.
- Removido limite silencioso de 700 registros.
- Bibliotecas e páginas pesadas carregadas sob demanda.

## Mobile e UX — melhorado

- Drawer com overlay, bloqueio de scroll e fechamento após navegação.
- Header e busca global adaptados ao celular.
- Áreas de toque de pelo menos 44 px nos controles principais.
- Tabelas com rótulos por linha e scroll restrito ao componente.
- CRM por uma etapa de cada vez no mobile, sem depender apenas de arrastar.
- Agenda em lista cronológica no celular.
- Modais responsivos e campos compatíveis com teclado virtual.
- `window.prompt`, `window.confirm` e `window.alert` substituídos por diálogos internos.
- Exportação CSV real por módulo.
- Central de notificações com leitura e links internos.
- Busca global respeitando permissões.

## Qualidade e GitHub — corrigido/melhorado

- TypeScript sem erros.
- Verificação estática para segredos, caixas nativas, limites legados e supressões TypeScript.
- 8 testes unitários.
- 6 testes de contratos de integração/segurança.
- 4 cenários E2E em desktop e 360 px.
- Workflow de CI para GitHub Actions.
- `.env.example`, README, deploy, segurança e validação atualizados.

## Dependências externas — dependente de configuração

- Supabase Auth, banco, RLS e Storage reais.
- Envio de link mágico por e-mail.
- Stripe Checkout, Billing Portal e webhook.
- Google Leads e provedores de pagamento.
- Cron da Vercel.

Esses itens possuem código e contratos preparados, mas exigem credenciais e homologação no ambiente do proprietário.
