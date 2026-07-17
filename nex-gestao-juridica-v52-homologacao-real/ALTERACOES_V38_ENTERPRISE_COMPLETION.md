# Nex Gestão Jurídica v3.8 — Enterprise Completion Estrutural

Versão focada em transformar a v3.7 de uma camada parcialmente visual/estrutural para uma base mais funcional, conectada ao estado do aplicativo, ao repositório normalizado e à camada de permissões.

## Objetivo da versão

Aplicar os pontos pendentes do prompt Enterprise sem remover funcionalidades existentes, sem IA jurídica e mantendo compatibilidade com Vite, Supabase, modo demo/local e Vercel.

## Principais entregas estruturais

### 1. Entidades Enterprise conectadas ao app
Foram adicionadas ao `AppState`, ao repositório normalizado e às regras de acesso:

- organizações/escritórios;
- unidades/filiais;
- departamentos;
- equipes/células jurídicas;
- membros de equipe;
- templates e etapas de workflow;
- registros especializados por módulo jurídico;
- imóveis rurais;
- pastas documentais;
- versões de documentos;
- modelos documentais;
- contratos de honorários;
- custas/despesas processuais;
- jornadas de ponto;
- solicitações de ajuste de ponto;
- justificativas de ponto;
- notificações.

### 2. Multiempresa, unidades, departamentos e equipes
A tela Equipe agora permite gerir estrutura organizacional real:

- unidades/filiais;
- departamentos;
- equipes/células;
- membros por equipe;
- gestor/líder;
- perfil, cargo, unidade, departamento e permissões;
- jornada padrão por colaborador;
- promoção controlada a Admin Master com auditoria.

### 3. Módulos jurídicos especializados
A tela Módulos Jurídicos deixou de ser apenas catálogo visual e passou a permitir:

- cadastro de registro especializado por área;
- seleção de módulo jurídico;
- vínculo com processo e cliente;
- checklist por módulo;
- campos especializados;
- workflow por módulo;
- criação e edição de etapa de workflow;
- visualização de relatórios esperados por módulo.

### 4. Módulo Agrário/Rural reforçado
Foi criada tela funcional para cadastro de imóvel rural com campos exigidos no prompt:

- nome da propriedade;
- tipo;
- proprietário/possuidor;
- município, estado e localidade;
- área declarada, medida e registrada;
- matrícula e cartório;
- CAR, CCIR, ITR, CIB, NIRF, SIGEF e INCRA;
- coordenadas;
- memorial descritivo;
- mapa;
- confrontantes;
- reserva legal;
- APP;
- área produtiva;
- área de preservação;
- situação ambiental, tributária, registral e fundiária;
- pendências;
- protocolos;
- fotos, vídeos e laudos;
- ART/RRT;
- responsável técnico;
- geração de dossiê por impressão/PDF.

### 5. Ponto Corporativo mais auditável
O ponto foi reestruturado para ficar mais próximo de um app corporativo real:

- batida por PIN;
- sequência automática: entrada, almoço, retorno e saída final;
- justificativa quando fora da tolerância;
- justificativas salvas em entidade própria;
- ajustes salvos em entidade própria;
- aprovação, reprovação e abono sem alterar diretamente o registro original;
- registros de ponto tratados como imutáveis no painel;
- bloqueio de update/delete de ponto no access control;
- migration com trigger para bloquear exclusão direta de `time_records` no banco.

### 6. Portal do cliente corrigido
O cliente agora escolhe o processo antes de:

- enviar documentos;
- mandar mensagem;
- definir prioridade da mensagem.

Isso evita que documentos e mensagens sejam vinculados automaticamente ao primeiro processo do cliente.

### 7. Comunicação separada
Foram reforçados dois níveis:

- chat com cliente, com prioridade e marcação de resolvido;
- chat interno vinculado ao processo.

### 8. Clientes e processos expandidos
O cadastro de clientes foi ampliado com campos de pessoa física, pessoa jurídica e tipos especiais.

O cadastro de processos passou a contemplar melhor:

- processo judicial;
- processo administrativo;
- caso extrajudicial;
- campos judiciais, administrativos e extrajudiciais;
- área jurídica alinhada aos módulos especializados.

### 9. Documentos
O módulo documental agora inclui:

- pastas;
- etiquetas;
- modelos documentais;
- versionamento lógico;
- nível de acesso;
- liberação para cliente;
- status de validação.

### 10. Financeiro jurídico
Foram adicionadas entidades e telas para:

- contratos de honorários;
- tipos de honorários;
- parcelamentos;
- êxito;
- custas;
- guias;
- despesas por processo;
- baixa/aprovação;
- geração de lançamento financeiro a partir do contrato ou custo.

### 11. Dashboard e relatórios
O dashboard recebeu filtros executivos e mais indicadores.

Relatórios foram ampliados com:

- justificativas de ponto;
- ajustes pendentes;
- rentabilidade por cliente;
- dossiê rural;
- pendências rurais;
- relatórios executivos, financeiros, jurídicos e operacionais.

### 12. Automações sem IA
As regras de negócio foram ampliadas:

- mudança de etapa de processo cria tarefas automáticas conforme workflow;
- mudança de etapa gera notificação;
- mensagem do cliente gera tarefa e notificação para o advogado;
- alterações de ponto geram auditoria;
- regras continuam sem IA.

### 13. Migration Supabase v3.8
Arquivo criado:

`supabase/migrations/20260703_v38_enterprise_completion_structural.sql`

Inclui novas tabelas genéricas/payload, campos adicionais, políticas RLS e proteção de registros de ponto.

## Validação técnica executada

```bash
npm run check
npm run build
npm run audit
```

Resultado:

- TypeScript sem erros;
- build Vite concluído;
- npm audit sem vulnerabilidades altas.

## Observação técnica

A v3.8 entrega uma base Enterprise muito mais estrutural que a v3.7. Os módulos especializados foram implementados por meio de um motor universal de registros especializados, workflows e checklists, com CRUD completo destacado para o módulo Agrário/Rural. Essa abordagem evita duplicação de clientes, documentos, tarefas e financeiro, mantendo o Core Jurídico como base central da plataforma.
