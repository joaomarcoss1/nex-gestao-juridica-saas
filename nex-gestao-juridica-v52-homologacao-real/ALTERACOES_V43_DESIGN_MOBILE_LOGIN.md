# Nex Gestão Jurídica v4.3 — Login profissional, layout ERP premium e mobile app-like

## Objetivo
Esta versão aplica uma melhoria visual estrutural no sistema, com foco em uma experiência mais limpa, executiva e utilizável em desktop e celular.

## Tela de login
A tela inicial foi refeita para ficar profissional e objetiva.

### Removido
- Cards explicativos grandes de perfis.
- Textos técnicos sobre matrícula, Supabase e isolamento.
- E-mail preenchido automaticamente.
- Matrícula preenchida automaticamente.
- Chamadas visuais poluídas.

### Aplicado
- Card centralizado e compacto.
- Logo e identidade NexLabs.
- Título direto: `Acesse sua conta`.
- Seletor simples de perfil:
  - Admin Master
  - Admin / Funcionário
  - Cliente
- Campos exibidos apenas conforme o perfil selecionado.
- Admin Master: e-mail e senha.
- Admin / Funcionário: e-mail, senha e matrícula da empresa.
- Cliente: nome completo e CPF.
- Botões e links discretos: entrar, recuperar senha e primeiro acesso.

## Layout geral
O layout foi refinado usando a referência visual de ERP corporativo, mantendo a paleta do Nex Gestão Jurídica.

### Aplicado
- Sidebar mais limpa, menor e organizada.
- Topbar azul executiva, inspirada em sistemas corporativos.
- Cards KPI mais objetivos, com faixa lateral colorida.
- Painéis com bordas menores, mais limpos e menos pesados.
- Tabelas e cards com espaçamento mais consistente.
- Botões com bordas e dimensões mais uniformes.
- Remoção de textos excessivos em áreas principais.
- Ajustes de responsividade dos grids principais.

## Mobile e instalação no celular
A versão mobile foi reforçada para parecer e funcionar mais como aplicativo.

### Aplicado
- Navegação inferior fixa em formato de app.
- Drawer mobile para módulos extras.
- Topbar fixa e adaptada a notch/safe-area.
- Cards em uma coluna.
- Grids convertidos para layout vertical.
- Botões maiores e mais fáceis de tocar.
- Inputs com 16px para evitar zoom automático no iOS.
- Modais em tela cheia no celular.
- Tabelas convertidas em cards no mobile.
- Melhor uso de `100dvh`, `safe-area-inset` e `viewport-fit=cover`.

## PWA
Foram adicionados recursos básicos para instalação no celular.

### Arquivos adicionados
- `client/public/manifest.webmanifest`
- `client/public/sw.js`
- `client/public/pwa-icon-192.png`
- `client/public/pwa-icon-512.png`

### Alterações
- Meta tags mobile/PWA adicionadas ao `client/index.html`.
- Registro do service worker adicionado ao `client/src/main.tsx`.
- Tema mobile com cor da marca.

## Arquivos principais alterados
- `client/src/features/auth/pages/LoginPage.tsx`
- `client/src/components/layout/AppShell.tsx`
- `client/src/index.css`
- `client/src/mobile.css`
- `client/index.html`
- `client/src/main.tsx`
- `package.json`

## Versão
`4.3.0`
