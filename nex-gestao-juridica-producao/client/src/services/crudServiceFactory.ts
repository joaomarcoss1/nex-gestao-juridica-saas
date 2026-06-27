import type { AppState, EntityName } from "@/types/app";
import { deleteEntityRemote, persistEntity } from "./normalizedRepository";

export type CrudService<K extends EntityName> = {
  list: (state: AppState) => AppState[K];
  getById: (state: AppState, id: string) => AppState[K][number] | undefined;
  create: (item: AppState[K][number], state: AppState) => Promise<void>;
  update: (item: AppState[K][number], state: AppState) => Promise<void>;
  archive: (item: AppState[K][number], state: AppState) => Promise<void>;
  restore: (item: AppState[K][number], state: AppState) => Promise<void>;
  deletePermanent: (id: string) => Promise<void>;
};

export function createCrudService<K extends EntityName>(entity: K): CrudService<K> {
  return {
    list: (state) => state[entity],
    getById: (state, id) => (state[entity] as Array<{ id: string }>).find((item) => item.id === id) as AppState[K][number] | undefined,
    create: (item, state) => persistEntity(entity, item, state),
    update: (item, state) => persistEntity(entity, item, state),
    archive: (item, state) => persistEntity(entity, { ...(item as object), archivedAt: new Date().toISOString() } as AppState[K][number], state),
    restore: (item, state) => persistEntity(entity, { ...(item as object), archivedAt: undefined } as AppState[K][number], state),
    deletePermanent: (id) => deleteEntityRemote(entity, id),
  };
}
