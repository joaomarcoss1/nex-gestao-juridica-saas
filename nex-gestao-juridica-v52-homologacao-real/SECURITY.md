# Política de segurança

## Segredos

- Nunca comite `.env`, `.env.local` ou chaves reais.
- Nunca use prefixo `VITE_` em service role, Stripe secret, SMTP password ou webhook secret.
- Rotacione imediatamente qualquer chave exposta.
- Use um segredo diferente para cada webhook e cron.

## Princípios aplicados

- Fail closed quando uma configuração de segurança estiver ausente.
- Organização e cliente derivados da sessão autenticada.
- RLS e Storage como barreiras obrigatórias, não apenas filtros do frontend.
- Service role somente nas funções serverless.
- Respostas públicas sem stack trace, SQL ou credenciais.
- Idempotência em eventos financeiros e integrações.
- Upload privado, limitado e com extensões permitidas.

## Relato responsável

Ao identificar uma vulnerabilidade, não publique detalhes, tokens ou dados de clientes. Registre o arquivo, o fluxo, o impacto e uma forma segura de reprodução para o responsável técnico da NexLabs.

## Checklist antes de produção

- RLS testada com Empresa A e Empresa B.
- Portal testado com dois clientes diferentes.
- Bucket `documentos` privado.
- Webhooks recusam segredo ausente/inválido.
- Service role ausente do bundle do navegador.
- Logs sem CPF completo, senha, token ou cabeçalho Authorization.
- Stripe em modo teste antes de ativar produção.
