"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId, LeagueData, LeaguePlayer } from "@/types/league";
import type { PlayerRole, PlayerStatus } from "@/types/card-lab";

const roles: PlayerRole[] = ["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"];
const statuses: PlayerStatus[] = ["free-agent", "org-affiliated", "drafted", "queued-ghost", "active"];

export function AdminPlayersClient({ data }: { data: LeagueData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<LeaguePlayer | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const getOrg = (id?: string) => data.orgs.find((org) => org.id === id);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const org = getOrg(editing.orgId);
    const payload: LeaguePlayer = {
      ...editing,
      orgId: editing.orgId || undefined,
      divisionId: org?.divisionId ?? editing.divisionId,
      status: editing.orgId ? "org-affiliated" : editing.status,
    };
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      <div>
        <p className="text-sm font-semibold text-slate-400">{data.players.length} registered players. Assign players to teams and update starter/captain roles.</p>
        {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
      </div>

      {editing && (
        <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
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
                {data.orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </Field>
            <Field label="Division">
              <select value={editing.divisionId ?? "solar"} onChange={(e) => setEditing({ ...editing, divisionId: e.target.value as DivisionId })} className={inputClass}>
                {data.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
              </select>
            </Field>
            <Field label="Primary role">
              <select value={editing.primaryRole} onChange={(e) => setEditing({ ...editing, primaryRole: e.target.value as PlayerRole })} className={inputClass}>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PlayerStatus })} className={inputClass}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
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
            <button onClick={save} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
              {saving ? "Saving..." : "Save Player"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {data.players.map((player) => (
          <button key={player.id} onClick={() => setEditing(player)} className="rounded-2xl border border-white/8 bg-slate-950/70 p-4 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-white">{player.ign}</p>
                <p className="truncate text-xs font-semibold text-slate-500">@{player.discordUsername}</p>
              </div>
              <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[0.65rem] font-black uppercase text-cyan-100">{player.primaryRole}</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              {getOrg(player.orgId)?.name ?? "Free agent"} · {player.isCaptain ? "Captain" : player.isStarter ? "Starter" : "Sub"}
            </p>
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
