# Correção de Rodagem no Windows

Esta versão removeu os plugins de runtime/analytics que estavam injetando scripts desnecessários no `index.html` e adicionou scripts de inicialização compatíveis com Windows.

## O que foi corrigido

- Removido o runtime externo do Vite que deixava o HTML pesado e podia causar tela em branco.
- Removido o plugin de debug/analytics local que não é necessário para rodar no VS Code.
- `npm run dev` agora funciona no Windows sem `NODE_ENV=...` direto no terminal.
- O terminal mostra o endereço correto, inclusive quando a porta 3000 estiver ocupada.
- O navegador tenta abrir automaticamente no endereço certo.
- Foi criado o comando `npm run liberar-porta` para finalizar processos presos na porta 3000 no Windows.

## Como rodar do zero

Abra o PowerShell dentro da pasta do projeto e rode:

```bash
npm install --legacy-peer-deps
npm run dev
```

Quando aparecer algo como:

```text
Server running on http://localhost:3000/
```

abra esse endereço no navegador.

Se aparecer:

```text
Port 3000 is busy, using port 3001 instead
Server running on http://localhost:3001/
```

abra exatamente:

```text
http://localhost:3001
```

## Se você rodou `npm audit fix --force`

Não é recomendado usar esse comando agora, porque ele troca versões grandes de dependências e pode quebrar o app.

Para corrigir:

1. Feche o servidor no terminal com `CTRL + C`.
2. Apague a pasta `node_modules`.
3. Apague o arquivo `package-lock.json`, se existir.
4. Extraia novamente este ZIP em uma pasta limpa.
5. Rode:

```bash
npm install --legacy-peer-deps
npm run dev
```

## Se a porta 3000 estiver ocupada

Rode:

```bash
npm run liberar-porta
npm run dev
```

Ou simplesmente abra a porta que o terminal informar, por exemplo `http://localhost:3001/`.
