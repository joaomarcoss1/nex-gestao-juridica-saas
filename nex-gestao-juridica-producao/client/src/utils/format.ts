export function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function compact(value: number) {
  return value.toLocaleString("pt-BR");
}

export function uid(_prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
}

export function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function minutesFromTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(";"), ...rows.map((row) => headers.map((header) => String(row[header] ?? "").replaceAll(";", ",")).join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function statusTone(status: string): "blue" | "gold" | "green" | "red" | "purple" | "neutral" {
  const normalized = status.toLowerCase();
  if (["pago", "ativa", "ativo", "assinado", "aprovado", "concluída", "sucesso"].some((x) => normalized.includes(x))) return "green";
  if (["atrasada", "atrasado", "alto", "crítica", "erro", "pendente correção"].some((x) => normalized.includes(x))) return "red";
  if (["pendente", "atenção", "proposta", "rascunho", "parcial"].some((x) => normalized.includes(x))) return "gold";
  if (["médio", "em andamento", "enviada", "agendada"].some((x) => normalized.includes(x))) return "blue";
  if (["assinatura", "portal"].some((x) => normalized.includes(x))) return "purple";
  return "neutral";
}


export function exportExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${String(row[h] ?? "").replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function receiptNumber(prefix = "NX") {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
