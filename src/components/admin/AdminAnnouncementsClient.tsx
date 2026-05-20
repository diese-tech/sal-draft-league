"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Announcement, AnnouncementCategory } from "@/types/league";
import { cn } from "@/lib/utils";

const CATEGORIES: AnnouncementCategory[] = ["general", "rules", "draft", "results", "admin"];

function emptyAnnouncement(): Announcement {
  return {
    id: `ann-${crypto.randomUUID()}`,
    title: "",
    body: "",
    category: "general",
    pinned: false,
    createdAt: new Date().toISOString(),
  };
}

export function AdminAnnouncementsClient({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Announcement>(emptyAnnouncement());
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startNew() {
    setForm(emptyAnnouncement());
    setMessage("");
  }

  function loadForEdit(a: Announcement) {
    setForm({ ...a });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) {
      setMessage("Title and body are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ? `Save failed: ${data.error}` : "Save failed.");
      return;
    }
    setMessage("Announcement saved.");
    setForm(emptyAnnouncement());
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setMessage("");
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ? `Delete failed: ${data.error}` : "Delete failed.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Announcements</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[480px_1fr]">
        {/* Editor form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-white">
              {form.id && announcements.some((a) => a.id === form.id) ? "Edit Announcement" : "New Announcement"}
            </h2>
            <button
              onClick={startNew}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Title</label>
              <input
                type="text"
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                placeholder="Announcement title…"
              />
            </div>

            <div>
              <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Body</label>
              <textarea
                maxLength={2000}
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                placeholder="Announcement body…"
              />
              <p className="mt-0.5 text-right text-[0.6rem] text-slate-600">{form.body.length}/2000</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[0.65rem] font-black uppercase text-slate-500">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AnnouncementCategory }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-cyan-400"
                  />
                  <span className="text-sm font-semibold text-slate-300">Pinned</span>
                </label>
              </div>
            </div>

            {message && (
              <p className={cn("text-xs font-semibold", message.startsWith("Save failed") || message.startsWith("Delete failed") ? "text-red-400" : "text-emerald-400")}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/18 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Announcement"}
            </button>
          </div>
        </div>

        {/* Announcements list */}
        <div className="flex flex-col gap-3">
          {announcements.length === 0 && (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          )}
          {announcements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-xl border bg-white/[0.025] p-4 transition",
                form.id === a.id ? "border-cyan-300/40" : "border-white/8 hover:border-white/15",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.pinned && (
                      <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-amber-300">Pinned</span>
                    )}
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-slate-400">{a.category}</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-white">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{a.body}</p>
                  <p className="mt-1 text-[0.6rem] text-slate-600">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => loadForEdit(a)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200"
                  >
                    Edit
                  </button>
                  {confirmDeleteId === a.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                      >
                        {deletingId === a.id ? "…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-500 transition hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(a.id)}
                      className="rounded-lg border border-red-400/20 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-400/70 transition hover:border-red-400/40 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
