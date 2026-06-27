import { useMemo, useState } from "react";
import { Edit3, PlugZap, Search, ShieldCheck, Trash2, WifiOff } from "lucide-react";
import type { FeaturePageProps, Integration } from "@/types/app";
import { ActionBar, Button, Kpi, Panel, PanelTitle, StatusBadge } from "@/components/ui/Primitives";
import { EntityFormModal, type FieldConfig } from "@/components/forms/EntityFormModal";
import { statusTone, todayIso, uid } from "@/utils/format";

const providers: Integration["provider"][] = ["Asaas", "Mercado Pago", "Stripe", "WhatsApp Business", "Evolution API", "E-mail", "Tribunais", "ICP-Brasil", "Outro"];
const statuses: Integration["status"][] = ["Desconectado", "Preparado", "Conectado", "Erro"];
function blankIntegration(): Integration { return { id: uid("int"), provider: "Outro", status: "Preparado", description: "Integração preparada. Configure credenciais e backend seguro para ativar.", requiresBackend: true, lastSync: "" }; }
export function IntegracoesPage({ state, commit, remove, notify }: FeaturePageProps) {
  const [editing, setEditing] = useState<Integration | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => state.integrations.filter((i) => !i.archivedAt && [i.provider, i.status, i.description].some((v)=>String(v).toLowerCase().includes(query.toLowerCase()))), [query, state.integrations]);
  const fields: FieldConfig<Integration>[] = [
    { key: "provider", label: "Provedor", kind: "select", options: providers },
    { key: "status", label: "Status", kind: "select", options: statuses },
    { key: "description", label: "Descrição", kind: "textarea" },
    { key: "lastSync", label: "Última sincronização", kind: "date" },
  ];
  async function save(item: Integration) {
    const isNew = !state.integrations.some((i)=>i.id===item.id);
    await commit("integrations", item, isNew ? "create" : "update");
    setEditing(null);
    notify({ tone: "success", title: isNew ? "Integração criada" : "Integração atualizada", message: "Credenciais sensíveis devem ficar em backend/Edge Function, nunca no frontend." });
  }
  async function test(item: Integration) {
    await commit("integrations", { ...item, lastSync: todayIso(), status: item.status === "Desconectado" ? "Preparado" : item.status }, "update");
    notify({ tone: "info", title: "Teste de conexão registrado", message: "Essa tela valida estrutura; ativação real exige API/backend seguro." });
  }
  return <div className="page-grid">
    <div className="kpi-row"><Kpi icon={PlugZap} label="Integrações" value={filtered.length} note="externas" tone="blue"/><Kpi icon={ShieldCheck} label="Segurança" value="Backend" note="sem chaves no front" tone="green"/><Kpi icon={WifiOff} label="Preparadas" value={filtered.filter((i)=>i.status==='Preparado').length} note="aguardam credenciais" tone="gold"/></div>
    <Panel><PanelTitle title="Integrações seguras" subtitle="PIX, boleto, WhatsApp, tribunais e assinatura exigem API real, webhooks e backend seguro." action={<Button onClick={()=>setEditing(blankIntegration())}>Nova integração</Button>} />
      <div className="search-row"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar provedor, status ou descrição" /></div>
      <p className="legal-note">Integrações externas não são ativadas apenas com credencial. Cada provedor precisa de backend seguro, webhooks, logs e tratamento de erro.</p>
    </Panel>
    <div className="data-grid">{filtered.map((item)=><article className="data-card floating-card" key={item.id}><div className="card-top"><PlugZap size={20}/><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></div><strong>{item.provider}</strong><small>{item.description}</small><p>{item.requiresBackend ? "Requer backend seguro/Edge Function." : "Pode operar no frontend."}</p><ActionBar><Button variant="ghost" onClick={()=>test(item)}>Testar</Button><Button variant="ghost" onClick={()=>setEditing(item)}><Edit3 size={15}/> Editar</Button><Button variant="danger" onClick={()=>remove("integrations", item.id)}><Trash2 size={15}/></Button></ActionBar></article>)}</div>
    {editing && <EntityFormModal<Integration> open={!!editing} title={state.integrations.some((i)=>i.id===editing.id)?"Editar integração":"Nova integração"} subtitle="Não salve tokens reais no frontend. Use backend seguro." value={editing} fields={fields} onClose={()=>setEditing(null)} onSave={save} />}
  </div>;
}
