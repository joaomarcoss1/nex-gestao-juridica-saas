import { useCallback, useEffect, useState } from "react";
import type { AppState, AuthProfile, EntityName, Toast } from "@/types/app";
import { auditLog } from "@/services/audit";
import { databaseMode } from "@/services/supabase";
import { deleteEntityRemote, loadNormalizedState, persistEntity, saveLocalState } from "@/services/normalizedRepository";
import { defaultState } from "@/data/defaultState";
import { applyMutationToState, buildSideEffects, deriveOperationalStatuses, validateEntityBeforeCommit } from "@/services/businessRules.service";
import { assertEntityActionAllowed, scopeStateForProfile } from "@/services/accessControl.service";

function actionName(entity: EntityName, action: string) {
  const prefix = action === "create" ? "create" : action === "archive" ? "archive" : action === "restore" ? "restore" : "update";
  return `${prefix}_${String(entity)}`;
}

export function useNexState(profile: AuthProfile | null, reloadKey = "demo") {
  const [state, setState] = useState<AppState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"demo" | "online" | "offline">(databaseMode === "production" ? "online" : "demo");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadNormalizedState()
      .then((loaded) => {
        if (!mounted) return;
        setState(scopeStateForProfile(deriveOperationalStatuses(loaded), profile));
        setSyncStatus(databaseMode === "production" ? "online" : "demo");
      })
      .catch((error) => {
        console.error(error);
        setState(scopeStateForProfile(deriveOperationalStatuses(defaultState), profile));
        setSyncStatus("offline");
        notify({ tone: "error", title: "Supabase indisponível", message: "O app continuou em modo local seguro com validações e auditoria." });
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [notify, reloadKey, profile]);

  useEffect(() => {
    if (!loading) saveLocalState(state);
  }, [loading, state]);

  const commit = useCallback(async <K extends EntityName>(entity: K, value: AppState[K][number], action: "create" | "update" | "archive" | "restore" = "create") => {
    assertEntityActionAllowed(profile, entity, action, value, state);
    const validation = validateEntityBeforeCommit(entity, value);
    if (!validation.ok) {
      notify({ tone: "error", title: "Registro não salvo", message: validation.errors.join(" ") });
      throw new Error(validation.errors.join(" "));
    }

    let nextState = state;
    const sideEffects = buildSideEffects(entity, value, action, state);
    setState((current) => {
      let draft = applyMutationToState(current, entity, value);
      for (const effect of sideEffects) draft = applyMutationToState(draft, effect.entity, effect.value as never);
      nextState = scopeStateForProfile(deriveOperationalStatuses(draft), profile);
      return nextState;
    });

    try {
      await persistEntity(entity, value, nextState);
      for (const effect of sideEffects) await persistEntity(effect.entity, effect.value as never, nextState);
      await auditLog(actionName(entity, action), { module: entity, entityId: (value as { id: string }).id, value, action, sideEffects: sideEffects.map((e) => e.entity) });
      setSyncStatus(databaseMode === "production" ? "online" : "demo");
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
      notify({ tone: "error", title: "Salvo localmente", message: "Não foi possível sincronizar com Supabase agora. A operação foi mantida localmente e será validada novamente." });
    }
  }, [notify, profile, state]);

  const remove = useCallback(async <K extends EntityName>(entity: K, id: string) => {
    assertEntityActionAllowed(profile, entity, "delete", { id }, state);
    setState((current) => scopeStateForProfile({ ...current, [entity]: (current[entity] as Array<{ id: string }>).filter((item) => item.id !== id) } as AppState, profile));
    try {
      await deleteEntityRemote(entity, id);
      await auditLog(`delete_${String(entity)}`, { module: entity, entityId: id });
      setSyncStatus(databaseMode === "production" ? "online" : "demo");
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
      notify({ tone: "error", title: "Exclusão local", message: "A exclusão ainda não sincronizou com Supabase." });
    }
  }, [notify, profile, state]);

  const archive = useCallback(async <K extends EntityName>(entity: K, item: AppState[K][number]) => {
    const id = (item as { id: string }).id;
    const archived = { ...(item as object), archivedAt: new Date().toISOString() } as AppState[K][number];
    await commit(entity, archived, "archive");
    notify({ tone: "info", title: "Item arquivado", message: `Registro ${id} permanece recuperável e auditável.` });
  }, [commit, notify]);

  const restore = useCallback(async <K extends EntityName>(entity: K, item: AppState[K][number]) => {
    const restored = { ...(item as object), archivedAt: undefined } as AppState[K][number];
    await commit(entity, restored, "restore");
    notify({ tone: "success", title: "Item restaurado" });
  }, [commit, notify]);

  return { state, loading, syncStatus, commit, remove, archive, restore, notify, toasts };
}
