"use client";

import { useState } from "react";
import type { Registration } from "@/types/auth";
import type { LeaguePlayer, Org } from "@/types/league";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<Registration["status"], string> = {
  pending: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  approved: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  rejected: "border-red-300/30 bg-red-300/10 text-red-200",
};

const TABS: { id: Registration["status"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export function AdminRegistrationsClient({
  registrations: initial,
  players,
}: {
  registrations: Registration[];
  players: LeaguePlayer[];
  orgs: Org[];
}) {
  const [registrations, setRegistrations] = useState(initial);
  const [tab, setTab] = useState<Registration["status"] | "all">("pending");
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const filtered = tab === "all" ? registrations : registrations.filter((r) => r.status === tab);
  const pending = registrations.filter((r) => r.status === "pending").length;

  async function updateStatus(reg: Registration, status: Registration["status"]) {
    setLoading(reg.id);
    setMessage(null);
    const res = await fetch(`/api/admin/registrations/${reg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewerNote: noteMap[reg.id] }),
    });
    const data = await res.json();
    if (res.ok) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === reg.id
            ? { ...r, status, reviewerNote: noteMap[reg.id], reviewedAt: new Date().toISOString() }
            : r,
        ),
      );
      setMessage({ id: reg.id, text: `Marked as ${status}.`, ok: true });
    } else {
      setMessage({ id: reg.id, text: data.error ?? "Failed.", ok: false });
    }
    setLoading(null);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-black uppercase transition",
              tab === id
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200",
            )}
          >
            {label}
            {id === "pending" && pending > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[0.6rem] text-amber-200">
                {pending}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs font-black uppercase text-slate-600">
          {filtered.length} registration{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/84 py-16 text-center backdrop-blur">
          <p className="text-sm font-black uppercase text-slate-500">No registrations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => {
            const linkedPlayer = players.find((p) => p.id === reg.playerId);
            const discordMatch = players.find(
              (p) =>
                p.discordUsername.toLowerCase() === reg.discordUsername.toLowerCase(),
            );
            return (
              <div
                key={reg.id}
                className="rounded-2xl border border-white/10 bg-slate-950/84 p-5 backdrop-blur"
              >
                <div className="mb-3 flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-white">{reg.formData.name ?? reg.discordDisplayName}</p>
                      <span
                        className={cn(
                          "rounded-xl border px-2 py-0.5 text-[0.65rem] font-black uppercase",
                          STATUS_STYLE[reg.status],
                        )}
                      >
                        {reg.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Discord: @{reg.discordUsername}
                      {reg.discordDisplayName && reg.discordDisplayName !== reg.discordUsername && (
                        <span className="ml-1 text-slate-600">({reg.discordDisplayName})</span>
                      )}
                    </p>
                    <p className="text-[0.65rem] text-slate-600">
                      {new Date(reg.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* System player match indicator */}
                  {(linkedPlayer ?? discordMatch) && (
                    <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-[0.65rem] font-semibold text-cyan-200">
                      {linkedPlayer ? "Profile linked" : `Matches @${discordMatch!.discordUsername}`}
                    </div>
                  )}
                </div>

                {/* Form data */}
                <div className="mb-3 grid gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:grid-cols-2">
                  {Object.entries(reg.formData).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="w-28 shrink-0 font-semibold uppercase text-slate-500">
                        {key.replace(/_/g, " ")}
                      </span>
                      {key === "tracker_url" ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-cyan-400 underline hover:text-cyan-200"
                        >
                          tracker.gg →
                        </a>
                      ) : (
                        <span className="truncate text-slate-300">{value}</span>
                      )}
                    </div>
                  ))}
                </div>

                {reg.reviewerNote && (
                  <p className="mb-3 text-xs text-slate-500">
                    <span className="font-black text-slate-400">Note:</span> {reg.reviewerNote}
                  </p>
                )}

                {/* Action row */}
                {reg.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Optional note…"
                      value={noteMap[reg.id] ?? ""}
                      onChange={(e) =>
                        setNoteMap((prev) => ({ ...prev, [reg.id]: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
                    />
                    <button
                      onClick={() => updateStatus(reg, "approved")}
                      disabled={loading === reg.id}
                      className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(reg, "rejected")}
                      disabled={loading === reg.id}
                      className="rounded-lg border border-red-300/25 bg-red-300/8 px-3 py-1.5 text-xs font-black uppercase text-red-300 transition hover:bg-red-300/15 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {message?.id === reg.id && (
                  <p
                    className={cn(
                      "mt-2 text-xs font-semibold",
                      message.ok ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {message.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
