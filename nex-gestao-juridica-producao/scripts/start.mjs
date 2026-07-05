import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const entry = path.resolve(process.cwd(), "dist", "index.js");
const autoOpen = !process.argv.includes("--no-open");
const isWindows = process.platform === "win32";

if (!fs.existsSync(entry)) {
  console.error("Build não encontrado. Rode primeiro: npm run build");
  process.exit(1);
}

function openBrowser(url) {
  if (!autoOpen) return;
  const opener = isWindows
    ? { cmd: "cmd", args: ["/c", "start", "", url] }
    : process.platform === "darwin"
      ? { cmd: "open", args: [url] }
      : { cmd: "xdg-open", args: [url] };
  try {
    const openProcess = spawn(opener.cmd, opener.args, { detached: true, stdio: "ignore", shell: false });
    openProcess.unref();
  } catch {}
}

let opened = false;
const child = spawn(process.execPath, [entry], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: false,
  env: {
    ...process.env,
    NODE_ENV: "production",
    NEX_DEMO_MODE: process.env.NEX_DEMO_MODE ?? "true",
    PORT: process.env.PORT ?? "3000",
  },
});

function handleOutput(chunk, target) {
  const text = chunk.toString();
  target.write(text);
  const match = text.match(/Server running on (http:\/\/localhost:\d+\/?)/);
  if (match && !opened) {
    opened = true;
    const url = match[1];
    console.log(`\n[Gestão Jurídica Nex] Acesse no navegador: ${url}`);
    openBrowser(url);
  }
}

child.stdout.on("data", chunk => handleOutput(chunk, process.stdout));
child.stderr.on("data", chunk => handleOutput(chunk, process.stderr));
child.on("exit", code => process.exit(code ?? 0));
child.on("error", error => {
  console.error("Erro ao iniciar o servidor de produção:", error);
  process.exit(1);
});
