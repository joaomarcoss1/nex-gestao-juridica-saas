import { getSupabaseAdmin, json, requireSharedSecret, safeError } from "../_shared/security";

export default async function handler(request: Request) {
  if (!['GET', 'POST'].includes(request.method)) return json({ ok: false, message: "Método não permitido." }, 405);
  try {
    requireSharedSecret(request, "CRON_SECRET", "authorization");
    const admin = getSupabaseAdmin(true)!;
    const today = new Date().toISOString().slice(0, 10);
    const inThreeDays = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    const results: string[] = [];

    async function ensureTask(payload: Record<string, unknown>) {
      const title = String(payload.title ?? "");
      const processId = payload.process_id as string | null | undefined;
      let query = admin.from("tasks").select("id").eq("organization_id", payload.organization_id).eq("title", title).eq("status", "Pendente");
      query = processId ? query.eq("process_id", processId) : query.is("process_id", null);
      const { data: existing, error: existingError } = await query.limit(1);
      if (existingError) throw existingError;
      if (existing?.length) return false;
      const { error } = await admin.from("tasks").insert(payload);
      if (error) throw error;
      return true;
    }

    const { data: stuckProcesses, error: stuckError } = await admin.from("processes").select("id, organization_id, client_id, responsible_id, last_move_days").gte("last_move_days", 30).is("archived_at", null).limit(500);
    if (stuckError) throw stuckError;
    let stuckCreated = 0;
    for (const process of stuckProcesses ?? []) {
      if (await ensureTask({ organization_id: process.organization_id, process_id: process.id, client_id: process.client_id, title: "Controladoria: revisar processo sem movimentação há 30 dias", sector: "Controladoria", priority: "Alta", status: "Pendente", due_at: `${today}T12:00:00Z`, responsible_id: process.responsible_id, estimated_hours: 1 })) stuckCreated += 1;
    }
    results.push(`${stuckProcesses?.length ?? 0} processos analisados; ${stuckCreated} tarefas novas`);

    const { data: deadlines, error: deadlineError } = await admin.from("deadlines").select("id, organization_id, process_id, client_id, responsible_id, due_date, type").lte("due_date", inThreeDays).neq("status", "concluído").is("archived_at", null).limit(500);
    if (deadlineError) throw deadlineError;
    let deadlineCreated = 0;
    for (const deadline of deadlines ?? []) {
      if (await ensureTask({ organization_id: deadline.organization_id, process_id: deadline.process_id, client_id: deadline.client_id, title: `Prazo vencendo: ${deadline.type ?? "prazo processual"}`, sector: "Controladoria", priority: "Crítica", status: "Pendente", due_at: `${today}T12:00:00Z`, responsible_id: deadline.responsible_id, estimated_hours: 0.5 })) deadlineCreated += 1;
    }
    results.push(`${deadlines?.length ?? 0} prazos analisados; ${deadlineCreated} tarefas novas`);

    const { data: overdue, error: overdueError } = await admin.from("financial_entries").select("id, organization_id, client_id, process_id, category").lt("due_date", today).not("status", "in", "(pago,cancelado)").is("archived_at", null).limit(500);
    if (overdueError) throw overdueError;
    let overdueCreated = 0;
    for (const entry of overdue ?? []) {
      if (await ensureTask({ organization_id: entry.organization_id, process_id: entry.process_id, client_id: entry.client_id, title: `Financeiro: cobrança vencida ${entry.category ?? "lançamento"}`, sector: "Financeiro", priority: "Alta", status: "Pendente", due_at: `${today}T12:00:00Z`, estimated_hours: 0.5 })) overdueCreated += 1;
      const { error } = await admin.from("financial_entries").update({ status: "atrasado", updated_at: new Date().toISOString() }).eq("id", entry.id).eq("organization_id", entry.organization_id);
      if (error) throw error;
    }
    results.push(`${overdue?.length ?? 0} cobranças analisadas; ${overdueCreated} tarefas novas`);

    await admin.from("automation_runs").insert({ status: "sucesso", result: results.join("; "), output_payload: { results }, executed_at: new Date().toISOString() });
    return json({ ok: true, mode: "executed", results, executedAt: new Date().toISOString() });
  } catch (error) {
    const safe = safeError(error, "Automações não executadas.");
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
