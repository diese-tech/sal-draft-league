"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId, LeagueData, Match, MatchStatus } from "@/types/league";
import { cn } from "@/lib/utils";

const emptyMatch = (data: LeagueData): Match => ({
  id: `match-${Date.now()}`,
  divisionId: "solar",
  homeOrgId: data.orgs[0]?.id ?? "",
  awayOrgId: data.orgs[1]?.id ?? "",
  scheduledDate: new Date().toISOString().slice(0, 10),
  scheduledTime: "20:00",
  status: "scheduled",
  week: data.season.currentWeek,
});

export function AdminMatchesClient({ data }: { data: LeagueData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Match | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const sorted = useMemo(
    () => [...data.matches].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime)),
    [data.matches],
  );

  const orgOptions = data.orgs.filter((org) => !editing || org.divisionId === editing.divisionId);
  const getOrg = (id: string) => data.orgs.find((org) => org.id === id);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        week: Number(editing.week),
        homeScore: editing.status === "completed" ? Number(editing.homeScore ?? 0) : undefined,
        awayScore: editing.status === "completed" ? Number(editing.awayScore ?? 0) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ? `Save failed: ${data.error}` : "Save failed. Check Supabase env and admin session.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">{data.matches.length} total matches. Completed scores recalculate standings.</p>
          {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
        </div>
        <button onClick={() => setEditing(emptyMatch(data))} className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20">
          + Schedule Match
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Division">
              <select value={editing.divisionId} onChange={(e) => setEditing({ ...editing, divisionId: e.target.value as DivisionId })} className={inputClass}>
                {data.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
              </select>
            </Field>
            <Field label="Home">
              <select value={editing.homeOrgId} onChange={(e) => setEditing({ ...editing, homeOrgId: e.target.value })} className={inputClass}>
                {orgOptions.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </Field>
            <Field label="Away">
              <select value={editing.awayOrgId} onChange={(e) => setEditing({ ...editing, awayOrgId: e.target.value })} className={inputClass}>
                {orgOptions.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as MatchStatus })} className={inputClass}>
                {["scheduled", "live", "completed", "postponed"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={editing.scheduledDate} onChange={(e) => setEditing({ ...editing, scheduledDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Time">
              <input type="time" value={editing.scheduledTime} onChange={(e) => setEditing({ ...editing, scheduledTime: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Week">
              <input type="number" min={1} value={editing.week} onChange={(e) => setEditing({ ...editing, week: Number(e.target.value) })} className={inputClass} />
            </Field>
            <Field label="Score">
              <div className="flex gap-2">
                <input type="number" min={0} value={editing.homeScore ?? ""} onChange={(e) => setEditing({ ...editing, homeScore: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputClass} />
                <input type="number" min={0} value={editing.awayScore ?? ""} onChange={(e) => setEditing({ ...editing, awayScore: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputClass} />
              </div>
            </Field>
            <Field label="Stream URL">
              <input value={editing.streamUrl ?? ""} onChange={(e) => setEditing({ ...editing, streamUrl: e.target.value || undefined })} className={inputClass} />
            </Field>
            <Field label="VOD URL">
              <input value={editing.vodUrl ?? ""} onChange={(e) => setEditing({ ...editing, vodUrl: e.target.value || undefined })} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
              {saving ? "Saving..." : "Save Match"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/70">
        {sorted.map((match) => (
          <button key={match.id} onClick={() => setEditing(match)} className="grid w-full gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.04] last:border-0 sm:grid-cols-[7rem_1fr_7rem_5rem] sm:items-center">
            <span className={cn("w-fit rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase", match.status === "live" ? "border-orange-300/40 bg-orange-300/15 text-orange-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100")}>{match.status}</span>
            <span className="min-w-0 font-black text-white">{getOrg(match.homeOrgId)?.name} <span className="text-slate-500">vs</span> {getOrg(match.awayOrgId)?.name}</span>
            <span className="text-xs font-semibold text-slate-400">{match.scheduledDate} {match.scheduledTime}</span>
            <span className="text-xs font-black uppercase text-slate-500">Wk {match.week}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-300/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.65rem] font-black uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}
