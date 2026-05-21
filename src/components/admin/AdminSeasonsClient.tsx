"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Season, SeasonStatus } from "@/types/league";
import { cn } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-300/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.65rem] font-black uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const STATUS_OPTIONS: SeasonStatus[] = ["pre-season", "active", "post-season", "offseason"];

const STATUS_COLORS: Record<SeasonStatus, string> = {
  "pre-season": "border-slate-400/30 bg-slate-400/10 text-slate-300",
  active: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  "post-season": "border-amber-400/30 bg-amber-400/10 text-amber-300",
  offseason: "border-slate-600/30 bg-slate-600/10 text-slate-500",
};

function emptySeasonForm(nextId: string): Omit<Season, "id"> & { id: string } {
  return {
    id: nextId,
    name: "",
    status: "pre-season",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    currentWeek: 0,
  };
}

export function AdminSeasonsClient({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Season | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const nextSeasonId = `s${seasons.length + 1}`;

  function openNew() {
    setEditing(emptySeasonForm(nextSeasonId));
    setIsNew(true);
    setMessage("");
  }

  function openEdit(season: Season) {
    setEditing({ ...season });
    setIsNew(false);
    setMessage("");
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setMessage("Name is required."); return; }
    if (!editing.startDate || !editing.endDate) { setMessage("Start and end dates are required."); return; }

    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ? `Save failed: ${json.error}` : "Save failed.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function advanceWeek(season: Season) {
    setAdvancingId(season.id);
    setMessage("");
    const res = await fetch(`/api/admin/seasons/${season.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advanceWeek" }),
    });
    setAdvancingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Advance week failed.");
      return;
    }
    router.refresh();
  }

  async function changeStatus(season: Season, status: SeasonStatus) {
    setMessage("");
    const res = await fetch(`/api/admin/seasons/${season.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Status update failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">{seasons.length} season{seasons.length !== 1 ? "s" : ""} on record.</p>
          {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
        </div>
        <button
          onClick={openNew}
          className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20"
        >
          + New Season
        </button>
      </div>

      {/* Edit / New panel */}
      {editing && (
        <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
          <p className="mb-3 text-xs font-black uppercase text-slate-400">{isNew ? "New Season" : `Editing: ${editing.name || "…"}`}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Season ID (immutable after create)">
              <input
                value={editing.id}
                onChange={(e) => isNew && setEditing({ ...editing, id: e.target.value })}
                readOnly={!isNew}
                className={cn(inputClass, !isNew && "opacity-50 cursor-not-allowed")}
              />
            </Field>
            <Field label="Name">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={64} className={inputClass} />
            </Field>
            <Field label="Status">
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as SeasonStatus })} className={inputClass}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="End Date">
              <input type="date" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Current Week">
              <input type="number" min={0} value={editing.currentWeek} onChange={(e) => setEditing({ ...editing, currentWeek: Number(e.target.value) })} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => void save()} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
              {saving ? "Saving..." : isNew ? "Create Season" : "Save Season"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Seasons list */}
      <div className="space-y-3">
        {seasons.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-slate-500">No seasons yet.</p>
        )}
        {seasons.map((season) => (
          <div key={season.id} className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-black text-white">{season.name}</p>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[0.55rem] font-black uppercase", STATUS_COLORS[season.status])}>
                    {season.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  {season.startDate} → {season.endDate} · Week {season.currentWeek}
                </p>
                <p className="mt-1 text-[0.6rem] font-black uppercase text-slate-600">ID: {season.id}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {/* Status quick-toggle */}
                {STATUS_OPTIONS.filter((s) => s !== season.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => void changeStatus(season, s)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200"
                  >
                    → {s}
                  </button>
                ))}
                <button
                  onClick={() => void advanceWeek(season)}
                  disabled={advancingId === season.id}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-cyan-200 transition hover:bg-cyan-300/20 disabled:opacity-50"
                >
                  {advancingId === season.id ? "…" : "Advance Week ▶"}
                </button>
                <button
                  onClick={() => openEdit(season)}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
