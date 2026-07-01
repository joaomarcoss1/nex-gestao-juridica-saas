import type { AppState, EntityName } from "@/types/app";
import { deleteEntityRemote, persistEntity } from "./normalizedRepository";
import { auditLog } from "./audit";
import { validateEntityBeforeCommit } from "./businessRules.service";
import { exportCsv } from "@/utils/format";

export type CrudResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };
export type EntityFilter<T> = Partial<Record<keyof T, string | number | boolean | undefined>>;

function matchesQuery<T>(item: T, query = "") {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  return Object.values(item as Record<string, unknown>).some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

function matchesFilter<T>(item: T, filter: EntityFilter<T> = {}) {
  return Object.entries(filter).every(([key, value]) => value == null || value === "" || String((item as Record<string, unknown>)[key]).toLowerCase() === String(value).toLowerCase());
}

export type CrudService<K extends EntityName> = {
  list: (state: AppState, opts?: { includeArchived?: boolean; query?: string; filter?: EntityFilter<AppState[K][number]> }) => AppState[K];
  getById: (state: AppState, id: string) => AppState[K][number] | undefined;
  create: (item: AppState[K][number], state: AppState) => Promise<CrudResult<AppState[K][number]>>;
  update: (item: AppState[K][number], state: AppState) => Promise<CrudResult<AppState[K][number]>>;
  archive: (item: AppState[K][number], state: AppState) => Promise<CrudResult<AppState[K][number]>>;
  restore: (item: AppState[K][number], state: AppState) => Promise<CrudResult<AppState[K][number]>>;
  deletePermanent: (id: string) => Promise<CrudResult<string>>;
  search: (state: AppState, query: string) => AppState[K];
  filter: (state: AppState, filter: EntityFilter<AppState[K][number]>) => AppState[K];
  export: (state: AppState, filename?: string) => void;
};

async function persistWithValidation<K extends EntityName>(entity: K, item: AppState[K][number], state: AppState, action: string): Promise<CrudResult<AppState[K][number]>> {
  const validation = validateEntityBeforeCommit(entity, item);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  try {
    await persistEntity(entity, item, state);
    await auditLog(`${action}_${String(entity)}`, { module: entity, entityId: (item as { id: string }).id, item });
    return { ok: true, data: item };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Falha ao persistir no Supabase."] };
  }
}

export function createCrudService<K extends EntityName>(entity: K): CrudService<K> {
  return {
    list: (state, opts = {}) => (state[entity] as Array<AppState[K][number]>).filter((item) => (opts.includeArchived || !(item as { archivedAt?: string }).archivedAt) && matchesQuery(item, opts.query) && matchesFilter(item, opts.filter)) as AppState[K],
    getById: (state, id) => (state[entity] as Array<{ id: string }>).find((item) => item.id === id) as AppState[K][number] | undefined,
    create: (item, state) => persistWithValidation(entity, item, state, "create"),
    update: (item, state) => persistWithValidation(entity, item, state, "update"),
    archive: (item, state) => persistWithValidation(entity, { ...(item as object), archivedAt: new Date().toISOString() } as AppState[K][number], state, "archive"),
    restore: (item, state) => persistWithValidation(entity, { ...(item as object), archivedAt: undefined } as AppState[K][number], state, "restore"),
    deletePermanent: async (id) => {
      try {
        await deleteEntityRemote(entity, id);
        await auditLog(`delete_${String(entity)}`, { module: entity, entityId: id });
        return { ok: true, data: id };
      } catch (error) {
        return { ok: false, errors: [error instanceof Error ? error.message : "Falha ao excluir."] };
      }
    },
    search: (state, query) => (state[entity] as Array<AppState[K][number]>).filter((item) => matchesQuery(item, query)) as AppState[K],
    filter: (state, filter) => (state[entity] as Array<AppState[K][number]>).filter((item) => matchesFilter(item, filter)) as AppState[K],
    export: (state, filename = `${String(entity)}-nex-gestao-juridica.csv`) => exportCsv(filename, state[entity] as unknown as Record<string, unknown>[]),
  };
}
