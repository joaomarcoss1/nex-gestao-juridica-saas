import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");
const migrations=[
"20260714_v52_01_process_movements_compatibility.sql",
"20260714_v52_02_entity_mapping_financial_support.sql",
"20260714_v52_03_client_rls_isolation.sql",
"20260714_v52_04_security_definer_validation.sql",
"20260714_v52_05_workflow_process_integrity.sql",
"20260714_v52_06_crm_integrity.sql",
"20260714_v52_07_financial_state_reconciliation.sql",
"20260714_v52_08_scheduling_timezone_recurrence.sql",
"20260714_v52_09_pagination_indexes.sql",
];

describe("contratos estruturais v5.2",()=>{
  it("entrega migrations incrementais documentadas e não destrutivas",async()=>{
    const files=await readdir(path.join(root,"supabase/migrations"));
    const order=await read("supabase/MIGRATION_ORDER_V52.md");
    for(const file of migrations){
      expect(files).toContain(file);
      expect(order).toContain(file);
      const sql=await read(`supabase/migrations/${file}`);
      expect(sql).toMatch(/begin\s*;/i);
      expect(sql).toMatch(/commit\s*;/i);
      expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    }
  });
  it("corrige process_movements preservando colunas antigas",async()=>{
    const sql=await read(`supabase/migrations/${migrations[0]}`);
    for(const field of ["occurred_at","movement_at","external_id","external_movement_id","source","provider","raw_payload"]) expect(sql).toContain(field);
    expect(sql).toMatch(/coalesce\(occurred_at, movement_at/i);
  });
  it("isola cliente das policies genéricas",async()=>{
    const sql=await read(`supabase/migrations/${migrations[2]}`);
    expect(sql).toMatch(/lower\(coalesce\(public\.nex_current_role/i);
    expect(sql).toMatch(/<>''cliente''|<>'cliente'/i);
    expect(sql).toMatch(/public\.nex_current_client_id\(\)/i);
    expect(sql).not.toMatch(/grant\s+all[^;]+anon/i);
  });
  it("valida referências nas RPCs security definer",async()=>{
    const helpers=await read(`supabase/migrations/${migrations[3]}`);
    const process=await read(`supabase/migrations/${migrations[4]}`);
    expect(helpers).toMatch(/nex_v52_assert_reference/i);
    expect(helpers).toMatch(/security definer/i);
    expect(helpers).toMatch(/search_path\s*=\s*public,\s*pg_temp/i);
    expect(process).toMatch(/VERSION_CONFLICT/i);
    expect(process).toMatch(/nex_v52_assert_reference\('process'/i);
  });
  it("usa contador concorrente e reconciliação financeira",async()=>{
    const support=await read(`supabase/migrations/${migrations[1]}`);
    const finance=await read(`supabase/migrations/${migrations[6]}`);
    expect(support).toMatch(/organization_counters/i);
    expect(support).toMatch(/on conflict\(organization_id, counter_key, counter_year\)/i);
    expect(support).toMatch(/nex_v52_reconcile_financial_entry/i);
    expect(finance).not.toMatch(/count\(\*\)\s*\+\s*1/i);
    expect(finance).toMatch(/nex_v52_next_counter/i);
    expect(finance).toMatch(/PAYMENT_EXCEEDS_BALANCE/i);
  });
  it("frontend utiliza RPCs v5.2 e mapeadores explícitos",async()=>{
    const atomic=await read("client/src/services/atomicOperations.service.ts");
    const repo=await read("client/src/services/normalizedRepository.ts");
    for(const rpc of ["nex_v52_convert_lead","nex_v52_create_process","nex_v52_register_payment","nex_v52_save_meeting"]) expect(atomic).toContain(rpc);
    expect(repo).toMatch(/mapFinanceEntryFromDatabase/);
    expect(repo).toMatch(/mapWorkflowRunFromDatabase/);
    expect(repo).toMatch(/mapProcessMovementFromDatabase/);
  });
  it("limita o carregamento inicial e oferece paginação server-side",async()=>{
    const repo=await read("client/src/services/normalizedRepository.ts");
    const paginated=await read("client/src/services/paginatedRepository.ts");
    expect(repo).toMatch(/pageSize\s*=\s*250/);
    expect(repo).toMatch(/maxPages\s*=\s*2/);
    expect(paginated).toMatch(/\.range\(/);
    expect(paginated).toMatch(/count:\s*"exact"/);
  });
});
