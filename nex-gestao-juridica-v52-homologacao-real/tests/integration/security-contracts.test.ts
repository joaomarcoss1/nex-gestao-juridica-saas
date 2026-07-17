import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) => readFile(path.join(root, relative), "utf8");

describe("contratos de segurança das APIs", () => {
  it("deriva a organização da sessão nos endpoints de cobrança", async () => {
    for (const file of ["api/billing/create-checkout-session.ts", "api/billing/create-portal-session.ts"]) {
      const source = await read(file);
      expect(source).toMatch(/requireUser\(/);
      expect(source).toMatch(/resolveOrganization\(/);
      expect(source).not.toMatch(/customerId\s*=\s*String\(payload/);
    }
  });

  it("bloqueia webhooks quando o segredo não existe", async () => {
    for (const file of ["api/integrations/google-leads-webhook.ts", "api/payments/webhook.ts", "api/cron/automations.ts"]) {
      const source = await read(file);
      expect(source).toMatch(/requireSharedSecret\(/);
    }
    const helper = await read("api/_shared/security.ts");
    expect(helper).toMatch(/Endpoint bloqueado por segurança/);
  });

  it("não aceita redirectTo enviado pelo cliente no portal", async () => {
    const source = await read("api/portal/request-access.ts");
    expect(source).toMatch(/portalRedirectUrl\(request\)/);
    expect(source).not.toMatch(/payload\.redirectTo/);
  });
});

describe("contratos da migration v5.0", () => {
  it("corrige a tabela financeira real e mantém migração incremental", async () => {
    const sql = await read("supabase/migrations/20260713_v50_producao_segura_mobile.sql");
    expect(sql).toMatch(/alter table if exists public\.financial_entries/i);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).toMatch(/add column if not exists scheduled_event_id/i);
  });

  it("revoga RPCs anônimas e protege o Storage", async () => {
    const sql = await read("supabase/migrations/20260713_v50_producao_segura_mobile.sql");
    expect(sql).toMatch(/revoke all on function public\.client_portal_by_name_cpf/i);
    expect(sql).toMatch(/revoke insert, update, delete on storage\.objects from anon/i);
    expect(sql).toMatch(/organization_id.*client_id/is);
  });

  it("inclui sincronização de agenda, fontes e rate limiting", async () => {
    const sql = await read("supabase/migrations/20260713_v50_producao_segura_mobile.sql");
    expect(sql).toMatch(/scheduled_events/i);
    expect(sql).toMatch(/crm_lead_sources/i);
    expect(sql).toMatch(/nex_consume_rate_limit/i);
  });
});
