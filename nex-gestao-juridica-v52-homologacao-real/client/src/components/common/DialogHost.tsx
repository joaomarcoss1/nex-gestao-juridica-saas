import { useEffect, useState } from "react";
import { Button, Field, Modal } from "@/components/ui/Primitives";
import { dialogRequestEvent, type DialogRequest } from "@/services/dialog.service";

export function DialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const listener = (event: Event) => {
      const next = (event as CustomEvent<DialogRequest>).detail;
      setRequest((current) => {
        if (current?.kind === "confirm") current.resolve(false);
        else if (current?.kind === "text") current.resolve(null);
        return next;
      });
      setValue(next.kind === "text" ? next.defaultValue : "");
      setError("");
    };
    window.addEventListener(dialogRequestEvent, listener);
    return () => window.removeEventListener(dialogRequestEvent, listener);
  }, []);

  function close() {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(false);
    else request.resolve(null);
    setRequest(null);
  }
  function confirm() {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(true);
    else {
      const normalized = value.trim();
      if (request.required && !normalized) { setError("Preencha este campo para continuar."); return; }
      request.resolve(normalized || null);
    }
    setRequest(null);
  }

  return <Modal open={!!request} title={request?.title ?? "Confirmação"} subtitle={request?.message} onClose={close} footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button variant={request?.kind === "confirm" ? "danger" : "primary"} onClick={confirm}>{request?.kind === "confirm" ? "Confirmar" : "Continuar"}</Button></>}>
    {request?.kind === "text" && <Field label="Informação"><textarea autoFocus value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} rows={4}/></Field>}
    {error && <div className="form-errors"><span>{error}</span></div>}
  </Modal>;
}
