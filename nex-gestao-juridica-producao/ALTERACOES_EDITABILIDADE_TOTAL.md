# Alterações - Editabilidade total e fluxo funcional

Esta versão corrige o principal problema identificado no deploy: módulos muito superficiais, sem edição completa e com automações limitadas.

## O que foi aplicado

- Clientes e leads agora possuem criação, edição, exclusão, busca e conversão de lead em cliente.
- Processos agora possuem formulário completo editável: CNJ, cliente, parte contrária, área, tribunal, classe, fase, status, risco, êxito, valor da causa, honorários, responsável, prazo e progresso.
- Tarefas agora possuem criação, edição, exclusão, conclusão e filtros.
- Financeiro agora possui lançamento completo, edição, exclusão, baixa e exportação CSV.
- Precificação mantém cálculo completo e agora também permite editar, aceitar, excluir e converter propostas salvas em cobrança.
- Documentos agora permitem digitalização, hash, PDF, upload, edição de metadados, exclusão e busca.
- Ponto agora permite edição de registros, exclusão de batidas, cadastro/edição de funcionários e troca segura de PIN via hash.
- Portal do cliente agora permite envio de documentos e edição das mensagens de atendimento.
- Automações internas agora têm criação, edição, exclusão, teste, ativar/pausar e execução em lote das regras ativas.
- Persistência normalizada ampliada para employees e messages no Supabase.
- Interface recebeu modais corporativos, busca, botões de ação, feedback visual, transições e microinterações discretas.

## Observação

Integrações externas como PIX, boleto, WhatsApp Business, tribunais e assinatura ICP-Brasil continuam dependendo de APIs e credenciais externas. As funcionalidades internas foram reforçadas para operar no modo demo/local e sincronizar com Supabase quando configurado.
