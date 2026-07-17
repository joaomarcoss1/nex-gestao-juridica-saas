import type { LegalDoc } from "@/types/app";
import { Panel, PanelTitle } from "@/components/ui/Primitives";

export function DocumentVersionHistory({ document }: { document: LegalDoc }) {
  return <Panel><PanelTitle title="Histórico de versões" subtitle="Versões documentais com rastreabilidade e hash."/><ul className="timeline-list"><li><b>{document.version}</b><span>{document.hash ? `Hash ${document.hash.slice(0, 16)}...` : "Hash ainda não calculado"}</span></li></ul></Panel>;
}
