# LGPD, Privacidade e Segurança — Nex Gestão Jurídica v4.5

Este documento é uma base operacional para implantação. Deve ser revisado juridicamente antes de publicação final.

## Dados tratados

O sistema pode armazenar:

- dados de clientes;
- CPF/CNPJ;
- processos;
- documentos;
- mensagens;
- cobranças;
- tarefas internas;
- logs de auditoria.

## Bases operacionais

- Execução de contrato.
- Cumprimento de obrigação legal/regulatória.
- Exercício regular de direitos.
- Legítimo interesse administrativo.
- Consentimento quando aplicável ao portal e comunicações.

## Boas práticas

- Não compartilhar credenciais.
- Usar contas individuais.
- Aplicar RLS multiempresa.
- Revisar permissões periodicamente.
- Remover usuários desligados.
- Manter backup ativo.
- Não usar chave `service_role` no frontend.

## Portal do cliente

O cliente deve visualizar apenas:

- seus processos;
- documentos liberados;
- mensagens próprias;
- cobranças próprias;
- propostas vinculadas.

Nunca expor:

- estratégia interna;
- notas internas;
- financeiro do escritório;
- auditoria;
- equipe;
- dados de outros clientes.

## Exclusão e anonimização

Antes de excluir dados jurídicos, verificar obrigações legais, contábeis e processuais. Quando possível, aplicar arquivamento lógico e anonimização controlada.
