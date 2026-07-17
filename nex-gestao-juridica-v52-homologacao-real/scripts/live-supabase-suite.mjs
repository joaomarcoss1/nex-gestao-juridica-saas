import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const mode = process.argv[2] ?? "integration";
const required = process.env.REQUIRE_SUPABASE_LIVE_TESTS === "true";
const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const adminEmail = process.env.SUPABASE_TEST_ADMIN_EMAIL;
const adminPassword = process.env.SUPABASE_TEST_ADMIN_PASSWORD;

function skip(message) {
  if (required) {
    console.error(`[live:${mode}] BLOQUEADO: ${message}`);
    process.exit(1);
  }
  console.log(`[live:${mode}] SKIPPED: ${message}`);
  process.exit(0);
}

if (!url || !anonKey || !adminEmail || !adminPassword) {
  skip("configure SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_ADMIN_EMAIL e SUPABASE_TEST_ADMIN_PASSWORD.");
}

const admin = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await admin.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
if (auth.error) throw auth.error;

async function schemaHealth() {
  const { data, error } = await admin.rpc("nex_v52_schema_health");
  if (error) throw error;
  if (!data?.ok || !data?.hasFinancialPayments || !data?.hasWorkflowRuns || !data?.hasCounter || !data?.hasRegisterPayment || !data?.hasClientPolicy) {
    throw new Error(`Schema v5.2 incompleto: ${JSON.stringify(data)}`);
  }
  return data;
}

if (mode === "migrations" || mode === "integration") {
  const health = await schemaHealth();
  console.log(`[live:${mode}] schema health aprovado`, health);
}

if (mode === "rls") {
  const clientEmail = process.env.SUPABASE_TEST_CLIENT_EMAIL;
  const clientPassword = process.env.SUPABASE_TEST_CLIENT_PASSWORD;
  const table = process.env.SUPABASE_TEST_RLS_TABLE ?? "process_movements";
  const ownId = process.env.SUPABASE_TEST_OWN_RECORD_ID;
  const foreignId = process.env.SUPABASE_TEST_FOREIGN_RECORD_ID;
  if (!clientEmail || !clientPassword || !ownId || !foreignId) skip("configure credenciais do cliente e IDs próprio/estrangeiro para o teste RLS.");
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email: clientEmail, password: clientPassword });
  if (signed.error) throw signed.error;
  const own = await client.from(table).select("id").eq("id", ownId);
  if (own.error) throw own.error;
  const foreign = await client.from(table).select("id").eq("id", foreignId);
  if (foreign.error) throw foreign.error;
  if (!own.data?.length) throw new Error("RLS bloqueou o registro próprio configurado.");
  if (foreign.data?.length) throw new Error("RLS permitiu acesso ao registro estrangeiro configurado.");
  console.log(`[live:${mode}] isolamento aprovado em ${table}`);
}

if (mode === "concurrency") {
  const entryId = process.env.SUPABASE_TEST_FINANCIAL_ENTRY_ID;
  if (!entryId) skip("configure SUPABASE_TEST_FINANCIAL_ENTRY_ID com saldo disponível em homologação.");
  const key = `ci-concurrency-${Date.now()}`;
  const operation = { type:"registerPayment", financialEntryId:entryId, amountCents:1, paymentDate:new Date().toISOString().slice(0,10), paymentMethod:"PIX", idempotencyKey:key };
  const [a,b] = await Promise.all([admin.rpc("nex_v52_register_payment",{p_operation:operation}),admin.rpc("nex_v52_register_payment",{p_operation:operation})]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  const ids = new Set([a.data?.id,b.data?.id].filter(Boolean));
  if (ids.size !== 1) throw new Error(`Idempotência concorrente falhou: ${JSON.stringify([a.data,b.data])}`);
  console.log(`[live:${mode}] pagamento concorrente idempotente aprovado`, [...ids][0]);
}

await admin.auth.signOut();
console.log(`[live:${mode}] concluído.`);
