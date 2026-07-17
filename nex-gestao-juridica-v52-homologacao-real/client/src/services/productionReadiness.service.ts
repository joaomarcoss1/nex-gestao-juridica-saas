import type { AppState, AuthProfile, EntityName } from "@/types/app";
import { databaseMode, hasValidSupabaseConfig, supabaseConfigurationError } from "@/services/supabase";

export type ReadinessLevel = "success" | "warning" | "danger";
export type ReadinessCheck = {
  key: string;
  title: string;
  level: ReadinessLevel;
  message: string;
  action?: string;
};

export function humanizeSupabaseError(error: unknown) {
  const candidate = error as { code?: string; message?: string; details?: string; hint?: string };
  const code = String(candidate?.code ?? "");
  const raw = `${candidate?.message ?? ""} ${candidate?.details ?? ""} ${candidate?.hint ?? ""}`.trim();
  const text = raw.toLowerCase();

  if (!hasValidSupabaseConfig) {
    return supabaseConfigurationError || "Supabase não configurado. Configure as variáveis de ambiente para ativar a persistência real.";
  }
  if (["42P01", "42703", "42883", "PGRST200", "PGRST204"].includes(code) || text.includes("does not exist") || text.includes("schema cache")) {
    return "Estrutura do Supabase incompleta. Rode a migration v4.5 no Supabase e faça Redeploy sem cache na Vercel.";
  }
  if (code === "42501" || text.includes("permission denied") || text.includes("row-level security")) {
    return "Permissão bloqueada pelo RLS. Revise se o usuário pertence à empresa correta e se a migration v4.5 foi aplicada.";
  }
  if (text.includes("jwt") || text.includes("auth")) {
    return "Sessão expirada ou inválida. Saia do sistema e entre novamente.";
  }
  if (text.includes("network") || text.includes("fetch") || text.includes("failed to fetch")) {
    return "Não foi possível conectar ao Supabase agora. Verifique a internet e tente novamente.";
  }
  if (raw) return raw.slice(0, 220);
  return "Não foi possível concluir a operação no Supabase. Tente novamente em instantes.";
}

export function getSupabaseStatusMessage(syncStatus: "demo" | "online" | "offline") {
  if (!hasValidSupabaseConfig) {
    return {
      tone: "warning" as const,
      title: "Modo demonstração",
      message: "Supabase não configurado. Dados reais exigem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.",
    };
  }
  if (syncStatus === "online") {
    return {
      tone: "success" as const,
      title: "Supabase conectado",
      message: "Persistência real ativa com isolamento por empresa e auditoria operacional.",
    };
  }
  return {
    tone: "error" as const,
    title: "Sincronização pendente",
    message: "A última operação não foi confirmada no Supabase. Verifique migrations/RLS antes de usar com cliente real.",
  };
}

export function ensureOrganizationScope<K extends EntityName>(entity: K, item: AppState[K][number], profile: AuthProfile | null) {
  const role = String(profile?.role ?? "").toLowerCase();
  const globalMaster = ["admin_master", "admin_master_global"].includes(role);
  const requiresOrg = !["organizations", "auditLogs", "reportExports"].includes(String(entity));
  if (!requiresOrg || globalMaster) return item;
  const candidate = item as Record<string, unknown>;
  if (!candidate.organizationId && profile?.organizationId) {
    return { ...(item as object), organizationId: profile.organizationId } as AppState[K][number];
  }
  return item;
}

export function buildReadinessChecks(state: AppState, profile: AuthProfile | null, syncStatus: "demo" | "online" | "offline"): ReadinessCheck[] {
  const role = String(profile?.role ?? "").toLowerCase();
  const globalMaster = ["admin_master", "admin_master_global"].includes(role);
  const orphanEntities = [
    ["Clientes", state.clients.filter((item) => !item.organizationId).length],
    ["Processos", state.processes.filter((item) => !item.organizationId).length],
    ["Documentos", state.documents.filter((item) => !item.organizationId).length],
    ["Tarefas", state.tasks.filter((item) => !(item as { organizationId?: string }).organizationId).length],
    ["Financeiro", state.finances.filter((item) => !(item as { organizationId?: string }).organizationId).length],
  ].filter(([, count]) => Number(count) > 0);

  return [
    {
      key: "supabase",
      title: "Supabase e persistência real",
      level: hasValidSupabaseConfig && syncStatus === "online" ? "success" : hasValidSupabaseConfig ? "warning" : "danger",
      message: hasValidSupabaseConfig ? "Configuração encontrada. Use a migration v4.5 para validar tabelas, RPCs e RLS." : "Variáveis do Supabase ausentes no build.",
      action: hasValidSupabaseConfig ? "Rode CHECKLIST_VALIDACAO_V45.md." : "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.",
    },
    {
      key: "multiempresa",
      title: "Isolamento multiempresa",
      level: orphanEntities.length === 0 ? "success" : "warning",
      message: orphanEntities.length === 0 ? "Dados operacionais carregados com escopo por empresa." : `Há registros sem organization_id: ${orphanEntities.map(([label, count]) => `${label} (${count})`).join(", ")}.`,
      action: "Aplicar migration v4.5 e revisar cadastros importados antigos.",
    },
    {
      key: "perfil",
      title: "Perfil e permissões",
      level: profile?.active ? "success" : "danger",
      message: profile?.active ? `${globalMaster ? "Admin Master Global" : profile?.role ?? "Perfil"} autenticado com permissões aplicadas.` : "Nenhum perfil ativo carregado.",
      action: "Revisar users_profiles se o usuário não conseguir acessar módulos.",
    },
    {
      key: "portal",
      title: "Portal do cliente",
      level: state.clients.length > 0 && state.processes.length > 0 ? "success" : "warning",
      message: "Portal usa acesso simplificado por nome/CPF e bloqueio de dados internos.",
      action: "Teste acesso de cliente real antes de vendas.",
    },
    {
      key: "lgpd",
      title: "LGPD e auditoria",
      level: state.auditLogs.length >= 0 ? "success" : "warning",
      message: "Eventos críticos são registrados e a documentação de privacidade v4.5 foi incluída.",
      action: "Publicar Termos de Uso e Política de Privacidade no domínio oficial.",
    },
  ];
}

export function commercialStatusLabel() {
  if (databaseMode === "production" && hasValidSupabaseConfig) return "MVP comercial estável";
  return "Demonstração segura";
}
