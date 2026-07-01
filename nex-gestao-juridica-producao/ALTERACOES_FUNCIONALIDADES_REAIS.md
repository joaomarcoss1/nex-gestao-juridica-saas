# Nex Gestão Jurídica — Funcionalidades reforçadas nesta versão

Esta versão reforça a camada funcional do app para reduzir telas meramente demonstrativas e tornar os fluxos principais executáveis em ambiente local e preparados para Supabase/Vercel.

## Scanner / Portal do Cliente

Implementado fluxo funcional no Portal do Cliente:

- captura por câmera ou seleção de imagem com `input type=file` e `capture=environment`;
- processamento em canvas no navegador;
- modos de tratamento: colorido, contraste automático e preto/branco;
- geração de prévia real da imagem;
- cálculo de hash SHA-256 do arquivo original;
- download da imagem tratada;
- geração de PDF via impressão do navegador;
- salvamento do documento no estado do sistema;
- vínculo com cliente e processo;
- criação automática de tarefa de conferência para a controladoria;
- registro de execução nas Automações Internas;
- tentativa de upload para Supabase Storage quando as variáveis estiverem configuradas;
- logs de auditoria para upload de documento.

## Ponto eletrônico

Reforçado fluxo operacional do ponto:

- PIN continua sem ser armazenado como campo de texto puro no estado ativo;
- validação de sequência obrigatória: entrada → saída intervalo → retorno intervalo → saída final;
- bloqueio de duplicidade ou batida fora de ordem;
- justificativa obrigatória quando fora da tolerância;
- log de auditoria e registro de automação ao bater ponto.

## Supabase e segurança

Ajustes aplicados:

- serviço de auditoria corrigido para gravar em `audit_logs`, compatível com o schema;
- schema expandido para metadados de documentos digitalizados;
- bucket privado `documentos` criado no SQL;
- políticas iniciais de Storage adicionadas em `supabase/rls.sql`;
- rotas internas mapeadas por URL, permitindo acesso direto a `/portal`, `/ponto`, `/financeiro`, etc.;
- `npm audit --audit-level=high` validado sem vulnerabilidades.

## Observação técnica

O sistema continua com modo demo/localStorage para rodar imediatamente no VS Code. Em produção, ao configurar Supabase, o snapshot operacional é persistido remotamente e o Storage passa a receber arquivos digitalizados. Para uma operação multiusuário de grande escala, as tabelas normalizadas do Supabase já estão preparadas para evolução por módulo.
