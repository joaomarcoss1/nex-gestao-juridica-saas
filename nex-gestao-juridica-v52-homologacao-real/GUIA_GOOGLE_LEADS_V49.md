# Guia — Google Leads no CRM v4.9

## Endpoint

Depois de publicar na Vercel, use:

```text
https://SEU-DOMINIO/api/integrations/google-leads-webhook
```

## Segurança opcional

Configure na Vercel:

```env
GOOGLE_LEADS_WEBHOOK_SECRET=uma-chave-secreta
GOOGLE_LEADS_DEFAULT_ORG_CODE=3272026
```

O envio pode mandar a chave no cabeçalho:

```text
x-nex-webhook-secret: sua-chave
```

ou como query string:

```text
/api/integrations/google-leads-webhook?secret=sua-chave
```

## Campos aceitos

O webhook aceita variações comuns:

```json
{
  "organization_code": "3272026",
  "name": "Nome do lead",
  "phone": "(99) 99999-9999",
  "email": "lead@email.com",
  "area": "Família e Sucessões",
  "message": "Descrição da demanda",
  "campaign": "Campanha Google Ads"
}
```

Também aceita nomes em português como `nome`, `telefone`, `mensagem` e `campanha`.

## Resultado

O sistema cria um registro em `leads` com:
- origem: Google Leads;
- etapa: Novo lead;
- próxima ação: dia seguinte;
- payload original salvo em `source_payload`.
