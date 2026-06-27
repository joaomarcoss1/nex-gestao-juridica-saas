// Vercel Cron endpoint preparado para executar automações internas em produção.
// Configure variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apenas em ambiente serverless seguro.
export default async function handler(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  const payload = {
    ok: true,
    message: hasServiceRole
      ? "Cron preparado para executar automações com service role em backend seguro."
      : "Cron preparado. Configure SUPABASE_SERVICE_ROLE_KEY no ambiente serverless para execução real.",
    tasks: ["processos_parados", "prazos_vencendo", "cobrancas_vencidas", "tarefas_atrasadas"],
    executedAt: new Date().toISOString(),
  };
  return Response.json(payload);
}
