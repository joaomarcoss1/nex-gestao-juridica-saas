import type { LegalDoc } from "@/types/app";
import { createCrudService } from "./crudServiceFactory";
import { createSignedDocumentUrl } from "./storage.service";

export const documentsService = {
  ...createCrudService("documents"),
  approve(doc: LegalDoc, userId?: string): LegalDoc {
    return { ...doc, status: "Aprovado", rejectionComment: "", updatedAt: new Date().toISOString(), hash: doc.hash ?? "hash pendente de storage" };
  },
  reject(doc: LegalDoc, reason: string): LegalDoc {
    return { ...doc, status: "Recusado", rejectionComment: reason, updatedAt: new Date().toISOString() };
  },
  async signedUrl(doc: LegalDoc) {
    return doc.storagePath ? createSignedDocumentUrl(doc.storagePath) : doc.dataUrl ?? "";
  },
};
