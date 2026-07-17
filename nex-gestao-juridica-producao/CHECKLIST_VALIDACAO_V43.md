# Checklist de validação — v4.3

## Validação técnica executada

```bash
npm install --legacy-peer-deps
npm run check
npm run build
npm run audit
```

## Resultado

- TypeScript: sem erros.
- Build Vite: concluído com sucesso.
- Auditoria npm: 0 vulnerabilidades altas.

## Login

- Admin Master exibe somente e-mail e senha.
- Admin / Funcionário exibe e-mail, senha e matrícula.
- Cliente exibe nome completo e CPF.
- Não há mais cards explicativos grandes na tela inicial.
- Não há e-mail ou matrícula preenchidos automaticamente.
- Links de recuperação e primeiro acesso ficam discretos.

## Desktop

- Sidebar alinhada e compacta.
- Topbar executiva em azul.
- Cards KPI com layout uniforme.
- Painéis com espaçamento mais limpo.
- Botões padronizados.
- Tabelas com cabeçalho mais profissional.

## Mobile

- Bottom navigation fixa.
- Menu completo em drawer.
- Campos com tamanho adequado para toque.
- Cards em uma coluna.
- Gráficos e painéis adaptados.
- Modais em tela cheia.
- Tabelas adaptadas para cards.
- Compatibilidade com safe-area/notch.

## PWA

- Manifest criado.
- Ícones PWA criados.
- Service worker criado.
- Registro do service worker configurado para produção.
- Meta tags de instalação adicionadas.
