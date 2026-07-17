# Validação técnica — Nex Gestão Jurídica v5.0

Data da validação: 13/07/2026.

## Comandos executados

```text
npm ci / npm install
npm run lint
npm run test
npm run test:integration
npm run build
npm run audit
npm run test:e2e
```

## Resultado

- Verificações estáticas críticas: aprovado.
- TypeScript: aprovado, sem erros.
- Testes unitários: 8 aprovados.
- Testes de integração/contratos: 6 aprovados.
- Testes E2E: 4 aprovados.
- Viewports E2E: Desktop Chromium e 360 × 800.
- Build Vite: aprovado, 2.324 módulos processados.
- Auditoria npm: zero vulnerabilidades encontradas.
- Scroll horizontal global no dashboard mobile: não detectado.
- Navegação Dashboard → Processos: aprovada em desktop e mobile.

## Bundle

O sistema utiliza code splitting. As páginas principais são geradas como chunks independentes. O bundle inicial deixou de concentrar todos os módulos em um único arquivo.

## Pré-visualizações

As capturas automatizadas estão em `artifacts/previews/`:

- `dashboard-desktop-chromium.png`
- `dashboard-mobile-360.png`
- `processos-desktop-chromium.png`
- `processos-mobile-360.png`

## Limites da validação

Não foi possível homologar contra o Supabase, Stripe, Google Leads e SMTP reais sem as credenciais do proprietário. A migration e as APIs foram verificadas por TypeScript, build, testes de contrato e auditoria estática. Antes da produção, execute o roteiro de `GUIA_DEPLOY_V50.md` em ambiente de homologação com duas organizações.
