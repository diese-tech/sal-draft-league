"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId, LeagueData, Org } from "@/types/league";
import { OrgLogo } from "@/components/card-lab/ui";
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

function emptyOrg(): Org {
  return {
    id: `org-${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    tag: "",
    divisionId: "solar",
    logoInitials: "",
    logoGradient: "from-orange-500 to-amber-400",
    primaryColor: "#f97316",
    accentGradient: "from-orange-500 to-amber-400",
    captainId: undefined,
    founded: "",
    socialLinks: {},
  };
}

export function AdminTeamsClient({
  data,
  isSuperAdmin,
}: {
  data: LeagueData;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Org | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmScheduleId, setConfirmScheduleId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeOrgs = data.orgs.filter((o) => !o.archivedAt);
  const archivedOrgs = data.orgs.filter((o) => !!o.archivedAt);

  function openEdit(org: Org) {
    setEditing({ ...org });
    setIsNew(false);
    setMessage("");
  }

  function openNew() {
    setEditing(emptyOrg());
    setIsNew(true);
    setMessage("");
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.tag.trim()) {
      setMessage("Name and Tag are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, tag: editing.tag.toUpperCase() }),
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

  async function doArchive(org: Org, unarchive = false) {
    setActionLoadingId(org.id);
    setMessage("");
    const res = await fetch(`/api/admin/orgs/${org.id}/archive`, {
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

  async function doScheduleDelete(org: Org) {
    setActionLoadingId(org.id);
    setConfirmScheduleId(null);
    setMessage("");
    const res = await fetch(`/api/admin/orgs/${org.id}/schedule-delete`, { method: "POST" });
    setActionLoadingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Schedule delete failed.");
      return;
    }
    router.refresh();
  }

  function renderOrgRow(org: Org) {
    const captain = data.players.find((p) => p.id === org.captainId);
    const standing = data.standings.find((s) => s.orgId === org.id);
    const isScheduled = !!org.deletionScheduledAt;

    return (
      <div
        key={org.id}
        className={cn(
          "flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0",
          isScheduled && "bg-red-950/20",
        )}
      >
        {/* Identity */}
        <button
          onClick={() => openEdit(org)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
        >
          <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-8 w-8 shrink-0 text-xs" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-black text-white">{org.name}</p>
              {org.archivedAt && (
                <span className="rounded border border-slate-500/40 bg-slate-500/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-slate-400">
                  Archived
                </span>
              )}
              {isScheduled && (
                <span className="rounded border border-red-400/40 bg-red-400/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-red-400">
                  Pending Delete
                </span>
              )}
            </div>
            <p className="text-[0.6rem] font-black uppercase text-slate-500">{org.tag} · {org.divisionId}</p>
          </div>
        </button>

        {/* Stats */}
        <span className="text-sm font-semibold text-slate-400 shrink-0">
          {standing?.wins ?? 0}-{standing?.losses ?? 0}
        </span>
        <span className="truncate text-xs font-semibold text-slate-500 shrink-0 hidden sm:block">
          {captain?.ign ?? "No captain"}
        </span>

        {/* Superadmin actions */}
        {isSuperAdmin && (
          <div className="flex shrink-0 gap-1">
            {!org.archivedAt ? (
              <button
                onClick={() => void doArchive(org)}
                disabled={actionLoadingId === org.id}
                className="rounded-lg border border-amber-400/25 px-2.5 py-1 text-[0.65rem] font-black uppercase text-amber-400/70 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
              >
                {actionLoadingId === org.id ? "…" : "Archive"}
              </button>
            ) : (
              <button
                onClick={() => void doArchive(org, true)}
                disabled={actionLoadingId === org.id}
                className="rounded-lg border border-emerald-400/25 px-2.5 py-1 text-[0.65rem] font-black uppercase text-emerald-400/70 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
              >
                {actionLoadingId === org.id ? "…" : "Unarchive"}
              </button>
            )}
            {!isScheduled ? (
              confirmScheduleId === org.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => void doScheduleDelete(org)}
                    disabled={actionLoadingId === org.id}
                    className="rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                  >
                    Confirm
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
                  onClick={() => setConfirmScheduleId(org.id)}
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
            {activeOrgs.length} active team{activeOrgs.length !== 1 ? "s" : ""}
            {archivedOrgs.length > 0 && ` · ${archivedOrgs.length} archived`}
          </p>
          {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
        </div>
        {isSuperAdmin && (
          <button
            onClick={openNew}
            className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20"
          >
            + New Team
          </button>
        )}
      </div>

      {/* Edit / New panel */}
      {editing && (
        <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-4 shadow-xl shadow-emerald-950/20">
          <p className="mb-3 text-xs font-black uppercase text-slate-400">{isNew ? "New Team" : `Editing: ${editing.name || "…"}`}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={64} className={inputClass} />
            </Field>
            <Field label="Tag (max 8, auto-uppercase)">
              <input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value.toUpperCase().slice(0, 8) })} maxLength={8} className={inputClass} />
            </Field>
            <Field label="Division">
              <select value={editing.divisionId} onChange={(e) => setEditing({ ...editing, divisionId: e.target.value as DivisionId })} className={inputClass}>
                {(["solar", "lunar", "gaia"] as DivisionId[]).map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Captain">
              <select
                value={editing.captainId ?? ""}
                onChange={(e) => setEditing({ ...editing, captainId: e.target.value || undefined })}
                className={inputClass}
              >
                <option value="">— none —</option>
                {data.players
                  .filter((p) => !p.archivedAt && (p.orgId === editing.id || !p.orgId))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.ign}</option>
                  ))}
              </select>
            </Field>
            <Field label="Logo Initials (max 4)">
              <input value={editing.logoInitials} onChange={(e) => setEditing({ ...editing, logoInitials: e.target.value.slice(0, 4) })} maxLength={4} className={inputClass} />
            </Field>
            <Field label="Logo Gradient (CSS string)">
              <input value={editing.logoGradient} onChange={(e) => setEditing({ ...editing, logoGradient: e.target.value })} className={inputClass} placeholder="from-orange-500 to-amber-400" />
            </Field>
            <Field label="Primary Color (hex)">
              <input value={editing.primaryColor} onChange={(e) => setEditing({ ...editing, primaryColor: e.target.value })} className={inputClass} placeholder="#f97316" />
            </Field>
            <Field label="Accent Gradient (CSS string)">
              <input value={editing.accentGradient} onChange={(e) => setEditing({ ...editing, accentGradient: e.target.value })} className={inputClass} placeholder="from-orange-500 to-amber-400" />
            </Field>
            <Field label="Founded (e.g. 2024)">
              <input value={editing.founded ?? ""} onChange={(e) => setEditing({ ...editing, founded: e.target.value || undefined })} className={inputClass} />
            </Field>
          </div>
          <p className="mt-3 mb-1.5 text-[0.65rem] font-black uppercase text-slate-500">Social Links</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Discord invite URL">
              <input value={editing.socialLinks?.discord ?? ""} onChange={(e) => setEditing({ ...editing, socialLinks: { ...editing.socialLinks, discord: e.target.value || undefined } })} className={inputClass} placeholder="https://discord.gg/…" />
            </Field>
            <Field label="Twitch URL">
              <input value={editing.socialLinks?.twitch ?? ""} onChange={(e) => setEditing({ ...editing, socialLinks: { ...editing.socialLinks, twitch: e.target.value || undefined } })} className={inputClass} placeholder="https://twitch.tv/…" />
            </Field>
            <Field label="Twitter/X URL">
              <input value={editing.socialLinks?.twitter ?? ""} onChange={(e) => setEditing({ ...editing, socialLinks: { ...editing.socialLinks, twitter: e.target.value || undefined } })} className={inputClass} placeholder="https://x.com/…" />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => void save()} disabled={saving} className="rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60">
              {saving ? "Saving..." : isNew ? "Create Team" : "Save Team"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Active teams */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/70">
        {activeOrgs.length === 0 && (
          <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">No active teams.</p>
        )}
        {activeOrgs.map(renderOrgRow)}
      </div>

      {/* Archived teams (collapsible) */}
      {archivedOrgs.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500 transition hover:text-slate-300"
          >
            <span>{showArchived ? "▾" : "▸"}</span>
            Archived ({archivedOrgs.length})
          </button>
          {showArchived && (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/50">
              {archivedOrgs.map(renderOrgRow)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
