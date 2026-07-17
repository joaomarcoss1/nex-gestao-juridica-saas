import { useEffect, useState } from "react";
import type { LegalDoc } from "@/types/app";
import { Button, Panel, PanelTitle } from "@/components/ui/Primitives";
import { createSignedDocumentUrl } from "@/services/storage.service";

export function DocumentViewer({ document }: { document: LegalDoc }) {
  const [url, setUrl] = useState(document.dataUrl ?? "");
  useEffect(() => {
    if (document.storagePath) createSignedDocumentUrl(document.storagePath).then(setUrl).catch(() => setUrl(""));
  }, [document.storagePath]);
  return <Panel><PanelTitle title="Visualizador seguro" subtitle="Usa URL assinada temporária quando o arquivo está no Storage privado." />{url ? <iframe title={document.name} src={url} className="document-frame" /> : <p>Documento sem pré-visualização. Faça upload para Storage ou use arquivo local.</p>}<Button variant="ghost" onClick={() => { if (url) window.open(url, "_blank"); }}>Abrir em nova guia</Button></Panel>;
}
