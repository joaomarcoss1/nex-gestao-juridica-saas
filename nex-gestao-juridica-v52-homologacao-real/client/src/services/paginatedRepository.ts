import type { EntityName } from "@/types/app";
import { getCurrentOrganizationId, getCurrentProfileRole } from "./authContext";
import { requireSupabase } from "./supabase";
export type PageFilter = { column:string; value:string|number|boolean|null; operator?:"eq"|"neq"|"gte"|"lte"|"ilike" };
export type PageQuery = { page?:number; pageSize?:number; search?:string; searchColumns?:string[]; filters?:PageFilter[]; sort?:{column:string;ascending?:boolean}; dateColumn?:string; dateFrom?:string; dateTo?:string };
export type PageResult<T> = { rows:T[]; total:number; page:number; pageSize:number; hasNextPage:boolean };
const tables: Partial<Record<EntityName,string>> = { leads:"leads", processes:"processes", tasks:"tasks", finances:"financial_entries", scheduledEvents:"scheduled_events", documents:"documents", auditLogs:"audit_logs", clients:"clients", deadlines:"deadlines", processMovements:"process_movements" };
function col(v:string){ if(!/^[a-z_][a-z0-9_]*$/i.test(v)) throw new Error("Coluna de paginação inválida."); return v; }
export async function loadEntityPage<T extends Record<string,unknown>>(entity:EntityName,input:PageQuery={}):Promise<PageResult<T>>{
 const table=tables[entity]; if(!table) throw new Error(`Paginação não configurada para ${entity}.`);
 const page=Math.max(1,Math.trunc(input.page??1)); const pageSize=Math.min(100,Math.max(10,Math.trunc(input.pageSize??25))); const from=(page-1)*pageSize; const to=from+pageSize-1;
 const db=requireSupabase(); const role=String(getCurrentProfileRole()??"").toLowerCase(); const org=getCurrentOrganizationId(); const master=["admin_master","admin_master_global"].includes(role);
 let q=db.from(table).select("*",{count:"exact"}).range(from,to); if(org&&!master) q=q.eq("organization_id",org);
 for(const f of input.filters??[]){ const c=col(f.column); const op=f.operator??"eq"; if(op==="eq")q=q.eq(c,f.value); else if(op==="neq")q=q.neq(c,f.value); else if(op==="gte")q=q.gte(c,f.value); else if(op==="lte")q=q.lte(c,f.value); else q=q.ilike(c,`%${String(f.value??"").replace(/[%_,()]/g,"")}%`); }
 if(input.dateColumn&&input.dateFrom)q=q.gte(col(input.dateColumn),input.dateFrom); if(input.dateColumn&&input.dateTo)q=q.lte(col(input.dateColumn),input.dateTo);
 if(input.search?.trim()&&input.searchColumns?.length){ const term=input.search.trim().replace(/[%_,()]/g,""); q=q.or(input.searchColumns.map(c=>`${col(c)}.ilike.%${term}%`).join(",")); }
 const sort=input.sort??{column:"created_at",ascending:false}; q=q.order(col(sort.column),{ascending:Boolean(sort.ascending)});
 const {data,count,error}=await q; if(error)throw new Error(`Falha ao carregar ${entity}: ${error.message}`); const total=count??0; return {rows:(data??[]) as T[],total,page,pageSize,hasNextPage:to+1<total};
}
