"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId, LeagueData, Match, MatchStatus } from "@/types/league";
import { cn } from "@/lib/utils";

const ALL_STATUSES: MatchStatus[] = ["scheduled", "live", "completed", "postponed"];

function emptyMatch(data: LeagueData): Match {
  const firstOrg = data.orgs[0];
  const secondOrg = data.orgs.find((o) => o.id !== firstOrg?.id) ?? data.orgs[1];
  return {
    id: crypto.randomUUID(),
    divisionId: "solar",
    homeOrgId: firstOrg?.id ?? "",
    awayOrgId: secondOrg?.id ?? "",
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: "20:00",
    status: "scheduled",
    week: data.season.currentWeek,
  };
}

export function AdminMatchesClient({ data }: { data: LeagueData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Match | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Filters
  const [divFilter, setDivFilter] = useState<DivisionId | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");

  const weeks = useMemo(() => [...new Set(data.matches.map((m) => m.week))].sort((a, b) => a - b), [data.matches]);

  const sorted = useMemo(
    () =>
      [...data.matches]
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
        .filter((m) => divFilter === "all" || m.divisionId === divFilter)
        .filter((m) => statusFilter === "all" || m.status === statusFilter)
        .filter((m) => weekFilter === "all" || m.week === weekFilter),
    [data.matches, divFilter, statusFilter, weekFilter],
  );

  const orgOptions = data.orgs.filter((org) => !editing || org.divisionId === editing.divisionId);
  const getOrg = (id: string) => data.orgs.find((org) => org.id === id);

  function startSave() {
    if (!editing) return;
    if (editing.status === "completed") {
      setConfirming(true);
    } else {
      void doSave();
    }
  }

  async function doSave() {
    if (!editing) return;
    setConfirming(false);
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
        <button onClick={() => { setEditing(emptyMatch(data)); setMessage(""); }} className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20">
          + Schedule Match
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "solar", "lunar", "gaia"] as const).map((d) => (
          <FilterChip key={d} active={divFilter === d} onClick={() => setDivFilter(d)}>{d === "all" ? "All Divisions" : d.charAt(0).toUpperCase() + d.slice(1)}</FilterChip>
        ))}
        <span className="w-px self-stretch bg-white/10" />
        {(["all", ...ALL_STATUSES] as const).map((s) => (
          <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</FilterChip>
        ))}
        <span className="w-px self-stretch bg-white/10" />
        <FilterChip active={weekFilter === "all"} onClick={() => setWeekFilter("all")}>All Weeks</FilterChip>
        {weeks.map((w) => (
          <FilterChip key={w} active={weekFilter === w} onClick={() => setWeekFilter(w)}>Wk {w}</FilterChip>
        ))}
      </div>

      {editing && (
        <>
          <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Division">
                <select value={editing.divisionId} onChange={(e) => setEditing({ ...editing, divisionId: e.target.value as DivisionId, homeOrgId: "", awayOrgId: "" })} className={inputClass}>
                  {data.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
                </select>
              </Field>
              <Field label="Home">
                <select value={editing.homeOrgId} onChange={(e) => setEditing({ ...editing, homeOrgId: e.target.value })} className={inputClass}>
                  <option value="">— select —</option>
                  {orgOptions.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </Field>
              <Field label="Away">
                <select value={editing.awayOrgId} onChange={(e) => setEditing({ ...editing, awayOrgId: e.target.value })} className={inputClass}>
                  <option value="">— select —</option>
                  {orgOptions.filter((o) => o.id !== editing.homeOrgId).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as MatchStatus })} className={inputClass}>
                  {ALL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
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
              {editing.status === "completed" && (
                <Field label="Score">
                  <div className="flex gap-2">
                    <input type="number" min={0} placeholder="Home" value={editing.homeScore ?? ""} onChange={(e) => setEditing({ ...editing, homeScore: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputClass} />
                    <input type="number" min={0} placeholder="Away" value={editing.awayScore ?? ""} onChange={(e) => setEditing({ ...editing, awayScore: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputClass} />
                  </div>
                </Field>
              )}
              <Field label="Stream URL">
                <input value={editing.streamUrl ?? ""} onChange={(e) => setEditing({ ...editing, streamUrl: e.target.value || undefined })} className={inputClass} />
              </Field>
              <Field label="VOD URL">
                <input value={editing.vodUrl ?? ""} onChange={(e) => setEditing({ ...editing, vodUrl: e.target.value || undefined })} className={inputClass} />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={startSave} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
                {saving ? "Saving..." : "Save Match"}
              </button>
              <button onClick={() => { setEditing(null); setMessage(""); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
            </div>
          </div>

          {/* Confirmation dialog for completed matches */}
          {confirming && (
            <div className="rounded-2xl border border-orange-300/30 bg-orange-950/40 p-4">
              <p className="text-sm font-semibold text-orange-100">
                Saving a completed match will immediately recalculate standings. This cannot be undone automatically. Continue?
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void doSave()} className="rounded-xl border border-orange-300/40 bg-orange-300/15 px-4 py-2 text-sm font-black uppercase text-orange-100">Yes, save & recalculate</button>
                <button onClick={() => setConfirming(false)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/70">
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">No matches match the current filters.</p>
        )}
        {sorted.map((match) => (
          <button key={match.id} onClick={() => { setEditing(match); setMessage(""); setConfirming(false); }} className="grid w-full gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.04] last:border-0 sm:grid-cols-[7rem_1fr_7rem_5rem] sm:items-center">
            <span className={cn("w-fit rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase", match.status === "live" ? "border-orange-300/40 bg-orange-300/15 text-orange-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100")}>{match.status}</span>
            <span className="min-w-0 font-black text-white">{getOrg(match.homeOrgId)?.name ?? match.homeOrgId} <span className="text-slate-500">vs</span> {getOrg(match.awayOrgId)?.name ?? match.awayOrgId}</span>
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase transition", active ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200")}>
      {children}
    </button>
  );
}
