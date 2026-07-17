# PROMPT DE CORREÇÃO E EVOLUÇÃO ROBUSTA — NEX GESTÃO JURÍDICA V4.9

Atue como um engenheiro de software sênior especializado em React, TypeScript, Supabase, PostgreSQL, segurança de aplicações SaaS, responsividade mobile, testes automatizados e arquitetura multiempresa.

Você deverá analisar e melhorar integralmente o projeto atual do **Nex Gestão Jurídica v4.9**, aplicando correções estruturais, seguras e compatíveis com a arquitetura existente.

O objetivo não é apenas realizar ajustes visuais ou superficiais. É necessário corrigir falhas reais de segurança, banco de dados, integrações, desempenho, experiência do usuário e responsividade, sem quebrar funcionalidades atualmente operacionais.

## REGRA PRINCIPAL

Não reescreva o sistema do zero.

Trabalhe sobre a estrutura atual, preservando:

* funcionalidades existentes;
* identidade visual;
* paleta de cores;
* organização geral dos módulos;
* rotas atuais;
* banco de dados existente;
* contratos de tipos;
* fluxos já utilizados;
* dados existentes no Supabase;
* funcionamento em desktop;
* modo de demonstração local, quando aplicável.

Toda mudança deve ser incremental, rastreável e compatível com versões anteriores.

Antes de remover, renomear ou alterar qualquer tabela, coluna, rota, função, componente, tipo, contexto ou serviço, pesquise todas as referências no projeto.

Não faça mudanças destrutivas sem implementar migração segura, compatibilidade temporária ou estratégia de transição.

---

# 1. FLUXO OBRIGATÓRIO DE IMPLEMENTAÇÃO

Execute o trabalho nesta ordem:

1. Mapear a estrutura atual.
2. Identificar dependências entre componentes, hooks, contextos, APIs, migrations e tabelas.
3. Criar uma lista interna de riscos de regressão.
4. Implementar as correções em pequenas etapas.
5. Validar cada etapa antes de continuar.
6. Criar testes para os fluxos críticos.
7. Executar TypeScript, lint, testes e build.
8. Corrigir todos os erros encontrados.
9. Validar desktop, tablet e mobile.
10. Entregar um relatório final com tudo que foi alterado.

Não aplique uma grande alteração única sem validação intermediária.

---

# 2. PRIORIDADE P0 — CORREÇÕES CRÍTICAS DE SEGURANÇA

## 2.1 Autenticação e autorização das APIs financeiras

Corrigir todos os endpoints relacionados a:

* Stripe Checkout;
* Stripe Billing Portal;
* assinatura;
* cobrança;
* criação de sessões;
* alteração de plano;
* pagamentos;
* webhooks financeiros.

Nenhuma API privilegiada pode confiar somente em dados enviados pelo frontend, como:

* `organizationId`;
* `customerId`;
* `stripeCustomerId`;
* `userId`;
* `profileId`.

Implementar obrigatoriamente:

* leitura da sessão autenticada no servidor;
* validação do JWT;
* identificação do usuário autenticado;
* obtenção da organização diretamente pelo perfil autenticado;
* validação da função e permissão do usuário;
* verificação de vínculo entre usuário, organização e cliente Stripe;
* rejeição de solicitações entre organizações diferentes;
* respostas seguras sem exposição de detalhes internos.

O backend deve ignorar identificadores privilegiados enviados pelo cliente quando eles puderem ser determinados pela sessão.

Somente usuários autorizados, como administrador da organização ou proprietário, poderão abrir o portal de cobrança ou alterar o plano.

Criar proteção contra IDOR, escalada horizontal de privilégio e acesso cruzado entre empresas.

## 2.2 Webhooks com falha segura

Corrigir os webhooks de:

* Stripe;
* pagamentos;
* Google Leads;
* automações;
* tarefas agendadas;
* cron jobs;
* integrações externas.

Atualmente, nenhum webhook deve continuar executando caso o segredo esperado não esteja configurado.

Aplicar o princípio **fail closed**:

* segredo ausente: bloquear;
* segredo inválido: bloquear;
* assinatura inválida: bloquear;
* corpo adulterado: bloquear;
* evento duplicado: não processar novamente;
* evento desconhecido: registrar e ignorar com segurança.

Implementar:

* validação obrigatória de assinatura;
* comparação segura de tokens;
* idempotência;
* tabela ou registro de eventos processados;
* logs sanitizados;
* tratamento de repetição automática;
* limitação de taxa quando aplicável;
* status HTTP coerentes.

Não registrar em logs:

* tokens;
* segredos;
* senhas;
* documentos completos;
* dados financeiros sensíveis;
* cabeçalhos de autenticação.

## 2.3 Portal do cliente seguro

Refatorar o portal público para eliminar acesso por dados previsíveis ou apenas pelo UUID do cliente.

Não permitir autenticação somente por:

* nome completo;
* CPF;
* UUID do cliente;
* parâmetros de URL;
* dados retornados pelo frontend.

Revogar imediatamente permissões anônimas inseguras das funções RPC antigas.

Localizar todas as funções públicas antigas relacionadas ao portal e:

* revogar `execute` do perfil `anon`;
* substituir chamadas inseguras;
* preservar compatibilidade apenas quando estritamente necessário;
* remover caminhos alternativos de acesso não autenticado.

Implementar uma sessão segura para o portal do cliente usando uma das estratégias adequadas:

* autenticação Supabase com usuário próprio;
* link mágico;
* código temporário de uso único;
* token assinado de curta duração;
* OTP enviado por canal verificado.

Após autenticação, todas as operações deverão validar a sessão do portal no servidor.

Proteger:

* consulta de processos;
* documentos;
* mensagens;
* propostas;
* cobranças;
* aprovação de proposta;
* upload de arquivos;
* lançamentos financeiros;
* histórico do cliente.

O cliente só poderá consultar ou alterar registros vinculados ao próprio cadastro e à própria organização.

Não confiar em `client_id` informado diretamente pelo navegador.

## 2.4 Storage e upload de documentos

Remover políticas que permitam upload anônimo irrestrito no bucket de documentos.

Criar políticas de Storage com isolamento por organização e usuário.

Estruturar os caminhos, por exemplo:

```text
organization_id/client_id/document_id/arquivo.ext
```

ou outra estrutura segura compatível com o projeto.

Validar:

* usuário autenticado;
* organização;
* cliente;
* processo;
* tipo do documento;
* tamanho máximo;
* extensão;
* MIME type;
* nome seguro do arquivo;
* duplicidade;
* permissão de leitura;
* permissão de exclusão.

Não usar somente o nome do bucket como critério de autorização.

Implementar upload assinado ou fluxo mediado pelo backend quando necessário.

Bloquear:

* arquivos executáveis;
* HTML potencialmente perigoso;
* extensões incompatíveis;
* arquivos sem limite;
* substituição não autorizada;
* acesso cruzado entre empresas.

---

# 3. PRIORIDADE P0 — BANCO DE DADOS E MIGRATIONS

## 3.1 Corrigir a migration v4.9

Existe uma inconsistência entre:

```sql
public.finances
```

e a tabela realmente utilizada:

```sql
public.financial_entries
```

Revisar todas as migrations e identificar qual tabela é a fonte correta.

Aplicar a correção em uma nova migration incremental. Não editar migrations já aplicadas em produção, exceto quando o projeto comprovadamente ainda não foi publicado.

A nova migration deve:

* verificar existência das tabelas e colunas;
* adicionar apenas campos ausentes;
* não apagar dados;
* não recriar tabelas com `drop`;
* não duplicar índices;
* não duplicar constraints;
* ser idempotente quando possível;
* ter rollback documentado;
* manter compatibilidade com o frontend atual.

Após a migration, atualizar:

* tipos TypeScript;
* consultas;
* serviços;
* validações;
* formulários;
* relatórios;
* exports;
* filtros.

## 3.2 Revisar todas as migrations

Executar uma auditoria completa das migrations em ordem cronológica.

Verificar:

* dependência de funções ainda não criadas;
* tabelas referenciadas antes da criação;
* políticas RLS duplicadas;
* permissões excessivas;
* grants para `anon`;
* grants para `authenticated`;
* funções `security definer`;
* ausência de `search_path` seguro;
* índices ausentes;
* foreign keys incorretas;
* campos obrigatórios sem valor padrão;
* migrations que falham em banco vazio;
* migrations que falham em banco já parcialmente atualizado.

Criar um processo seguro para testar:

1. banco totalmente vazio;
2. banco com versão anterior;
3. banco com dados existentes;
4. duas organizações diferentes;
5. usuários com perfis diferentes.

Nenhuma migration pode depender de execução manual fora da ordem documentada.

## 3.3 RLS multiempresa

Revisar todas as tabelas que possuem `organization_id`.

Criar ou corrigir políticas RLS para garantir:

* usuário somente enxerga sua organização;
* cliente do portal somente enxerga seus registros;
* funcionário não acessa recursos administrativos sem permissão;
* administrador não acessa outra organização;
* service role é usada somente no backend;
* nenhuma consulta depende apenas de filtros do frontend.

Criar testes de isolamento entre pelo menos duas organizações.

Os testes devem confirmar que um usuário da Organização A não consegue:

* consultar;
* inserir;
* atualizar;
* excluir;
* baixar arquivos;
* enviar mensagens;
* alterar finanças;
* visualizar clientes;

da Organização B.

---

# 4. INTEGRAÇÃO REAL DAS FUNCIONALIDADES V4.9

## 4.1 Agenda integrada

A tabela `scheduled_events` deve ser analisada e integrada corretamente, sem quebrar a agenda atual.

Definir claramente a fonte de verdade da agenda.

Evitar manter dois sistemas concorrentes sem sincronização.

A agenda deve integrar, de maneira consistente:

* audiências;
* reuniões;
* tarefas;
* prazos;
* compromissos;
* pagamentos;
* eventos manuais;
* Google Calendar, quando configurado.

Escolher uma estratégia segura:

### Estratégia recomendada

Utilizar `scheduled_events` como camada unificada de agenda, mantendo referência ao registro de origem:

* `source_type`;
* `source_id`;
* `organization_id`;
* `start_at`;
* `end_at`;
* `status`;
* `title`;
* `description`;
* `responsible_id`;
* `client_id`;
* `process_id`.

Criar sincronização sem duplicidade.

Não excluir as tabelas atuais.

Impedir que o mesmo evento apareça várias vezes.

Permitir rastrear se o evento veio de:

* audiência;
* tarefa;
* prazo;
* financeiro;
* reunião;
* criação manual;
* Google Calendar.

## 4.2 Fontes de leads

Integrar a tabela `crm_lead_sources` ao CRM.

Permitir:

* cadastrar fontes;
* ativar e desativar;
* definir fonte padrão;
* associar lead à fonte;
* filtrar por fonte;
* mostrar conversão por fonte;
* exibir desempenho por origem;
* registrar origem automática de integrações;
* impedir exclusão de fonte já utilizada, preferindo inativação.

O teste de Google Leads não pode apenas criar um lead fictício.

Criar um teste real e seguro da integração, distinguindo:

* teste de configuração;
* simulação local;
* recebimento real por webhook.

Exibir claramente quando o sistema estiver em modo de demonstração.

---

# 5. DESEMPENHO E ARQUITETURA DE CARREGAMENTO

Atualmente, o sistema não deve carregar dezenas de entidades completas logo na inicialização.

Refatorar o carregamento de dados para ocorrer por módulo e necessidade.

Implementar:

* lazy loading de páginas;
* code splitting por rota;
* carregamento assíncrono dos módulos;
* paginação real;
* filtros no banco;
* busca server-side;
* cache controlado;
* invalidação de cache;
* estados de loading;
* tratamento de erro;
* retry apenas quando apropriado;
* cancelamento de requisições obsoletas;
* consultas paralelas quando não houver dependência;
* consultas sequenciais somente quando necessário.

Remover limites fixos silenciosos como `700 registros` sem paginação visível.

A interface deve mostrar:

* total de registros;
* página atual;
* quantidade por página;
* filtros ativos;
* carregamento;
* ausência de resultados;
* erro de consulta.

Evitar carregar dados de módulos que o usuário ainda não abriu.

## 5.1 Bundle e carregamento inicial

Reduzir o bundle principal.

Aplicar:

* `React.lazy`;
* `Suspense`;
* importações dinâmicas;
* divisão por rota;
* carregamento sob demanda de bibliotecas pesadas;
* carregamento sob demanda de gráficos;
* carregamento sob demanda de geração de PDF e Excel.

Não quebrar a navegação atual.

Criar fallbacks visuais consistentes com a identidade do sistema.

---

# 6. MOBILE-FIRST E RESPONSIVIDADE ROBUSTA

A experiência mobile é prioridade máxima.

O sistema não deve apenas “caber” na tela. Ele precisa ser realmente utilizável em celulares.

Testar pelo menos nestas larguras:

* 320px;
* 360px;
* 375px;
* 390px;
* 414px;
* 768px;
* 1024px;
* desktop acima de 1280px.

## 6.1 Estrutura geral no mobile

Implementar:

* sidebar recolhível;
* menu em drawer;
* fechamento do menu após navegação;
* overlay correto;
* bloqueio de scroll do fundo;
* header compacto;
* áreas clicáveis com tamanho adequado;
* espaçamento consistente;
* suporte à área segura do celular;
* ausência de rolagem horizontal global;
* conteúdo sem ficar escondido atrás de barras fixas.

Todos os elementos interativos devem ter área de toque adequada, preferencialmente de pelo menos 44px.

## 6.2 Tabelas

Nenhuma tabela complexa deve ser simplesmente comprimida até ficar ilegível.

Aplicar conforme o contexto:

* cards responsivos;
* linhas expansíveis;
* colunas prioritárias;
* menu de ações;
* scroll horizontal apenas dentro do componente;
* cabeçalho fixo quando útil;
* filtros em drawer ou accordion;
* paginação adaptada.

Não permitir que botões fiquem fora da tela.

## 6.3 CRM e Kanban

No mobile, o CRM deve continuar utilizável.

Implementar uma abordagem adaptada:

* seleção de etapa por abas;
* uma coluna por vez;
* navegação horizontal controlada;
* cards com informações essenciais;
* ações em menu;
* drag-and-drop apenas quando confiável no toque;
* alternativa por seletor de etapa.

Não depender exclusivamente de arrastar cards.

## 6.4 Agenda

No celular, oferecer visualizações adequadas:

* lista diária;
* lista semanal;
* próximos compromissos;
* calendário compacto;
* filtros acessíveis.

Não obrigar o usuário a manipular uma grade desktop reduzida.

## 6.5 Formulários e modais

Todos os formulários devem funcionar com teclado virtual aberto.

Corrigir:

* campos escondidos;
* botões inacessíveis;
* modal maior que a tela;
* rolagem dupla;
* select cortado;
* calendário fora do viewport;
* mensagens de validação sobrepostas;
* perda de dados ao fechar;
* foco incorreto.

Modais grandes devem virar tela completa ou bottom sheet no mobile.

Substituir usos de:

* `window.prompt`;
* `window.confirm`;
* `window.alert`;

por componentes internos acessíveis e responsivos.

## 6.6 Gráficos e dashboards

Adaptar os dashboards para:

* uma coluna em telas pequenas;
* duas colunas em tablets quando houver espaço;
* textos legíveis;
* gráficos com altura adequada;
* legendas reorganizadas;
* tooltips acessíveis;
* números sem corte;
* cards com prioridade visual.

Gráficos muito complexos devem ter versão resumida no mobile.

## 6.7 Portal do cliente

O portal deve ser especialmente simples no celular.

Priorizar:

* login claro;
* processos recentes;
* próximos prazos;
* propostas pendentes;
* cobranças;
* documentos;
* comunicação.

Evitar menus extensos e informações excessivas na mesma tela.

---

# 7. UX E INTERFACE

Preservar a identidade atual, mas melhorar clareza e consistência.

## 7.1 Busca global

Implementar busca global real, respeitando permissões e organização.

A busca poderá localizar:

* clientes;
* processos;
* leads;
* tarefas;
* documentos;
* compromissos.

Não consultar dados de outras organizações.

Aplicar debounce e limite de resultados.

## 7.2 Notificações

Conectar o ícone de notificações a dados reais.

Criar:

* central de notificações;
* lidas e não lidas;
* filtros;
* link para o registro relacionado;
* contador;
* marcação individual;
* marcar todas como lidas;
* atualização sem recarregar a página.

Não exibir um sino decorativo sem função.

## 7.3 Feedback das ações

Toda ação deve informar claramente:

* carregamento;
* sucesso;
* falha;
* necessidade de confirmação;
* ação bloqueada;
* falta de permissão;
* dados inválidos.

Não fechar modal de cadastro antes de confirmar o salvamento.

Não exibir sucesso quando o backend falhar.

## 7.4 Estados vazios

Criar estados vazios úteis e específicos por módulo.

Cada estado vazio deve informar:

* o que ainda não existe;
* como criar;
* qual ação executar;
* quando a ausência é resultado de filtros.

## 7.5 Exportações

Não utilizar somente `window.print` como exportação.

Criar exportações reais, conforme o módulo:

* PDF;
* Excel;
* CSV;
* impressão formatada.

Os arquivos devem conter:

* nome da empresa;
* período;
* filtros aplicados;
* data de emissão;
* totais;
* cabeçalhos;
* paginação;
* identificação do relatório.

---

# 8. TESTES AUTOMATIZADOS

Criar uma estrutura real de testes.

O comando `test:logic` não pode ser apenas um alias para TypeScript.

Implementar pelo menos:

## 8.1 Testes unitários

Testar:

* cálculos financeiros;
* regras de permissão;
* conversão de lead;
* transformação de dados;
* datas e prazos;
* validações;
* formatação;
* regras de ponto;
* filtros.

## 8.2 Testes de integração

Testar:

* login;
* sessão;
* criação de cliente;
* criação de processo;
* conversão de lead;
* criação de lançamento financeiro;
* aprovação de proposta;
* portal do cliente;
* upload;
* webhooks;
* isolamento por organização.

## 8.3 Testes E2E

Criar testes para os fluxos principais:

1. login administrativo;
2. navegação pelo dashboard;
3. cadastro de lead;
4. conversão em cliente;
5. criação de processo;
6. criação de tarefa e compromisso;
7. lançamento financeiro;
8. registro de ponto;
9. acesso ao portal;
10. upload e consulta de documento;
11. comportamento mobile.

Executar os testes E2E em viewport de desktop e celular.

## 8.4 Testes de segurança

Criar testes para confirmar que:

* usuário sem sessão não acessa APIs privadas;
* usuário de uma organização não acessa outra;
* portal não aceita token inválido;
* webhook sem segredo é rejeitado;
* evento repetido não duplica cobrança;
* upload fora do diretório permitido é bloqueado;
* perfil comum não executa ação de administrador.

---

# 9. TRATAMENTO DE ERROS E OBSERVABILIDADE

Criar um padrão centralizado para erros.

Implementar:

* error boundary;
* mensagens amigáveis;
* códigos de erro internos;
* logs estruturados;
* diferenciação entre erro de validação, rede, banco e permissão;
* página de erro;
* botão para tentar novamente;
* fallback quando uma integração externa estiver indisponível.

Nunca exibir diretamente ao usuário:

* stack trace;
* SQL;
* segredo;
* token;
* detalhes de infraestrutura;
* resposta bruta do Supabase ou Stripe.

Registrar auditoria para ações críticas:

* login;
* alteração de permissões;
* aprovação de proposta;
* mudança financeira;
* exclusão;
* upload;
* alteração de plano;
* acesso administrativo ao portal;
* alteração de dados sensíveis.

---

# 10. REGRAS PARA NÃO QUEBRAR O SISTEMA

Durante toda a implementação:

* não remover campos usados;
* não renomear tabelas sem compatibilidade;
* não apagar migrations antigas;
* não executar `drop table` em tabelas de produção;
* não substituir todas as APIs de uma vez;
* não alterar a autenticação sem preservar sessões existentes;
* não alterar a identidade visual principal;
* não modificar rotas públicas sem redirecionamento;
* não alterar tipos compartilhados sem atualizar os consumidores;
* não introduzir bibliotecas desnecessárias;
* não trocar a stack atual;
* não transformar funcionalidades reais em mocks;
* não deixar TODOs em fluxos críticos;
* não ocultar erros usando `try/catch` vazio;
* não usar `any` para contornar problemas de TypeScript;
* não desabilitar RLS para fazer uma consulta funcionar;
* não usar service role no navegador;
* não expor variáveis privadas no bundle;
* não incluir chaves secretas com prefixos públicos.

Sempre manter um fallback seguro.

Quando uma integração externa não estiver configurada, o sistema deve:

* informar claramente que está indisponível;
* não simular sucesso;
* não quebrar o restante da aplicação;
* não executar ações incompletas.

---

# 11. VALIDAÇÃO OBRIGATÓRIA ANTES DA ENTREGA

Ao finalizar, executar e corrigir completamente:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Caso algum script ainda não exista, criá-lo adequadamente no `package.json`.

Também executar:

* auditoria de dependências;
* busca por secrets expostos;
* busca por `service_role` no frontend;
* busca por `window.prompt`;
* busca por políticas `anon`;
* busca por APIs sem autenticação;
* busca por limites fixos de consultas;
* busca por `any`;
* busca por logs sensíveis;
* teste de migrations em banco limpo;
* teste de migrations sobre versão anterior.

O build final deve terminar sem erros.

O TypeScript não pode ter erros ignorados.

Não usar `@ts-ignore` ou `eslint-disable` indiscriminadamente para obter build verde.

---

# 12. CHECKLIST DE ACEITAÇÃO MOBILE

A entrega só será considerada concluída quando:

* não existir scroll horizontal global;
* menu funcionar corretamente em 320px;
* nenhum botão ficar fora do viewport;
* modais forem utilizáveis com teclado aberto;
* tabelas tiverem representação mobile;
* CRM puder ser utilizado por toque;
* agenda tiver modo mobile;
* dashboard continuar legível;
* portal do cliente funcionar bem no celular;
* formulários não perderem dados;
* campos não ficarem encobertos;
* botões principais tiverem área de toque adequada;
* filtros puderem ser abertos e fechados;
* conteúdo não ficar atrás do header;
* cards não tiverem texto cortado;
* gráficos não ultrapassarem o container;
* carregamentos não bloquearem toda a aplicação sem necessidade.

---

# 13. CHECKLIST DE ACEITAÇÃO DE SEGURANÇA

Confirmar que:

* Stripe Checkout exige usuário autenticado e autorizado;
* Billing Portal não aceita `customerId` arbitrário;
* webhooks bloqueiam execução sem segredo;
* webhooks possuem idempotência;
* RPCs antigas inseguras foram revogadas;
* portal utiliza sessão ou token seguro;
* UUID isolado não permite acesso;
* Storage está isolado por organização;
* uploads anônimos irrestritos foram eliminados;
* RLS está ativa nas tabelas necessárias;
* service role não aparece no frontend;
* logs não contêm informações sensíveis;
* duas organizações estão completamente isoladas.

---

# 14. ENTREGÁVEIS

Ao final, entregar:

1. Projeto completo corrigido.
2. Novas migrations incrementais.
3. Testes automatizados.
4. Relatório de arquivos alterados.
5. Relatório de riscos corrigidos.
6. Lista de eventuais pendências.
7. Instruções de configuração das variáveis de ambiente.
8. Instruções para executar migrations.
9. Instruções de rollback.
10. Resultado dos comandos de validação.
11. Comparação antes e depois.
12. Capturas ou prévias das principais telas em desktop e mobile.

No relatório final, classificar cada item como:

* corrigido;
* melhorado;
* parcialmente implementado;
* dependente de configuração externa;
* não aplicável.

Não afirmar que uma funcionalidade está pronta sem validar o fluxo real.

---

# 15. ORDEM DE EXECUÇÃO RECOMENDADA

Execute as alterações em etapas:

## Etapa 1 — Estabilização

* corrigir migrations;
* validar tipos;
* corrigir erros silenciosos;
* preservar funcionamento atual;
* criar testes mínimos de regressão.

## Etapa 2 — Segurança P0

* APIs financeiras;
* webhooks;
* portal;
* Storage;
* RLS;
* isolamento multiempresa.

## Etapa 3 — Arquitetura e desempenho

* lazy loading;
* paginação;
* consultas por módulo;
* bundle;
* cache;
* tratamento de erros.

## Etapa 4 — Integrações v4.9

* agenda unificada;
* fontes de leads;
* Google Leads;
* Stripe;
* notificações.

## Etapa 5 — Mobile-first

* navegação;
* tabelas;
* CRM;
* agenda;
* formulários;
* modais;
* dashboards;
* portal.

## Etapa 6 — Testes e homologação

* unitários;
* integração;
* E2E;
* segurança;
* desktop;
* tablet;
* celular;
* build final.

---

# RESULTADO ESPERADO

O resultado deve ser uma nova versão do Nex Gestão Jurídica que seja:

* segura;
* estável;
* escalável;
* realmente multiempresa;
* responsiva;
* utilizável no celular;
* compatível com desktop;
* protegida contra acesso cruzado;
* preparada para produção;
* sem regressões;
* com banco consistente;
* com integrações confiáveis;
* com testes automatizados;
* com melhor desempenho;
* visualmente refinada;
* estruturalmente profissional.

Não entregue apenas alterações cosméticas.

Não considere o trabalho concluído enquanto existirem erros de build, falhas críticas de segurança, migrations inconsistentes ou telas principais inutilizáveis no mobile.
