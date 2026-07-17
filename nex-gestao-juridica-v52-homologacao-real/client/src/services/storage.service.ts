import { supabase } from "./supabase";
import { getCurrentOrganizationId } from "./authContext";
import { auditLog } from "./audit";

export async function sha256File(file: File) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function assertAllowedDocument(file: File) {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(file.type)) throw new Error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10MB.");
}

export async function uploadPrivateDocument(file: File, documentId: string, clientId?: string, processId?: string) {
  assertAllowedDocument(file);
  const hash = await sha256File(file);
  if (!supabase) return { path: `demo/${documentId}/${file.name}`, signedUrl: URL.createObjectURL(file), hash };
  const orgId = getCurrentOrganizationId();
  if (!orgId) throw new Error("Organização não identificada para o upload.");
  const extensionByMime: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
  const extension = extensionByMime[file.type];
  if (!extension) throw new Error("Extensão incompatível com o tipo real do arquivo.");
  const safeClient = clientId || "interno";
  const safeProcess = processId || "sem-processo";
  const path = `${orgId}/${safeClient}/${safeProcess}/${documentId}/${hash}.${extension}`;
  const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  await auditLog("upload_documento_privado", { module: "documents", entityId: documentId, path, fileName: file.name, hash, size: file.size, mime: file.type });
  const signedUrl = await createSignedDocumentUrl(path, 60 * 10, "visualização pós-upload");
  return { path, signedUrl, hash };
}

export async function createSignedDocumentUrl(path: string, expiresIn = 60 * 10, reason = "download/visualização") {
  if (!supabase || !path) return "";
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, expiresIn);
  if (error) throw error;
  await auditLog("download_documento_url_assinada", { module: "documents", entityId: path, reason, expiresIn });
  return data.signedUrl;
}

export async function removePrivateDocument(path: string) {
  if (!supabase || !path) return;
  const { error } = await supabase.storage.from("documentos").remove([path]);
  if (error) throw error;
  await auditLog("delete_documento_storage", { module: "documents", entityId: path });
}
