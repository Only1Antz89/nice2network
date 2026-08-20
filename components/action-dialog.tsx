"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import N2Select from "@/components/n2-select";

export type ActionDialogField = {
  name: string;
  label: string;
  kind?: "input" | "textarea" | "select";
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  inputType?: "text" | "password";
  autoComplete?: string;
  trim?: boolean;
  multiline?: boolean;
  options?: Array<{ value: string; label: string }>;
};

export default function ActionDialog({ eyebrow, title, description, confirmLabel, cancelLabel = "Cancel", danger = false, error, fields = [], onClose, onConfirm }: {
  eyebrow: string;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  error?: string;
  fields?: ActionDialogField[];
  onClose: () => void;
  onConfirm: (values: Record<string, string>) => boolean | void | Promise<boolean | void>;
}) {
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(fields.map((field) => {
      const value = String(data.get(field.name) ?? "");
      return [field.name, field.trim === false ? value : value.trim()];
    }));
    const result = await onConfirm(values);
    setBusy(false);
    if (result !== false) onClose();
  }

  return (
    <div className="modal-backdrop action-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <form className="n2-editor-modal action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" onSubmit={submit}>
        <header>
          <div><span className="eyebrow">{eyebrow}</span><h2 id="action-dialog-title">{title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={18} /></button>
        </header>
        <div className="n2-editor-fields">
          {description && <p>{description}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {fields.map((field, index) => (
            <label key={field.name}>
              <span>{field.label}</span>
              {field.kind === "select" ? (
                <N2Select ref={index === 0 ? firstField as React.RefObject<HTMLButtonElement> : undefined} name={field.name} defaultValue={field.defaultValue} required={field.required} ariaLabel={field.label} options={field.options ?? []} />
              ) : field.kind === "input" || field.multiline === false ? (
                <input ref={index === 0 ? firstField as React.RefObject<HTMLInputElement> : undefined} name={field.name} type={field.inputType} autoComplete={field.autoComplete} defaultValue={field.defaultValue} placeholder={field.placeholder} required={field.required} minLength={field.minLength} maxLength={field.maxLength} />
              ) : (
                <textarea ref={index === 0 ? firstField as React.RefObject<HTMLTextAreaElement> : undefined} name={field.name} defaultValue={field.defaultValue} placeholder={field.placeholder} required={field.required} minLength={field.minLength} maxLength={field.maxLength} />
              )}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className={`primary-button ${danger ? "danger" : ""}`} disabled={busy}>{danger && <Trash2 size={15} />} {busy ? (danger ? "Deleting…" : "Saving…") : confirmLabel}</button>
        </footer>
      </form>
    </div>
  );
}
