"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingDelete } from "@/lib/league-data";

const ENTITY_LABELS: Record<string, string> = {
  players: "Player",
  orgs: "Team",
  matches: "Match",
};

export function AdminAuditClient({ pending }: { pending: PendingDelete[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function rowKey(item: PendingDelete) {
    return `${item.entityType}:${item.id}`;
  }

  async function confirmDelete(item: PendingDelete) {
    setLoadingId(rowKey(item));
    setConfirmId(null);
    setMessage("");
    const res = await fetch(`/api/admin/pending-deletes/${item.entityType}/${item.id}`, { method: "DELETE" });
    setLoadingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Delete failed.");
      return;
    }
    router.refresh();
  }

  async function cancelDelete(item: PendingDelete) {
    setLoadingId(rowKey(item));
    setMessage("");
    const res = await fetch(`/api/admin/pending-deletes/${item.entityType}/${item.id}/cancel`, { method: "POST" });
    setLoadingId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(json?.error ?? "Cancel failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-400">
          {pending.length === 0
            ? "No records pending deletion."
            : `${pending.length} record${pending.length !== 1 ? "s" : ""} scheduled for permanent deletion.`}
        </p>
        {message && <p className="mt-1 text-sm font-semibold text-orange-200">{message}</p>}
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-slate-500">No records scheduled for deletion.</p>
          <p className="mt-1 text-xs text-slate-600">
            Archive a player, team, or match, then use &ldquo;Schedule Delete&rdquo; to queue it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-red-400/15 bg-slate-950/70">
          {/* Header */}
          <div className="grid grid-cols-[5rem_1fr_8rem_auto] gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-2.5 text-[0.65rem] font-black uppercase text-slate-500">
            <span>Type</span>
            <span>Name / ID</span>
            <span>Scheduled at</span>
            <span>Actions</span>
          </div>

          {pending.map((item) => {
            const key = rowKey(item);
            const isLoading = loadingId === key;
            return (
              <div
                key={key}
                className="grid grid-cols-[5rem_1fr_8rem_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0"
              >
                <span className="rounded border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[0.6rem] font-black uppercase text-slate-400 w-fit">
                  {ENTITY_LABELS[item.entityType] ?? item.entityType}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{item.label}</p>
                  <p className="truncate text-[0.6rem] text-slate-600">{item.id}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {new Date(item.scheduledAt).toLocaleDateString()}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 gap-1.5">
                  {confirmId === key ? (
                    <>
                      <button
                        onClick={() => void confirmDelete(item)}
                        disabled={isLoading}
                        className="rounded-lg border border-red-400/50 bg-red-400/15 px-3 py-1 text-[0.65rem] font-black uppercase text-red-200 transition hover:bg-red-400/25 disabled:opacity-50"
                      >
                        {isLoading ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:text-slate-200"
                      >
                        Back
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmId(key)}
                        className="rounded-lg border border-red-400/30 px-2.5 py-1 text-[0.65rem] font-black uppercase text-red-400/80 transition hover:border-red-400/60 hover:text-red-300"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => void cancelDelete(item)}
                        disabled={isLoading}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200 disabled:opacity-50"
                      >
                        {isLoading ? "…" : "Cancel"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
