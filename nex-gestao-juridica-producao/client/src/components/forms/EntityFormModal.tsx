import { useEffect, useState } from "react";
import { Button, Field, Modal } from "@/components/ui/Primitives";

export type FieldKind = "text" | "number" | "select" | "date" | "textarea" | "email" | "password";

export type FieldConfig<T> = {
  key: keyof T;
  label: string;
  kind?: FieldKind;
  options?: Array<string | { value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
};

function optionValue(option: string | { value: string; label: string }) {
  return typeof option === "string" ? option : option.value;
}
function optionLabel(option: string | { value: string; label: string }) {
  return typeof option === "string" ? option : option.label;
}

export function EntityFormModal<T extends { id: string }>({
  open,
  title,
  subtitle,
  value,
  fields,
  onClose,
  onSave,
  saveLabel = "Salvar alterações",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  value: T;
  fields: FieldConfig<T>[];
  onClose: () => void;
  onSave: (value: T) => void | Promise<void>;
  saveLabel?: string;
}) {
  const [draft, setDraft] = useState<T>(value);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => setDraft(value), [value, open]);

  function update(key: keyof T, raw: string, kind?: FieldKind) {
    setDraft((current) => ({ ...current, [key]: kind === "number" ? Number(raw) || 0 : raw }));
  }

  async function submit() {
    const missing = fields.filter((field) => field.required && !String(draft[field.key] ?? "").trim()).map((field) => `${field.label} é obrigatório.`);
    if (missing.length) { setErrors(missing); return; }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return <Modal open={open} title={title} subtitle={subtitle} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : saveLabel}</Button></>}>
    {errors.length > 0 && <div className="form-errors">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
    <div className="form-grid">
      {fields.map((field) => {
        const rawValue = draft[field.key];
        const valueString = rawValue == null ? "" : String(rawValue);
        if (field.kind === "textarea") {
          return <Field key={String(field.key)} label={field.label}><textarea value={valueString} readOnly={field.readOnly} placeholder={field.placeholder} onChange={(e) => update(field.key, e.target.value, field.kind)} /></Field>;
        }
        if (field.kind === "select") {
          return <Field key={String(field.key)} label={field.label}><select value={valueString} disabled={field.readOnly} onChange={(e) => update(field.key, e.target.value, field.kind)}>{(field.options ?? []).map((option) => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}</select></Field>;
        }
        return <Field key={String(field.key)} label={field.label}><input type={field.kind ?? "text"} value={valueString} readOnly={field.readOnly} placeholder={field.placeholder} min={field.min} max={field.max} step={field.step} onChange={(e) => update(field.key, e.target.value, field.kind)} /></Field>;
      })}
    </div>
  </Modal>;
}
