import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  return process.env[name]?.trim();
}

export default async function handler(request: Request) {
  if (!["GET", "POST"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
  const secret = env("CRON_SECRET");
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(request.url).searchParams.get("secret");
  if (secret && auth !== secret) return new Response("Unauthorized", { status: 401 });

  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY");
  if (!url || !serviceRole) {
    return Response.json({ ok: false, mode: "prepared", message: "Configure SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel para execução real.", executedAt: new Date().toISOString() }, { status: 200 });
  }

  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const inThreeDays = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  const results: string[] = [];

  async function ensureTask(payload: Record<string, unknown>) {
    const title = String(payload.title ?? "");
    const processId = payload.process_id as string | null | undefined;
    let existingQuery = supabase
      .from("tasks")
      .select("id")
      .eq("organization_id", payload.organization_id)
      .eq("title", title)
      .eq("status", "Pendente");
    existingQuery = processId ? existingQuery.eq("process_id", processId) : existingQuery.is("process_id", null);
    const { data: existing } = await existingQuery.limit(1);
    if (existing?.length) return { created: false, id: existing[0].id };
    const { data } = await supabase.from("tasks").insert(payload).select("id").single();
    return { created: true, id: data?.id };
  }

  const { data: stuckProcesses } = await supabase.from("processes").select("id, organization_id, client_id, responsible_id, last_move_days").gte("last_move_days", 30).is("archived_at", null).limit(200);
  let stuckCreated = 0;
  for (const process of stuckProcesses ?? []) {
    const result = await ensureTask({ organization_id: process.organization_id, process_id: process.id, client_id: process.client_id, title: "Controladoria: revisar processo sem movimentação há 30 dias", sector: "Controladoria", priority: "Alta", status: "Pendente", due_at: `${today}T12:00:00Z`, responsible_id: process.responsible_id, estimated_hours: 1 });
    if (result.created) stuckCreated += 1;
  }
  results.push(`${stuckProcesses?.length ?? 0} processos parados analisados; ${stuckCreated} tarefas novas`);

  const { data: deadlines } = await supabase.from("deadlines").select("id, organization_id, process_id, client_id, responsible_id, due_date, type").lte("due_date", inThreeDays).neq("status", "concluído").is("archived_at", null).limit(200);
  let deadlineCreated = 0;
  for (const deadline of deadlines ?? []) {
    const result = await ensureTask({ organization_id: deadline.organization_id, process_id: deadline.process_id, client_id: deadline.client_id, title: `Prazo vencendo: ${deadline.type ?? "prazo processual"}`, sector: "Controladoria", priority: "Crítica", status: "Pendente", due_at: `${today}T12:00:00Z`, responsible_id: deadline.responsible_id, estimated_hours: 0.5 });
    if (result.created) deadlineCreated += 1;
  }
  results.push(`${deadlines?.length ?? 0} prazos próximos analisados; ${deadlineCreated} tarefas novas`);

  const { data: overdue } = await supabase.from("financial_entries").select("id, organization_id, client_id, process_id, amount, category").lt("due_date", today).not("status", "in", "(pago,cancelado)").is("archived_at", null).limit(200);
  let overdueCreated = 0;
  for (const entry of overdue ?? []) {
    const result = await ensureTask({ organization_id: entry.organization_id, process_id: entry.process_id, client_id: entry.client_id, title: `Financeiro: cobrança vencida ${entry.category ?? "lançamento"}`, sector: "Financeiro", priority: "Alta", status: "Pendente", due_at: `${today}T12:00:00Z`, estimated_hours: 0.5 });
    if (result.created) overdueCreated += 1;
    await supabase.from("financial_entries").update({ status: "atrasado" }).eq("id", entry.id);
  }
  results.push(`${overdue?.length ?? 0} cobranças vencidas analisadas; ${overdueCreated} tarefas novas`);

  await supabase.from("automation_runs").insert({ status: "sucesso", result: results.join("; "), output_payload: { results }, executed_at: new Date().toISOString() });
  return Response.json({ ok: true, mode: "executed", results, executedAt: new Date().toISOString() });
}
