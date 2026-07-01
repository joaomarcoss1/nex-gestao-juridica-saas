import { buildResult, validateRequired, type ValidationResult } from "./common";

export function validateDocument(data: Record<string, unknown>): ValidationResult {
  const errors = [...validateRequired(data, ["name", "type", "client", "status", "origin", "responsible", "version"]).errors];
  const size = Number(data.sizeBytes ?? 0);
  if (size > 10 * 1024 * 1024) errors.push("Documento acima do limite de 10MB.");
  const mime = String(data.mimeType ?? "");
  if (mime && !["image/jpeg", "image/png", "application/pdf"].includes(mime)) errors.push("Tipo de documento não permitido. Use PDF, JPG ou PNG.");
  return buildResult(errors);
}
