import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoots = ["client/src", "api", "supabase/migrations"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".sql"]);
const findings = [];

async function walk(relative) {
  const absolute = path.join(root, relative);
  const info = await stat(absolute);
  if (info.isFile()) return [relative];
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = [];
  for (const entry of entries) {
    if (["node_modules", "dist", "coverage", "playwright-report", "test-results"].includes(entry.name)) continue;
    nested.push(...await walk(path.join(relative, entry.name)));
  }
  return nested;
}

const rules = [
  {
    name: "segredo service_role no frontend",
    applies: (file) => file.startsWith("client/src/"),
    pattern: /(?:import\.meta\.env|process\.env)[.\[]+["']?(?:VITE_)?SUPABASE_(?:SERVICE_ROLE_KEY|SERVICE_KEY)/g,
  },
  {
    name: "caixa nativa bloqueante",
    applies: (file) => file.startsWith("client/src/") && !file.endsWith("DialogHost.tsx"),
    pattern: /window\.(?:prompt|confirm|alert)\s*\(/g,
  },
  {
    name: "limite silencioso legado de 700 registros",
    applies: () => true,
    pattern: /\.limit\(700\)/g,
  },
  {
    name: "supressão TypeScript",
    applies: () => true,
    pattern: /@ts-(?:ignore|nocheck)/g,
  },
  {
    name: "segredo privado exposto por VITE_",
    applies: (file) => file.startsWith("client/src/"),
    pattern: /VITE_(?:STRIPE_SECRET|SUPABASE_SERVICE|WEBHOOK_SECRET|SMTP_PASS|API_SECRET)/g,
  },
];

for (const sourceRoot of sourceRoots) {
  for (const file of await walk(sourceRoot)) {
    if (!extensions.has(path.extname(file))) continue;
    const content = await readFile(path.join(root, file), "utf8");
    for (const rule of rules) {
      if (!rule.applies(file)) continue;
      const matches = [...content.matchAll(rule.pattern)];
      for (const match of matches) {
        const line = content.slice(0, match.index).split("\n").length;
        findings.push(`${file}:${line} — ${rule.name}`);
      }
    }
  }
}

const migrationContracts = [
  {
    version: "v5.0",
    file: "supabase/migrations/20260713_v50_producao_segura_mobile.sql",
    contracts: [
      ["financial_entries", /alter table if exists public\.financial_entries/i],
      ["revogação RPC anônima", /revoke all on function public\.client_portal_by_name_cpf/i],
      ["Storage sem escrita anônima", /revoke insert, update, delete on storage\.objects from anon/i],
      ["RLS de clientes", /create policy v50_client_scope_restrict on public\.clients/i],
      ["rate limit distribuído", /nex_consume_rate_limit/i],
    ],
  },
  {
    version: "v5.1 workflow",
    file: "supabase/migrations/20260714_v51_workflow_engine.sql",
    contracts: [
      ["workflow_runs", /create table if not exists public\.workflow_runs/i],
      ["workflow_run_steps", /create table if not exists public\.workflow_run_steps/i],
      ["workflow idempotente", /workflow_runs_active_unique/i],
      ["RPC iniciar workflow", /nex_v51_start_workflow\(p_operation jsonb\)/i],
    ],
  },
  {
    version: "v5.1 processos",
    file: "supabase/migrations/20260714_v51_process_persistence.sql",
    contracts: [
      ["campos completos", /add column if not exists active_pole/i],
      ["movimentações", /create table if not exists public\.process_movements/i],
      ["histórico de fases", /create table if not exists public\.process_phase_history/i],
      ["RPC processo", /nex_v51_create_process\(p_operation jsonb\)/i],
    ],
  },
  {
    version: "v5.1 CRM",
    file: "supabase/migrations/20260714_v51_crm_conversion.sql",
    contracts: [
      ["conversão transacional", /nex_v51_convert_lead\(p_operation jsonb\)/i],
      ["controle de conversão", /conversion_idempotency_key/i],
      ["bloqueio concorrente", /for update/i],
    ],
  },
  {
    version: "v5.1 financeiro",
    file: "supabase/migrations/20260714_v51_financial_integrity.sql",
    contracts: [
      ["parcelas explícitas", /create table if not exists public\.contract_installments/i],
      ["pagamentos explícitos", /create table if not exists public\.financial_payments/i],
      ["unicidade de parcela", /unique\(organization_id,contract_id,installment_number\)/i],
      ["baixa idempotente", /nex_v51_register_payment\(p_operation jsonb\)/i],
    ],
  },
  {
    version: "v5.1 agenda",
    file: "supabase/migrations/20260714_v51_scheduling_normalization.sql",
    contracts: [
      ["origem normalizada", /source_type='financial_entry'/i],
      ["evento único", /scheduled_events_source_event_uidx/i],
      ["conflito de agenda", /SCHEDULE_CONFLICT/i],
      ["sincronização reunião", /nex_v51_save_meeting\(p_operation jsonb\)/i],
    ],
  },
];

for (const migrationContract of migrationContracts) {
  const content = await readFile(path.join(root, migrationContract.file), "utf8");
  for (const [label, pattern] of migrationContract.contracts) {
    if (!pattern.test(content)) findings.push(`${migrationContract.version} — contrato ausente: ${label}`);
  }
}

const v51Files = (await walk("supabase/migrations")).filter((file) => /20260714_v51_.*\.sql$/.test(file));
for (const file of v51Files) {
  const content = await readFile(path.join(root, file), "utf8");
  if (/\bdrop\s+table\b/i.test(content)) findings.push(`${file} — migration destrutiva com DROP TABLE`);
  if (/grant\s+execute[^;]+\bto\s+anon\b/i.test(content)) findings.push(`${file} — RPC estrutural exposta ao perfil anon`);
  const securityFunctions = content.match(/create or replace function[\s\S]*?\$\$;/gi) ?? [];
  for (const definition of securityFunctions) {
    if (/security definer/i.test(definition) && !/set search_path\s*=\s*public,auth/i.test(definition)) {
      findings.push(`${file} — função SECURITY DEFINER sem search_path protegido`);
    }
  }
}


const v52Contracts = [
  ["supabase/migrations/20260714_v52_01_process_movements_compatibility.sql", /occurred_at\s*=\s*coalesce\(occurred_at, movement_at/i],
  ["supabase/migrations/20260714_v52_03_client_rls_isolation.sql", /v52_client_process_movements/i],
  ["supabase/migrations/20260714_v52_04_security_definer_validation.sql", /nex_v52_assert_reference/i],
  ["supabase/migrations/20260714_v52_07_financial_state_reconciliation.sql", /nex_v52_next_counter/i],
  ["supabase/migrations/20260714_v52_09_pagination_indexes.sql", /nex_v52_schema_health/i],
];

for (const [file, contract] of v52Contracts) {
  const content = await readFile(path.join(root, file), "utf8");
  if (!contract.test(content)) findings.push(`${file} — contrato v5.2 ausente`);
  if (/\bdrop\s+table\b/i.test(content)) findings.push(`${file} — migration destrutiva com DROP TABLE`);
  if (/grant\s+execute[^;]+\bto\s+anon\b/i.test(content)) findings.push(`${file} — RPC v5.2 exposta ao perfil anon`);
  const securityFunctions = content.match(/create or replace function[\s\S]*?\$\$;/gi) ?? [];
  for (const definition of securityFunctions) {
    if (/security definer/i.test(definition) && !/set search_path\s*=\s*public\s*,\s*pg_temp/i.test(definition)) {
      findings.push(`${file} — função SECURITY DEFINER v5.2 sem search_path public,pg_temp`);
    }
  }
}


const v52Files = (await walk("supabase/migrations")).filter((file) => /20260714_v52_.*\.sql$/.test(file));
for (const file of v52Files) {
  const content = await readFile(path.join(root, file), "utf8");
  if (/\bdrop\s+table\b/i.test(content)) findings.push(`${file} — migration v5.2 destrutiva com DROP TABLE`);
  if (/grant\s+execute[^;]+\bto\s+anon\b/i.test(content)) findings.push(`${file} — RPC v5.2 exposta ao perfil anon`);
  const securityFunctions = content.match(/create or replace function[\s\S]*?\$\$;/gi) ?? [];
  for (const definition of securityFunctions) {
    if (/security definer/i.test(definition) && !/set search_path\s*=\s*public\s*,\s*pg_temp/i.test(definition)) {
      findings.push(`${file} — função SECURITY DEFINER v5.2 sem search_path public,pg_temp`);
    }
  }
}

const workflowV52 = await readFile(path.join(root, "supabase/migrations/20260714_v52_05_workflow_process_integrity.sql"), "utf8");
if (!/returning id into v_run_step[\s\S]*workflow_run_step_id=v_run_step/i.test(workflowV52)) {
  findings.push("v5.2 workflow — tarefa não vinculada à etapa persistente");
}

if (findings.length) {
  console.error("\nVerificações estáticas críticas falharam:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Verificações estáticas críticas concluídas sem bloqueios.");
