export type UserRole = "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "rh" | "atendimento" | "controladoria" | "funcionario" | "cliente";

export type RecordStatus = "ativo" | "inativo" | "pendente" | "concluido" | "arquivado";

export type CompanyScopedRecord = {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
};
