import { useCallback, useEffect, useState } from "react";
import type { AppState, AuthProfile, EntityName, Toast } from "@/types/app";
import { auditLog } from "@/services/audit";
import { databaseMode } from "@/services/supabase";
import { deleteEntityRemote, emptyState, loadNormalizedState, persistEntity, saveLocalState } from "@/services/normalizedRepository";
import { defaultState } from "@/data/defaultState";
import { applyMutationToState, buildSideEffects, deriveOperationalStatuses, validateEntityBeforeCommit } from "@/services/businessRules.service";
import { assertEntityActionAllowed, scopeStateForProfile } from "@/services/accessControl.service";
import { loadPublicPortalState, portalPersistDocument, portalPersistMessage, portalPersistProposalStatus } from "@/services/portal.service";
import { ensureOrganizationScope, humanizeSupabaseError } from "@/services/productionReadiness.service";

function actionName(entity: EntityName, action: string) {
  const prefix = action === "create" ? "create" : action === "archive" ? "archive" : action === "restore" ? "restore" : "update";
  return `${prefix}_${String(entity)}`;
}

function isPublicPortal(profile: AuthProfile | null) {
  return profile?.role === "cliente" && profile.authUserId === "portal-name-access";
}

async function persistPublicPortalEntity<K extends EntityName>(entity: K, value: AppState[K][number]) {
  if (entity === "messages") return portalPersistMessage(value as never);
  if (entity === "documents") return portalPersistDocument(value as never);
  if (entity === "pricings") return portalPersistProposalStatus(value as never, ((value as any).status ?? "Aceita") as "Aceita" | "Recusada");
  // tasks, automationRuns and generated finances are created by the RPCs above or are internal-only.
  return null;
}

export function useNexState(profile: AuthProfile | null, reloadKey = "demo") {
  const [state, setState] = useState<AppState>(databaseMode === "production" ? emptyState() : defaultState);
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

    if (isPublicPortal(profile)) {
      const portalState = loadPublicPortalState();
      setState(scopeStateForProfile(deriveOperationalStatuses(portalState), profile));
      setSyncStatus("online");
      setLoading(false);
      return () => { mounted = false; };
    }

    if (!profile && databaseMode === "production") {
      setState(emptyState());
      setSyncStatus("online");
      setLoading(false);
      return () => { mounted = false; };
    }

    loadNormalizedState()
      .then((loaded) => {
        if (!mounted) return;
        setState(scopeStateForProfile(deriveOperationalStatuses(loaded), profile));
        setSyncStatus(databaseMode === "production" ? "online" : "demo");
      })
      .catch((error) => {
        console.error(error);
        if (databaseMode === "production") {
          setState(emptyState());
          setSyncStatus("offline");
          notify({ tone: "error", title: "Sincronização não concluída", message: humanizeSupabaseError(error) });
          return;
        }
        setState(scopeStateForProfile(deriveOperationalStatuses(defaultState), profile));
        setSyncStatus("offline");
        notify({ tone: "info", title: "Modo demonstração", message: "Sem Supabase configurado, o app usa apenas dados de demonstração para validação visual." });
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [notify, reloadKey, profile]);

  useEffect(() => {
    if (!loading && databaseMode === "demo") saveLocalState(state);
  }, [loading, state]);

  const commit = useCallback(async <K extends EntityName>(entity: K, value: AppState[K][number], action: "create" | "update" | "archive" | "restore" = "create") => {
    try {
      assertEntityActionAllowed(profile, entity, action, value, state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Você não tem permissão para essa ação.";
      notify({ tone: "error", title: "Ação bloqueada", message });
      throw error;
    }
    const scopedValue = ensureOrganizationScope(entity, value, profile);
    const validation = validateEntityBeforeCommit(entity, scopedValue);
    if (!validation.ok) {
      notify({ tone: "error", title: "Registro não salvo", message: validation.errors.join(" ") });
      throw new Error(validation.errors.join(" "));
    }

    const previousState = state;
    const sideEffects = isPublicPortal(profile) ? [] : buildSideEffects(entity, scopedValue, action, state);
    let draftState = applyMutationToState(state, entity, scopedValue);
    for (const effect of sideEffects) draftState = applyMutationToState(draftState, effect.entity, effect.value as never);
    const nextState = scopeStateForProfile(deriveOperationalStatuses(draftState), profile);
    setState(nextState);

    try {
      if (isPublicPortal(profile)) {
        await persistPublicPortalEntity(entity, scopedValue);
      } else {
        await persistEntity(entity, scopedValue, nextState);
        for (const effect of sideEffects) await persistEntity(effect.entity, effect.value as never, nextState);
        await auditLog(actionName(entity, action), { module: entity, entityId: (scopedValue as { id: string }).id, value: scopedValue, action, sideEffects: sideEffects.map((e) => e.entity) });
      }
      setSyncStatus(databaseMode === "production" ? "online" : "demo");
    } catch (error) {
      console.error(error);
      if (databaseMode === "production") {
        setState(previousState);
        setSyncStatus("offline");
        const message = humanizeSupabaseError(error);
        notify({ tone: "error", title: "Não salvo no Supabase", message: `${message} A alteração foi desfeita para impedir dados locais falsos.` });
        throw error;
      }
      setSyncStatus("offline");
      notify({ tone: "error", title: "Falha de sincronização", message: "A gravação local só é permitida no ambiente de desenvolvimento/demo." });
    }
  }, [notify, profile, state]);

  const remove = useCallback(async <K extends EntityName>(entity: K, id: string) => {
    try {
      assertEntityActionAllowed(profile, entity, "delete", { id }, state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Você não tem permissão para excluir esse registro.";
      notify({ tone: "error", title: "Exclusão bloqueada", message });
      throw error;
    }
    const previousState = state;
    const nextState = scopeStateForProfile({ ...state, [entity]: (state[entity] as Array<{ id: string }>).filter((item) => item.id !== id) } as AppState, profile);
    setState(nextState);
    try {
      if (isPublicPortal(profile)) throw new Error("Portal do cliente não pode excluir registros.");
      await deleteEntityRemote(entity, id);
      await auditLog(`delete_${String(entity)}`, { module: entity, entityId: id });
      setSyncStatus(databaseMode === "production" ? "online" : "demo");
    } catch (error) {
      console.error(error);
      if (databaseMode === "production") {
        setState(previousState);
        setSyncStatus("offline");
        notify({ tone: "error", title: "Não excluído no Supabase", message: humanizeSupabaseError(error) });
        throw error;
      }
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
