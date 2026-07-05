import { requireSupabase } from "@/services/supabase";
import { auditLog } from "@/services/audit";

export type DomainTable =
  | "clients" | "processes" | "tasks" | "documents" | "messages" | "financial_entries"
  | "time_records" | "employees" | "users_profiles" | "audit_logs";

export function createDomainService<T extends { id?: string }>(table: DomainTable, moduleName: string) {
  return {
    async list(filters: Record<string, unknown> = {}) {
      const supabase = requireSupabase();
      let query = supabase.from(table).select("*");
      for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== null && value !== "") query = query.eq(key, value as never);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as T[];
    },
    async getById(id: string) {
      const supabase = requireSupabase();
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as T | null;
    },
    async create(payload: T) {
      const supabase = requireSupabase();
      const { data, error } = await supabase.from(table).insert(payload as never).select("*").single();
      if (error) throw error;
      await auditLog(`create_${moduleName}`, { module: moduleName, entityId: (data as any)?.id, value: data });
      return data as T;
    },
    async update(id: string, patch: Partial<T>) {
      const supabase = requireSupabase();
      const before = await this.getById(id);
      const { data, error } = await supabase.from(table).update({ ...(patch as object), updated_at: new Date().toISOString() } as never).eq("id", id).select("*").single();
      if (error) throw error;
      await auditLog(`update_${moduleName}`, { module: moduleName, entityId: id, before, value: data });
      return data as T;
    },
    async archive(id: string) {
      return this.update(id, { archived_at: new Date().toISOString() } as unknown as Partial<T>);
    },
    async restore(id: string) {
      return this.update(id, { archived_at: null } as unknown as Partial<T>);
    },
    async remove(id: string) {
      const supabase = requireSupabase();
      const before = await this.getById(id);
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      await auditLog(`delete_${moduleName}`, { module: moduleName, entityId: id, before });
    },
  };
}
