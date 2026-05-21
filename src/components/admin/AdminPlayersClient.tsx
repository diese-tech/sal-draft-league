"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId, LeagueData, LeaguePlayer } from "@/types/league";
import type { PlayerRole, PlayerStatus } from "@/types/card-lab";
import { cn } from "@/lib/utils";

const roles: PlayerRole[] = ["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"];

function emptyPlayer(): LeaguePlayer {
  return {
    id: crypto.randomUUID(),
    ign: "",
    discordUsername: "",
    primaryRole: "Flex",
    secondaryRoles: [],
    status: "free-agent",
    isStarter: false,
    isCaptain: false,
    avatarInitials: "",
    avatarGradient: "",
  };
}

export function AdminPlayersClient({
  data,
  isSuperAdmin = false,
}: {
  data: LeagueData;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<LeaguePlayer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmScheduleId, setConfirmScheduleId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState<DivisionId | "all">("all");
  const [orgFilter, setOrgFilter] = useState<string | "all">("all");

  const getOrg = (id?: string) => data.orgs.find((org) => org.id === id);

  const activePlayers = data.players.filter((p) => !p.archivedAt);
  const archivedPlayers = data.players.filter((p) => !!p.archivedAt);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activePlayers.filter((p) => {
      if (divFilter !== "all" && p.divisionId !== divFilter) return false;
      if (orgFilter !== "all" && (orgFilter === "__free_agent__" ? !!p.orgId : p.orgId !== orgFilter)) return false;
      if (q && !p.ign.toLowerCase().includes(q) && !p.discordUsername.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activePlayers, search, divFilter, orgFilter]);

  function openEdit(player: LeaguePlayer) {
    setEditing({ ...player });
    setIsNew(false);
    setMessage("");
  }

  function openNew() {
    setEditing(emptyPlayer());
    setIsNew(true);
    setMessage("");
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const org = getOrg(editing.orgId);
    const status: PlayerStatus = editing.orgId ? "org-affiliated" : editing.status;
    const payload: LeaguePlayer = {
      ...editing,
      orgId: editing.orgId || undefined,
      divisionId: org?.divisionId ?? editing.divisionId,
      status,
    };
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ? `Save failed: ${json.error}` : "Save failed. Check Supabase env and admin session.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function doArchive(player: LeaguePlayer, unarchive = false) {
    setActionLoadingId(player.id);
    setMessage("");
    const res = await fetch(`/api/admin/players/${player.id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unarchive }),
    });
    setActionLoadingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Archive action failed.");
      return;
    }
    router.refresh();
  }

  async function doScheduleDelete(player: LeaguePlayer) {
    setActionLoadingId(player.id);
    setConfirmScheduleId(null);
    setMessage("");
    const res = await fetch(`/api/admin/players/${player.id}/schedule-delete`, { method: "POST" });
    setActionLoadingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Schedule delete failed.");
      return;
    }
    router.refresh();
  }

  const freeAgentStatuses: PlayerStatus[] = ["free-agent", "drafted", "queued-ghost", "active"];

  function renderPlayerCard(player: LeaguePlayer, archived = false) {
    const isScheduled = !!player.deletionScheduledAt;
    return (
      <div
        key={player.id}
        className={cn(
          "rounded-2xl border bg-slate-950/70 p-4",
          isScheduled ? "border-red-400/25 bg-red-950/10" : archived ? "border-white/5" : "border-white/8",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <button onClick={() => openEdit(player)} className="min-w-0 flex-1 text-left hover:opacity-80">
            <div className="flex items-center gap-2">
              <p className="truncate font-black text-white">{player.ign}</p>
              {archived && (
                <span className="rounded border border-slate-500/40 bg-slate-500/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-slate-400">Archived</span>
              )}
              {isScheduled && (
                <span className="rounded border border-red-400/40 bg-red-400/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-red-400">Pending Delete</span>
              )}
            </div>
            <p className="truncate text-xs font-semibold text-slate-500">@{player.discordUsername}</p>
            <p className="mt-1.5 text-xs font-semibold text-slate-400">
              {getOrg(player.orgId)?.name ?? "Free agent"} · {player.isCaptain ? "Captain" : player.isStarter ? "Starter" : "Sub"}
            </p>
          </button>
          <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[0.65rem] font-black uppercase text-cyan-100 shrink-0">
            {player.primaryRole}
          </span>
        </div>

        {/* Superadmin actions */}
        {isSuperAdmin && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
            {!archived ? (
              <button
                onClick={() => void doArchive(player)}
                disabled={actionLoadingId === player.id}
                className="rounded-lg border border-amber-400/25 px-2.5 py-1 text-[0.65rem] font-black uppercase text-amber-400/70 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
              >
                {actionLoadingId === player.id ? "…" : "Archive"}
              </button>
            ) : (
              <button
                onClick={() => void doArchive(player, true)}
                disabled={actionLoadingId === player.id}
                className="rounded-lg border border-emerald-400/25 px-2.5 py-1 text-[0.65rem] font-black uppercase text-emerald-400/70 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
              >
                {actionLoadingId === player.id ? "…" : "Unarchive"}
              </button>
            )}
            {!isScheduled ? (
              confirmScheduleId === player.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => void doScheduleDelete(player)}
                    disabled={actionLoadingId === player.id}
                    className="rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                  >
                    Confirm Schedule Delete
                  </button>
                  <button
                    onClick={() => setConfirmScheduleId(null)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-500 transition hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmScheduleId(player.id)}
                  className="rounded-lg border border-red-400/20 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-400/60 transition hover:border-red-400/40 hover:text-red-300"
                >
                  Schedule Delete
                </button>
              )
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">
            {activePlayers.length} active · {filtered.length} shown
            {archivedPlayers.length > 0 && ` · ${archivedPlayers.length} archived`}
          </p>
          {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
        </div>
        {isSuperAdmin && (
          <button onClick={openNew} className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20">
            + New Player
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IGN or Discord…"
          className="rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-cyan-300/50"
        />
        <span className="w-px self-stretch bg-white/10" />
        {(["all", "solar", "lunar", "gaia"] as const).map((d) => (
          <FilterChip key={d} active={divFilter === d} onClick={() => setDivFilter(d)}>
            {d === "all" ? "All Divisions" : d.charAt(0).toUpperCase() + d.slice(1)}
          </FilterChip>
        ))}
        <span className="w-px self-stretch bg-white/10" />
        <FilterChip active={orgFilter === "all"} onClick={() => setOrgFilter("all")}>All Teams</FilterChip>
        <FilterChip active={orgFilter === "__free_agent__"} onClick={() => setOrgFilter("__free_agent__")}>Free Agents</FilterChip>
        {data.orgs.filter((o) => !o.archivedAt).map((org) => (
          <FilterChip key={org.id} active={orgFilter === org.id} onClick={() => setOrgFilter(org.id)}>{org.tag}</FilterChip>
        ))}
      </div>

      {/* Edit / New panel */}
      {editing && (
        <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
          <p className="mb-3 text-xs font-black uppercase text-slate-400">{isNew ? "New Player" : `Editing: ${editing.ign || "…"}`}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="IGN">
              <input value={editing.ign} onChange={(e) => setEditing({ ...editing, ign: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Discord">
              <input value={editing.discordUsername} onChange={(e) => setEditing({ ...editing, discordUsername: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Team">
              <select value={editing.orgId ?? ""} onChange={(e) => setEditing({ ...editing, orgId: e.target.value || undefined })} className={inputClass}>
                <option value="">Free agent</option>
                {data.orgs.filter((o) => !o.archivedAt).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </Field>
            <Field label="Division">
              <select value={editing.divisionId ?? "solar"} onChange={(e) => setEditing({ ...editing, divisionId: e.target.value as DivisionId })} className={inputClass}>
                {data.divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Primary role">
              <select value={editing.primaryRole} onChange={(e) => setEditing({ ...editing, primaryRole: e.target.value as PlayerRole })} className={inputClass}>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            {editing.orgId ? (
              <Field label="Status">
                <div className={cn(inputClass, "flex items-center text-slate-400")}>org-affiliated (auto)</div>
              </Field>
            ) : (
              <Field label="Status">
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PlayerStatus })} className={inputClass}>
                  {freeAgentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-black uppercase text-slate-300">
              <input type="checkbox" checked={editing.isStarter} onChange={(e) => setEditing({ ...editing, isStarter: e.target.checked })} />
              Starter
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-black uppercase text-slate-300">
              <input type="checkbox" checked={editing.isCaptain} onChange={(e) => setEditing({ ...editing, isCaptain: e.target.checked })} />
              Captain
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => void save()} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
              {saving ? "Saving..." : isNew ? "Create Player" : "Save Player"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Active players grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 && (
          <p className="col-span-2 py-6 text-center text-sm font-semibold text-slate-500">No players match the current filters.</p>
        )}
        {filtered.map((p) => renderPlayerCard(p))}
      </div>

      {/* Archived players (collapsible) */}
      {archivedPlayers.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500 transition hover:text-slate-300"
          >
            <span>{showArchived ? "▾" : "▸"}</span>
            Archived Players ({archivedPlayers.length})
          </button>
          {showArchived && (
            <div className="grid gap-3 lg:grid-cols-2">
              {archivedPlayers.map((p) => renderPlayerCard(p, true))}
            </div>
          )}
        </div>
      )}
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
