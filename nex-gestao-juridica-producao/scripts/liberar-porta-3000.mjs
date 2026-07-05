import { execSync } from "node:child_process";

if (process.platform !== "win32") {
  console.log("Este script é para Windows. No Linux/Mac, feche o terminal antigo ou use lsof/kill.");
  process.exit(0);
}

try {
  const out = execSync('netstat -ano | findstr :3000', { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid)) pids.add(pid);
  }
  if (pids.size === 0) {
    console.log("Nenhum processo encontrado na porta 3000.");
    process.exit(0);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Processo ${pid} finalizado na porta 3000.`);
    } catch {
      console.log(`Não consegui finalizar o processo ${pid}. Feche manualmente pelo Gerenciador de Tarefas.`);
    }
  }
} catch {
  console.log("Porta 3000 livre ou nenhum processo encontrado.");
}
