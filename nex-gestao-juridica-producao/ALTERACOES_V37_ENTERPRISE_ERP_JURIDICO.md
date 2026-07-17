# Nex Gestão Jurídica v3.7 — Enterprise ERP Jurídico

Esta versão aplica o prompt **Nex Gestão Jurídica Enterprise** de forma incremental e segura, sem remover funcionalidades anteriores.

## Principais melhorias aplicadas

### 1. Arquitetura ERP jurídico
- Separação conceitual entre **Core Jurídico** e **Módulos Especializados**.
- Novo menu mais alinhado a grandes escritórios: Dashboard, CRM, Clientes, Processos, Tarefas, Prazos, Agenda, Documentos, Financeiro, Precificação, Portal do Cliente, Comunicação, Ponto Corporativo, Relatórios, Equipe, Módulos Jurídicos, Folha, Automações, Auditoria, Integrações e Configurações.
- Nenhuma funcionalidade de IA foi adicionada.

### 2. CRM jurídico
- Nova tela `/crm` com funil completo: Novo lead, Primeiro contato, Triagem, Documentos solicitados, Análise jurídica, Proposta enviada, Negociação, Contrato enviado, Cliente convertido e Perdido.
- Cadastro de origem, área, tipo de demanda, valor estimado, responsável, próxima ação e observações.
- Conversão de lead em **cliente + caso/processo + tarefa de triagem** sem duplicar o Core.

### 3. Agenda e prazos
- Nova tela `/agenda` para prazos, tarefas, audiências e compromissos.
- Indicadores de compromissos da semana, prazos fatais, audiências e tarefas em aberto.

### 4. Ponto Corporativo
- Tela de ponto reestruturada para uso corporativo em escritório grande.
- Registro com **PIN individual protegido por hash**.
- Sequência automática: Entrada → Saída almoço → Retorno almoço → Encerrar expediente.
- Jornada prevista por colaborador, tolerância de atraso, justificativa obrigatória fora da tolerância.
- Solicitação de ajuste sem alterar o registro original.
- Painel Admin/RH com presentes, em almoço, encerrados, ausentes e ajustes pendentes.
- Aprovação, reprovação e abono de ajustes.
- Exportação CSV do espelho de ponto.

### 5. Equipe, hierarquia e RBAC
- Nova tela `/equipe` com matriz de perfis: Admin Master, Sócio/Diretor, Coordenador, Advogado, Estagiário/Assistente, Financeiro, Administrativo/RH e Cliente.
- Acompanhamento de desempenho individual, carga de trabalho, atrasos, presença e score.
- Mantida regra de Admin Master com acesso total e permissão exclusiva para promoção de outro Admin Master.

### 6. Módulos especializados por área do Direito
- Nova tela `/modulos` com 14 áreas jurídicas:
  - Civil
  - Família e Sucessões
  - Previdenciário
  - Trabalhista
  - Empresarial
  - Tributário
  - Penal
  - Administrativo
  - Consumidor
  - Imobiliário
  - Agrário/Rural
  - Médico/Saúde
  - Digital/LGPD
  - Ambiental
- Cada módulo possui objetivo, serviços, campos próprios, checklist, workflow e relatórios.
- Módulo **Agrário/Rural** recebeu modelo completo para propriedade rural: CCIR, CAR, ITR, CIB, NIRF, SIGEF, INCRA, matrícula, memorial, mapa, confrontantes, APP, reserva legal, pendências, protocolos e responsável técnico.

### 7. Relatórios executivos
- Relatórios ampliados com ponto, ajustes pendentes e tempo de resposta ao cliente.
- Catálogo enterprise de relatórios jurídicos, financeiros, operacionais, ponto, frequência e produtividade.

### 8. Supabase
- Criada migração incremental:
  `supabase/migrations/20260702_v37_enterprise_erp_juridico.sql`
- Novas estruturas preparadas:
  - `units`
  - `departments`
  - `teams`
  - `team_members`
  - `workflow_templates`
  - `workflow_steps`
  - `legal_modules`
  - `process_modules`
  - `rural_properties`
  - `module_specialized_data`
  - `point_schedules`
  - `point_adjustment_requests`
  - `point_justifications`
- Alterações incrementais em usuários, colaboradores, leads, processos, tarefas, mensagens, ponto e auditoria.
- RLS incremental para novas tabelas isoladas por organização.

## Validação técnica

Executado com sucesso:

```bash
npm run check
npm run build
npm run audit
```

Resultado:
- TypeScript sem erros.
- Build Vite concluído.
- `npm audit --audit-level=high` com 0 vulnerabilidades altas.

## Deploy Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist/public`

## Observação operacional

A versão v3.7 implementa a camada funcional e estrutural Enterprise dentro da base atual. Para produção Supabase real, execute as migrações na ordem, começando pelo `schema.sql`, depois `rls.sql`, a migração v3.6 e por fim a migração v3.7.
