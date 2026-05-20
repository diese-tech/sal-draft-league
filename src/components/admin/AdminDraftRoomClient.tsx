"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DraftState } from "@/types/draft";
import type { LeaguePlayer, Org } from "@/types/league";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  active: "border-orange-300/40 bg-orange-300/15 text-orange-100",
  paused: "border-yellow-300/40 bg-yellow-300/15 text-yellow-100",
  complete: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
};

export function AdminDraftRoomClient({ state, orgs, players }: {
  state: DraftState;
  orgs: Org[];
  players: LeaguePlayer[];
}) {
  const router = useRouter();
  const [liveState, setLiveState] = useState(state);

  useEffect(() => {
    setLiveState(state); // sync if parent re-renders
  }, [state]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/draft/${state.room.id}`);
        if (res.ok) {
          const data = await res.json() as { state: typeof state };
          setLiveState(data.state);
        }
      } catch {
        // network blip — ignore, next poll will catch up
      }
    }, 3000);
    return () => clearInterval(id);
  }, [state.room.id]);

  const { room, picks, pickSequence, currentOrgId, totalPicks } = liveState;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<Record<string, string> | null>(null);
  const [baseOrderDraft, setBaseOrderDraft] = useState<string[]>(room.baseOrder);

  const divOrgs = orgs.filter((o) => o.divisionId === room.divisionId);
  const pickedPlayerIds = new Set(picks.map((p) => p.playerId));
  const availablePlayers = players.filter(
    (p) => p.divisionId === room.divisionId && !pickedPlayerIds.has(p.id)
  );

  const getOrg = (id: string) => orgs.find((o) => o.id === id);
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  async function call(endpoint: string, method = "POST") {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/draft/${room.id}/${endpoint}`, { method });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ?? `${endpoint} failed.`);
      return false;
    }
    router.refresh();
    return true;
  }

  async function callUndo() {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/draft/${room.id}/undo`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ?? "Undo failed.");
      return;
    }
    const data = await res.json() as { state: typeof state };
    if (data.state) setLiveState(data.state);
    router.refresh();
  }

  async function saveOrder() {
    if (baseOrderDraft.length === 0) { setMessage("Add at least one org to the pick order."); return; }
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/draft/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseOrder: baseOrderDraft }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ?? "Failed to save order.");
      return;
    }
    router.refresh();
  }

  async function generateTokens() {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/admin/draft/${room.id}/tokens`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error ?? "Failed to generate tokens.");
      return;
    }
    const data = await res.json() as { tokens: Record<string, string> };
    setTokens(data.tokens);
  }

  const isPending = room.status === "pending";
  const isActive = room.status === "active";
  const isPaused = room.status === "paused";
  const isComplete = room.status === "complete";

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase", STATUS_COLORS[room.status])}>
            {room.status}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            Pick {Math.min(room.currentPickIndex + 1, totalPicks)} of {totalPicks}
            {currentOrgId && <> · On the clock: <span className="font-black text-white">{getOrg(currentOrgId)?.name}</span></>}
          </span>
        </div>
        <div className="flex gap-2">
          {isPending && <AdminBtn onClick={() => call("start")} disabled={busy || room.baseOrder.length === 0}>Start Draft</AdminBtn>}
          {isActive && <AdminBtn onClick={() => call("pause")} disabled={busy} variant="yellow">Pause</AdminBtn>}
          {isPaused && <AdminBtn onClick={() => call("resume")} disabled={busy}>Resume</AdminBtn>}
          {(isActive || isPaused) && <AdminBtn onClick={() => call("skip")} disabled={busy} variant="red">Skip Pick</AdminBtn>}
          {isActive && liveState.picks.length > 0 && <AdminBtn onClick={() => callUndo()} disabled={busy} variant="yellow">Undo Pick</AdminBtn>}
        </div>
      </div>
      {message && <p className="text-sm font-semibold text-orange-200">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: configuration */}
        <div className="space-y-5">
          {/* Pick order */}
          <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Pick Order (Round 1)</h2>
            {isPending ? (
              <>
                <div className="space-y-2">
                  {divOrgs.map((org) => {
                    const pos = baseOrderDraft.indexOf(org.id);
                    return (
                      <div key={org.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/30 px-3 py-2">
                        <span className="text-sm font-semibold text-white">{org.name}</span>
                        <div className="flex gap-1">
                          {pos === -1 ? (
                            <button onClick={() => setBaseOrderDraft([...baseOrderDraft, org.id])} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[0.65rem] font-black uppercase text-cyan-200">Add</button>
                          ) : (
                            <>
                              <span className="rounded-lg bg-white/10 px-2 py-1 text-[0.65rem] font-black text-slate-300">#{pos + 1}</span>
                              <button onClick={() => setBaseOrderDraft(baseOrderDraft.filter((id) => id !== org.id))} className="rounded-lg border border-white/10 px-2 py-1 text-[0.65rem] font-black uppercase text-slate-400">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={saveOrder} disabled={busy} className="mt-3 rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-xs font-black uppercase text-emerald-100 disabled:opacity-60">
                  Save Order
                </button>
              </>
            ) : (
              <ol className="space-y-1.5">
                {room.baseOrder.map((orgId, i) => (
                  <li key={orgId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-right text-xs font-black text-slate-500">{i + 1}.</span>
                    <span className="font-semibold text-white">{getOrg(orgId)?.name ?? orgId}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Captain tokens */}
          <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Captain Tokens</h2>
            <p className="mb-3 text-xs text-slate-500">Share these links with each team captain. Each link auto-authenticates them to the draft board.</p>
            {tokens ? (
              <div className="space-y-2">
                {Object.entries(tokens).map(([orgId, token]) => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/draft/${room.id}?token=${token}` : token;
                  return (
                    <div key={orgId} className="rounded-lg border border-white/8 bg-black/30 p-2">
                      <p className="text-xs font-black text-white">{getOrg(orgId)?.name ?? orgId}</p>
                      <p className="mt-1 break-all font-mono text-[0.6rem] text-cyan-300/70">{url}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button onClick={generateTokens} disabled={busy || room.baseOrder.length === 0} className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-xs font-black uppercase text-cyan-100 disabled:opacity-60">
                Generate Tokens
              </button>
            )}
          </section>
        </div>

        {/* Right: picks log + available players */}
        <div className="space-y-5">
          {/* Pick log */}
          <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Picks ({picks.length})</h2>
            {picks.length === 0 ? (
              <p className="text-sm text-slate-500">No picks yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {picks.map((pick) => (
                  <div key={pick.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-1.5">
                    <span className="w-6 shrink-0 text-right text-xs font-black text-slate-500">{pick.pickNumber}.</span>
                    <span className="text-xs font-semibold text-slate-400">{getOrg(pick.orgId)?.name ?? pick.orgId}</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-black text-white">{getPlayer(pick.playerId)?.ign ?? pick.playerId}</span>
                    <span className="ml-auto text-[0.6rem] text-slate-500">{getPlayer(pick.playerId)?.primaryRole}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Available players */}
          <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Available Players ({availablePlayers.length})</h2>
            <div className="grid gap-1.5 max-h-72 overflow-y-auto sm:grid-cols-2">
              {availablePlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-1.5">
                  <span className="truncate text-sm font-semibold text-white">{p.ign}</span>
                  <span className="shrink-0 text-[0.65rem] font-black text-cyan-200">{p.primaryRole}</span>
                </div>
              ))}
              {availablePlayers.length === 0 && <p className="col-span-2 text-sm text-slate-500">All players picked.</p>}
            </div>
          </section>

          {/* Pick sequence preview */}
          {pickSequence.length > 0 && (
            <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
              <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Full Pick Sequence</h2>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto sm:grid-cols-3">
                {pickSequence.map((orgId, i) => (
                  <div key={i} className={cn("flex items-center gap-1.5 rounded px-2 py-1 text-xs", i === room.currentPickIndex && room.status === "active" ? "bg-orange-300/15 font-black text-orange-100" : i < room.currentPickIndex ? "text-slate-600" : "text-slate-400")}>
                    <span className="w-4 shrink-0 text-right font-mono text-[0.6rem]">{i + 1}</span>
                    <span className="truncate">{getOrg(orgId)?.tag ?? orgId}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminBtn({ onClick, disabled, children, variant = "cyan" }: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "cyan" | "yellow" | "red";
}) {
  const colors = {
    cyan: "border-cyan-300/35 bg-cyan-300/15 text-cyan-100",
    yellow: "border-yellow-300/35 bg-yellow-300/15 text-yellow-100",
    red: "border-red-300/35 bg-red-300/15 text-red-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn("rounded-xl border px-4 py-2 text-sm font-black uppercase disabled:opacity-60", colors[variant])}>
      {children}
    </button>
  );
}
