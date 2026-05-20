"use client";

import { useState } from "react";
import type { FormField, FormFieldType } from "@/types/auth";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select (dropdown)" },
  { value: "multiselect", label: "Multi-select" },
  { value: "textarea", label: "Textarea" },
  { value: "checkbox", label: "Checkbox" },
];

const emptyField = (): Omit<FormField, "id"> => ({
  key: "",
  label: "",
  fieldType: "text",
  required: true,
  fieldOrder: 99,
  locked: false,
  hidden: false,
  placeholder: "",
  validationHint: "",
  options: undefined,
});

export function AdminFormFieldsClient({ fields: initial }: { fields: FormField[] }) {
  const [fields, setFields] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState(emptyField());
  const [optionsInput, setOptionsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function toggleHidden(field: FormField) {
    setSaving(true);
    const updated = { ...field, hidden: !field.hidden };
    const res = await fetch("/api/admin/form-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) setFields((prev) => prev.map((f) => (f.id === field.id ? updated : f)));
    setSaving(false);
  }

  async function deleteField(field: FormField) {
    if (!confirm(`Delete field "${field.label}"? This cannot be undone.`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/form-fields?id=${field.id}`, { method: "DELETE" });
    if (res.ok) setFields((prev) => prev.filter((f) => f.id !== field.id));
    setSaving(false);
  }

  async function saveNewField() {
    setSaving(true);
    setMessage(null);
    const id = `ff-custom-${crypto.randomUUID().slice(0, 8)}`;
    const options =
      newField.fieldType === "select" || newField.fieldType === "multiselect"
        ? optionsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    const field: FormField = {
      ...newField,
      id,
      fieldOrder: Math.max(...fields.map((f) => f.fieldOrder), 0) + 1,
      options,
    };
    const res = await fetch("/api/admin/form-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(field),
    });
    const data = await res.json();
    if (res.ok) {
      setFields((prev) => [...prev, field].sort((a, b) => a.fieldOrder - b.fieldOrder));
      setAdding(false);
      setNewField(emptyField());
      setOptionsInput("");
      setMessage({ text: "Field added.", ok: true });
    } else {
      setMessage({ text: data.error ?? "Failed.", ok: false });
    }
    setSaving(false);
  }

  return (
    <div>
      {/* Existing fields */}
      <div className="mb-4 space-y-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/84 p-3 backdrop-blur",
              field.hidden && "opacity-50",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-white">{field.label}</p>
                {field.locked && (
                  <span className="rounded-lg border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[0.6rem] font-black uppercase text-slate-500">
                    Locked
                  </span>
                )}
                {field.hidden && (
                  <span className="rounded-lg border border-amber-300/20 bg-amber-300/8 px-2 py-0.5 text-[0.6rem] font-black uppercase text-amber-400">
                    Hidden
                  </span>
                )}
                <span className="text-[0.6rem] font-black uppercase text-slate-600">
                  {field.fieldType}
                  {field.required && " · required"}
                </span>
              </div>
              <p className="text-xs text-slate-600">key: {field.key}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => toggleHidden(field)}
                disabled={saving}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                {field.hidden ? "Show" : "Hide"}
              </button>
              {!field.locked && (
                <button
                  onClick={() => deleteField(field)}
                  disabled={saving}
                  className="rounded-lg border border-red-300/20 bg-red-300/8 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-400 transition hover:bg-red-300/15 disabled:opacity-40"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add field form */}
      {adding ? (
        <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/84 p-5 backdrop-blur">
          <p className="mb-4 text-sm font-black uppercase text-slate-400">New Field</p>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Label</label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Preferred Timezone"
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">
                  Key <span className="text-slate-600 normal-case">(lowercase_snake)</span>
                </label>
                <input
                  type="text"
                  value={newField.key}
                  onChange={(e) =>
                    setNewField((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))
                  }
                  placeholder="preferred_timezone"
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-mono font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Type</label>
                <select
                  value={newField.fieldType}
                  onChange={(e) => setNewField((f) => ({ ...f, fieldType: e.target.value as FormFieldType }))}
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500/40"
                >
                  {TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  Required
                </label>
              </div>
            </div>

            {(newField.fieldType === "select" || newField.fieldType === "multiselect") && (
              <div>
                <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">
                  Options <span className="normal-case text-slate-600">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                  className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Placeholder (optional)</label>
              <input
                type="text"
                value={newField.placeholder ?? ""}
                onChange={(e) => setNewField((f) => ({ ...f, placeholder: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={saveNewField}
              disabled={saving || !newField.label || !newField.key}
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-4 py-2 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/22 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Field"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewField(emptyField()); }}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-white/15 bg-transparent py-3 text-xs font-black uppercase text-slate-500 transition hover:border-white/25 hover:text-slate-300"
        >
          + Add custom field
        </button>
      )}

      {message && (
        <p className={cn("mt-3 text-xs font-semibold", message.ok ? "text-emerald-400" : "text-red-400")}>
          {message.text}
        </p>
      )}
    </div>
  );
}
