import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { entitiesForOperation, entitiesForPage } from "@/services/moduleData.service";

const root = process.cwd();
const read = (relative: string) => readFile(path.join(root, relative), "utf8");
const migrationNames = [
  "20260714_v51_core_integrity.sql",
  "20260714_v51_workflow_engine.sql",
  "20260714_v51_process_persistence.sql",
  "20260714_v51_crm_conversion.sql",
  "20260714_v51_financial_integrity.sql",
  "20260714_v51_scheduling_normalization.sql",
  "20260714_v51_indexes_rls.sql",
];

describe("migrations estruturais v5.1", () => {
  it("entrega todas as migrations incrementais na ordem documentada", async () => {
    const files = await readdir(path.join(root, "supabase/migrations"));
    for (const file of migrationNames) expect(files).toContain(file);
    const order = await read("supabase/MIGRATION_ORDER_V51.md");
    for (const file of migrationNames) expect(order).toContain(file);
  });

  it("não contém remoção destrutiva de tabelas", async () => {
    for (const file of migrationNames) {
      const sql = await read(`supabase/migrations/${file}`);
      expect(sql).not.toMatch(/\bdrop\s+table\b/i);
      expect(sql).toMatch(/\bbegin\s*;/i);
      expect(sql).toMatch(/\bcommit\s*;/i);
    }
  });

  it("protege funções privilegiadas com search_path e sessão", async () => {
    const sources = await Promise.all(migrationNames.map((file) => read(`supabase/migrations/${file}`)));
    const sql = sources.join("\n");
    expect(sql).toMatch(/security definer set search_path=public,auth/i);
    expect(sql).toMatch(/auth\.uid\(\) is null/i);
    expect(sql).toMatch(/nex_current_org_id\(\)/i);
    expect(sql).not.toMatch(/grant execute[^;]+to anon/i);
  });

  it("cria motor persistente de workflow e dependências", async () => {
    const sql = await read("supabase/migrations/20260714_v51_workflow_engine.sql");
    expect(sql).toMatch(/create table if not exists public\.workflow_runs/i);
    expect(sql).toMatch(/create table if not exists public\.workflow_run_steps/i);
    expect(sql).toMatch(/depends_on_step_id/i);
    expect(sql).toMatch(/workflow_runs_active_unique/i);
    expect(sql).toMatch(/nex_v51_complete_workflow_step/i);
  });

  it("persiste todos os grupos críticos de campos do processo", async () => {
    const sql = await read("supabase/migrations/20260714_v51_process_persistence.sql");
    for (const field of ["active_pole", "passive_pole", "subject", "court_division", "district", "state", "costs_value", "client_visible_summary", "internal_strategy", "tags", "opened_at", "closed_at", "version"]) {
      expect(sql).toContain(field);
    }
    expect(sql).toMatch(/process_movements/i);
    expect(sql).toMatch(/process_phase_history/i);
  });

  it("converte CRM dentro de uma única função transacional", async () => {
    const sql = await read("supabase/migrations/20260714_v51_crm_conversion.sql");
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/conversion_idempotency_key/i);
    expect(sql).toMatch(/conversion_client_id/i);
    expect(sql).toMatch(/conversion_process_id/i);
    expect(sql).toMatch(/nex_v51_start_workflow/i);
  });

  it("impede duplicação de parcelas, fontes e pagamentos", async () => {
    const sql = await read("supabase/migrations/20260714_v51_financial_integrity.sql");
    expect(sql).toMatch(/unique\s*\(organization_id,contract_id,installment_number\)/i);
    expect(sql).toMatch(/financial_entries_source_uidx/i);
    expect(sql).toMatch(/idempotency_key text not null/i);
    expect(sql).toMatch(/unique\s*\(organization_id,idempotency_key\)/i);
    expect(sql).toMatch(/nex_v51_register_payment/i);
  });

  it("normaliza agenda, deduplica e sincroniza tarefa", async () => {
    const sql = await read("supabase/migrations/20260714_v51_scheduling_normalization.sql");
    expect(sql).toMatch(/source_type='financial_entry'/i);
    expect(sql).toMatch(/scheduled_events_source_event_uidx/i);
    expect(sql).toMatch(/meeting_id/i);
    expect(sql).toMatch(/schedule_conflict/i);
    expect(sql).toMatch(/timezone/i);
  });

  it("habilita RLS multiempresa nas novas tabelas", async () => {
    const sql = await read("supabase/migrations/20260714_v51_indexes_rls.sql");
    for (const table of ["operation_idempotency", "workflow_runs", "workflow_run_steps", "process_movements", "process_phase_history", "contract_installments", "financial_payments"]) {
      expect(sql).toContain(`'${table}'`);
    }
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/organization_id=public\.nex_current_org_id\(\)/i);
  });
});

describe("contratos do frontend v5.1", () => {
  it("usa uma única camada atômica para as operações críticas", async () => {
    const source = await read("client/src/services/atomicOperations.service.ts");
    for (const rpc of ["nex_v52_convert_lead", "nex_v52_create_process", "nex_v52_start_workflow", "nex_v52_register_payment", "nex_v52_save_meeting"]) expect(source).toContain(rpc);
    expect(source).toMatch(/loadNormalizedState\(entitiesForOperation\(operation\), state\)/);
  });

  it("carrega apenas entidades necessárias por módulo", () => {
    expect(entitiesForPage("crm")).toContain("leads");
    expect(entitiesForPage("crm")).not.toContain("payrolls");
    expect(entitiesForPage("financeiro")).toContain("financialPayments");
    expect(entitiesForPage("agenda")).toContain("scheduledEvents");
    expect(entitiesForOperation({ type: "registerPayment", financialEntryId: "f", amountCents: 1, paymentDate: "2026-01-01", paymentMethod: "PIX", idempotencyKey: "key1" })).toEqual(expect.arrayContaining(["finances", "financialPayments", "paymentReceipts"]));
  });

  it("não mantém templates fixos na tela de workflow", async () => {
    const source = await read("client/src/features/tarefas/pages/TarefasPage.tsx");
    expect(source).toMatch(/state\.workflowTemplates/);
    expect(source).not.toMatch(/const\s+workflowTemplates\s*=\s*\[/);
  });

  it("não copia horas estimadas para realizadas", async () => {
    const source = await read("client/src/services/atomicOperations.service.ts");
    expect(source).not.toMatch(/Math\.max\([^\n]*spentHours[^\n]*estimatedHours/i);
    expect(source).toMatch(/task\.workedMinutes\s*=\s*operation\.workedMinutes/);
  });
});
