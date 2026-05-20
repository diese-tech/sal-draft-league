"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftState } from "@/types/draft";
import type { LeaguePlayer, Org } from "@/types/league";
import type { ShortlistEntry } from "@/lib/draft-data";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;

interface Props {
  initialState: DraftState;
  orgs: Org[];
  players: LeaguePlayer[];
  captainOrgId: string | null;
  tokenToExchange: string | undefined;
  draftId: string;
}

export function DraftBoardClient({ initialState, orgs, players, captainOrgId: initialCaptainOrgId, tokenToExchange, draftId }: Props) {
  const [state, setState] = useState<DraftState>(initialState);
  const [captainOrgId, setCaptainOrgId] = useState<string | null>(initialCaptainOrgId);
  const [picking, setPicking] = useState(false);
  const [pickMessage, setPickMessage] = useState("");
  const [connected, setConnected] = useState(true);
  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([]);
  const [shortlistBusy, setShortlistBusy] = useState<string | null>(null); // playerId being acted on
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { room, picks, pickSequence, currentOrgId, totalPicks, secondsRemaining } = state;

  // Exchange token for captain session on first load
  useEffect(() => {
    if (!tokenToExchange || captainOrgId) return;
    fetch(`/api/draft/${draftId}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenToExchange }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json() as { orgId: string };
        setCaptainOrgId(data.orgId);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        }
      }
    }).catch(() => {});
  }, [tokenToExchange, captainOrgId, draftId]);

  // Polling
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/draft/${draftId}`);
      if (!res.ok) { setConnected(false); return; }
      const data = await res.json() as { state: DraftState; captainOrgId: string | null; shortlist?: ShortlistEntry[] };
      setState(data.state);
      if (data.captainOrgId && !captainOrgId) setCaptainOrgId(data.captainOrgId);
      if (data.shortlist) setShortlist(data.shortlist);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [draftId, captainOrgId]);

  useEffect(() => {
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  async function makePick(playerId: string) {
    setPicking(true);
    setPickMessage("");
    const res = await fetch(`/api/draft/${draftId}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setPicking(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setPickMessage(data?.error ?? "Pick failed.");
      return;
    }
    await poll();
  }

  async function shortlistAdd(playerId: string) {
    setShortlistBusy(playerId);
    const res = await fetch(`/api/draft/${draftId}/shortlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setShortlistBusy(null);
    if (res.ok) {
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        // Optimistically add to end
        setShortlist((prev) => [...prev, { playerId, position: prev.length }]);
      }
    }
  }

  async function shortlistRemove(playerId: string) {
    setShortlistBusy(playerId);
    await fetch(`/api/draft/${draftId}/shortlist`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setShortlistBusy(null);
    setShortlist((prev) => prev.filter((e) => e.playerId !== playerId).map((e, i) => ({ ...e, position: i })));
  }

  async function shortlistMove(playerId: string, direction: "up" | "down") {
    const idx = shortlist.findIndex((e) => e.playerId === playerId);
    if (idx === -1) return;
    const newList = [...shortlist];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx]!, newList[idx]!];
    const reordered = newList.map((e, i) => ({ ...e, position: i }));
    setShortlist(reordered);
    await fetch(`/api/draft/${draftId}/shortlist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((e) => e.playerId) }),
    });
  }

  const getOrg = (id: string) => orgs.find((o) => o.id === id);
  const getPlayer = (id: string) => players.find((p) => p.id === id);
  const pickedIds = new Set(picks.map((p) => p.playerId));
  const shortlistedIds = new Set(shortlist.map((e) => e.playerId));

  const DIVISION_TIER: Record<string, number> = { solar: 1, lunar: 2, gaia: 3 };
  const DIVISION_LABELS: Record<string, string> = { solar: "Solar", lunar: "Lunar", gaia: "Gaia" };
  const roomTier = DIVISION_TIER[room.divisionId] ?? 1;

  const visibleDivisions = (["solar", "lunar", "gaia"] as const).filter(
    (d) => (DIVISION_TIER[d] ?? 0) >= roomTier,
  );

  const [playerTab, setPlayerTab] = useState<string>(room.divisionId);

  const availableByDivision = (divId: string) =>
    players.filter((p) => p.divisionId === divId && !pickedIds.has(p.id));

  const availablePlayers = availableByDivision(playerTab);
  const isMyTurn = captainOrgId !== null && currentOrgId === captainOrgId && room.status === "active";

  const statusLabel = {
    pending: "Draft not started",
    active: "Draft in progress",
    paused: "Draft paused",
    complete: "Draft complete",
  }[room.status];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.10),transparent_28rem),radial-gradient(circle_at_80%_8%,rgba(16,185,129,0.10),transparent_28rem),#05070d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[0.65rem] font-black uppercase text-cyan-300/70">SAL Draft · {room.divisionId.charAt(0).toUpperCase() + room.divisionId.slice(1)}</p>
            <p className="text-lg font-black text-white">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {!connected && <span className="text-xs font-semibold text-orange-300">Reconnecting…</span>}
            {captainOrgId && <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">Captain: {getOrg(captainOrgId)?.name}</span>}
            <span className="text-xs font-semibold text-slate-500">Pick {Math.min(room.currentPickIndex + 1, totalPicks)} / {totalPicks}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* On-the-clock banner */}
        {room.status === "active" && currentOrgId && (
          <div className={cn("mb-6 rounded-2xl border p-4 text-center", isMyTurn ? "border-orange-300/40 bg-orange-300/10" : "border-white/10 bg-white/[0.02]")}>
            {isMyTurn ? (
              <>
                <p className="text-lg font-black text-orange-100">Your pick!</p>
                <p className="text-sm text-orange-200/70">Select a player below.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-black uppercase text-slate-400">On the clock</p>
                <p className="text-xl font-black text-white">{getOrg(currentOrgId)?.name}</p>
              </>
            )}
            {secondsRemaining !== null && (
              <p className={cn("mt-2 text-2xl font-black tabular-nums", secondsRemaining < 30 ? "text-red-300" : "text-slate-300")}>
                {Math.floor(secondsRemaining)}s
              </p>
            )}
          </div>
        )}

        {room.status === "complete" && (
          <div className="mb-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-center">
            <p className="text-lg font-black text-emerald-100">Draft complete!</p>
          </div>
        )}

        {pickMessage && <p className="mb-4 text-sm font-semibold text-orange-200">{pickMessage}</p>}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Available players + shortlist */}
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase text-slate-400">
                  Available Players ({availablePlayers.length})
                </h2>
                {visibleDivisions.length > 1 && (
                  <div className="flex rounded-xl border border-white/10 overflow-hidden text-[0.65rem] font-black uppercase">
                    {visibleDivisions.map((d) => (
                      <button
                        key={d}
                        onClick={() => setPlayerTab(d)}
                        className={cn(
                          "px-3 py-1.5 transition",
                          playerTab === d
                            ? d === "solar" ? "bg-orange-400/20 text-orange-200"
                              : d === "lunar" ? "bg-cyan-400/20 text-cyan-200"
                              : "bg-emerald-400/20 text-emerald-200"
                            : "text-slate-500 hover:text-slate-300",
                        )}
                      >
                        {DIVISION_LABELS[d]}
                        {d !== room.divisionId && (
                          <span className="ml-1 opacity-60">({availableByDivision(d).length})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availablePlayers.map((p) => {
                  const inShortlist = shortlistedIds.has(p.id);
                  return (
                    <div key={p.id} className={cn("flex items-center justify-between gap-3 rounded-xl border bg-slate-950/70 px-4 py-3 transition", isMyTurn && !picking ? "cursor-pointer border-white/10 hover:border-cyan-300/40 hover:bg-white/[0.04]" : "border-white/5")}>
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">{p.ign}</p>
                        <p className="truncate text-xs text-slate-500">@{p.discordUsername}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[0.65rem] font-black text-cyan-200">{p.primaryRole}</span>
                        {captainOrgId && !isMyTurn && room.status === "active" && (
                          <button
                            onClick={() => inShortlist ? shortlistRemove(p.id) : shortlistAdd(p.id)}
                            disabled={shortlistBusy === p.id}
                            title={inShortlist ? "Remove from shortlist" : "Add to shortlist"}
                            className={cn(
                              "rounded-lg border px-2 py-1 text-[0.6rem] font-black uppercase transition disabled:opacity-50",
                              inShortlist
                                ? "border-amber-300/40 bg-amber-300/15 text-amber-200 hover:bg-amber-300/25"
                                : "border-white/15 bg-white/[0.05] text-slate-400 hover:border-amber-300/30 hover:text-amber-300",
                            )}
                          >
                            {inShortlist ? "★" : "☆"}
                          </button>
                        )}
                        {isMyTurn && (
                          <button
                            onClick={() => makePick(p.id)}
                            disabled={picking}
                            className="rounded-lg border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-black uppercase text-emerald-100 disabled:opacity-50"
                          >
                            {picking ? "…" : "Pick"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {availablePlayers.length === 0 && room.status !== "complete" && (
                  <p className="col-span-2 py-4 text-sm text-slate-500">
                    No available {DIVISION_LABELS[playerTab] ?? playerTab} players.
                  </p>
                )}
              </div>
            </section>

            {/* Shortlist panel (captain only) */}
            {captainOrgId && room.status !== "complete" && (
              <section className="rounded-2xl border border-amber-300/20 bg-slate-950/70 p-4">
                <h2 className="mb-3 text-xs font-black uppercase text-slate-400">
                  My Shortlist {shortlist.length > 0 && <span className="text-amber-300">({shortlist.filter((e) => !pickedIds.has(e.playerId)).length})</span>}
                </h2>
                {shortlist.filter((e) => !pickedIds.has(e.playerId)).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No players shortlisted. Use ☆ on available players to queue your picks.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {shortlist
                      .filter((e) => !pickedIds.has(e.playerId))
                      .map((entry, idx, arr) => {
                        const player = getPlayer(entry.playerId);
                        return (
                          <div
                            key={entry.playerId}
                            className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-1.5"
                          >
                            <span className="w-5 shrink-0 text-right font-mono text-[0.6rem] text-amber-400/70">
                              {idx + 1}.
                            </span>
                            <span className="min-w-0 flex-1 truncate font-black text-white">
                              {player?.ign ?? entry.playerId}
                            </span>
                            {player && <span className="text-[0.6rem] font-black text-cyan-200">{player.primaryRole}</span>}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => shortlistMove(entry.playerId, "up")}
                                disabled={idx === 0 || shortlistBusy === entry.playerId}
                                className="rounded px-1 py-0.5 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => shortlistMove(entry.playerId, "down")}
                                disabled={idx === arr.length - 1 || shortlistBusy === entry.playerId}
                                className="rounded px-1 py-0.5 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => shortlistRemove(entry.playerId)}
                                disabled={shortlistBusy === entry.playerId}
                                className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:text-red-400 disabled:opacity-30"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right sidebar: picks + sequence */}
          <div className="space-y-5">
            {/* Picks log */}
            <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
              <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Picks ({picks.length})</h2>
              {picks.length === 0 ? (
                <p className="text-sm text-slate-500">No picks yet.</p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {[...picks].reverse().map((pick) => (
                    <div key={pick.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-1.5">
                      <span className="w-6 shrink-0 text-right font-mono text-[0.6rem] text-slate-500">{pick.pickNumber}</span>
                      <span className="text-xs text-slate-400">{getOrg(pick.orgId)?.tag ?? pick.orgId}</span>
                      <span className="text-slate-600">→</span>
                      <span className="min-w-0 truncate font-black text-white">{getPlayer(pick.playerId)?.ign ?? pick.playerId}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Up next */}
            {room.status === "active" && pickSequence.length > 0 && (
              <section className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
                <h2 className="mb-3 text-xs font-black uppercase text-slate-400">Up Next</h2>
                <div className="space-y-1.5">
                  {pickSequence.slice(room.currentPickIndex, room.currentPickIndex + 5).map((orgId, i) => (
                    <div key={i} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm", i === 0 ? "bg-orange-300/10 font-black text-orange-100" : "text-slate-400")}>
                      <span className="w-5 text-right font-mono text-xs text-slate-500">{room.currentPickIndex + i + 1}.</span>
                      {getOrg(orgId)?.name ?? orgId}
                      {captainOrgId === orgId && <span className="ml-auto text-[0.6rem] font-black uppercase text-emerald-300">You</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
