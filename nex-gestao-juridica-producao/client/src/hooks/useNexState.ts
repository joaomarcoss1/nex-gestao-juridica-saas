import { useCallback, useEffect, useState } from "react";
import type { AppState, EntityName, Toast } from "@/types/app";
import { auditLog } from "@/services/audit";
import { databaseMode } from "@/services/supabase";
import { deleteEntityRemote, loadNormalizedState, persistEntity, saveLocalState } from "@/services/normalizedRepository";
import { defaultState } from "@/data/defaultState";

export function useNexState() {
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
        setState(loaded);
        setSyncStatus(databaseMode === "production" ? "online" : "demo");
      })
      .catch((error) => {
        console.error(error);
        setSyncStatus("offline");
        notify({ tone: "error", title: "Supabase indisponível", message: "O app continuou em modo local seguro." });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [notify]);

  useEffect(() => {
    if (!loading) saveLocalState(state);
  }, [loading, state]);

  const commit = useCallback(async <K extends EntityName>(entity: K, value: AppState[K][number], action: "create" | "update" | "archive" | "restore" = "create") => {
    let nextState: AppState | null = null;
    setState((current) => {
      const list = current[entity] as Array<AppState[K][number]>;
      const id = (value as { id: string }).id;
      const exists = list.some((item) => (item as { id: string }).id === id);
      nextState = {
        ...current,
        [entity]: exists ? list.map((item) => ((item as { id: string }).id === id ? value : item)) : [value, ...list],
      } as AppState;
      return nextState;
    });
    try {
      await persistEntity(entity, value, nextState ?? state);
      await auditLog(action === "create" ? (entity === "clients" ? "create_cliente" : entity === "processes" ? "create_processo" : entity === "documents" ? "upload_documento" : entity === "automations" || entity === "automationRuns" ? "executar_automacao" : "alterar_financeiro") : (entity === "clients" ? "update_cliente" : entity === "processes" ? "update_processo" : "alterar_financeiro"), { module: entity, entityId: (value as { id: string }).id, value, action });
      setSyncStatus(databaseMode === "production" ? "online" : "demo");
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
      notify({ tone: "error", title: "Salvo localmente", message: "Não foi possível sincronizar com Supabase agora." });
    }
  }, [notify, state]);

  const remove = useCallback(async <K extends EntityName>(entity: K, id: string) => {
    setState((current) => ({ ...current, [entity]: (current[entity] as Array<{ id: string }>).filter((item) => item.id !== id) } as AppState));
    try {
      await deleteEntityRemote(entity, id);
      await auditLog(entity === "clients" ? "delete_cliente" : "alterar_financeiro", { module: entity, entityId: id });
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
    }
  }, []);


  const archive = useCallback(async <K extends EntityName>(entity: K, item: AppState[K][number]) => {
    const id = (item as { id: string }).id;
    const archived = { ...(item as object), archivedAt: new Date().toISOString() } as AppState[K][number];
    await commit(entity, archived, "archive");
    notify({ tone: "info", title: "Item arquivado", message: `Registro ${id} permanece recuperável.` });
  }, [commit, notify]);

  const restore = useCallback(async <K extends EntityName>(entity: K, item: AppState[K][number]) => {
    const restored = { ...(item as object), archivedAt: undefined } as AppState[K][number];
    await commit(entity, restored, "restore");
    notify({ tone: "success", title: "Item restaurado" });
  }, [commit, notify]);

  return { state, loading, syncStatus, commit, remove, archive, restore, notify, toasts };
}
