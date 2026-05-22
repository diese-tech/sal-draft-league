"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TURN_SECONDS } from "@/lib/god-draft-format";
import { canRoleSubmitDraftAction } from "@/lib/god-draft-rules";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { DraftChatChannel, DraftChatMessage, DraftSelection, GodDraftRoomData, GodDraftSession } from "@/types/god-draft";

export function GodDraftRoomClient({ initialData }: { initialData: GodDraftRoomData }) {
  const [session, setSession] = useState(initialData.session);
  const [messages, setMessages] = useState(initialData.chatMessages);
  const [channel, setChannel] = useState<DraftChatChannel>(initialData.canChatTeam ? "team" : "spectator");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "vaulted">("all");
  const [secondsLeft, setSecondsLeft] = useState(() => calculateSecondsLeft(initialData.session));
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const post = useCallback(async (url: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = getSupabaseBrowserClient();
    const sessionChannel = supabase
      .channel(`god-draft-session-${initialData.session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "god_draft_sessions", filter: `id=eq.${initialData.session.id}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setSession(mapRealtimeSession(row));
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draft_chat_messages", filter: `session_id=eq.${initialData.session.id}` },
        (payload) => setMessages((current) => [...current, mapRealtimeMessage(payload.new as Record<string, unknown>)]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [initialData.session.id, router]);

  useEffect(() => {
    if (!session.turnStartedAt || !session.currentType) return;
    const tick = () => {
      setSecondsLeft(calculateSecondsLeft(session));
    };
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (secondsLeft !== 0 || !session.currentType) return;
    void fetch("/api/draft/god/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, godId: "", timeout: true }),
    }).then(() => router.refresh());
  }, [secondsLeft, session.currentType, session.id, router]);

  useEffect(() => {
    const isCaptain = initialData.role === "home_captain" || initialData.role === "away_captain";
    if (!isCaptain || session.status === "complete") return;
    const clearReady = () => {
      const body = new Blob([JSON.stringify({ sessionId: session.id, ready: false })], { type: "application/json" });
      navigator.sendBeacon("/api/draft/god/ready", body);
    };
    window.addEventListener("pagehide", clearReady);
    return () => window.removeEventListener("pagehide", clearReady);
  }, [initialData.role, session.id, session.status]);

  const usedIds = useMemo(() => new Set([...session.draftState.picks, ...session.draftState.bans].map((s) => s.godId)), [session.draftState]);
  const vaultedIds = new Set(initialData.vaultedGodIds);
  const godList = initialData.gods.filter((god) => {
    if (filter === "available") return !usedIds.has(god.id) && !vaultedIds.has(god.id);
    if (filter === "vaulted") return vaultedIds.has(god.id);
    return true;
  });
  const activeSide = session.currentSide === "A" ? initialData.homeOrg.tag : session.currentSide === "B" ? initialData.awayOrg.tag : null;
  const canAct = canRoleSubmitDraftAction(initialData.role, initialData.side, session.currentSide);
  const canToggleReady = initialData.role === "home_captain" || initialData.role === "away_captain";
  const canRequestReset = canToggleReady || initialData.role === "admin";
  const currentChat = messages.filter((m) => m.channel === channel);

  async function sendMessage() {
    if (!message.trim()) return;
    await post("/api/draft/god/chat", { sessionId: session.id, channel, body: message });
    setMessage("");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/84 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <TeamPanel name={initialData.homeOrg.name} tag={initialData.homeOrg.tag} ready={session.homeReady} side="A" />
          <div className="text-center">
            <p className="text-[0.65rem] font-black uppercase tracking-widest text-cyan-200">God Draft</p>
            <h1 className="mt-1 text-2xl font-black text-white">Game {session.gameNumber}</h1>
            <p className="mt-1 text-xs font-bold uppercase text-slate-500">Status: {session.status}</p>
            {session.currentType && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs font-black uppercase text-slate-400">
                  {activeSide} {session.currentType}
                </p>
                <p className="font-mono text-3xl font-black text-white">{secondsLeft}s</p>
              </div>
            )}
          </div>
          <TeamPanel name={initialData.awayOrg.name} tag={initialData.awayOrg.tag} ready={session.awayReady} side="B" alignRight />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/8 p-4">
          {canRequestReset && (
            <>
              {canToggleReady && (
                <button onClick={() => post("/api/draft/god/ready", { sessionId: session.id, ready: initialData.side === "A" ? !session.homeReady : !session.awayReady })} disabled={busy} className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase text-emerald-100">
                  Toggle Ready
                </button>
              )}
              <button onClick={() => post("/api/draft/god/reset", { sessionId: session.id })} disabled={busy} className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-black uppercase text-amber-100">
                Request Reset
              </button>
            </>
          )}
          {!initialData.isAuthenticated && (
            <Link href={`/auth/signin?next=${encodeURIComponent(`/draft/god/${session.id}`)}`} className="rounded-lg border border-indigo-300/30 bg-indigo-400/10 px-3 py-2 text-xs font-black uppercase text-indigo-100">
              Sign in with Discord
            </Link>
          )}
          {session.resetRequestedBy && <span className="px-2 py-2 text-xs font-bold text-amber-200">Reset requested by side {session.resetRequestedBy}. Other captain must confirm.</span>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <DraftStrip title="Bans" items={session.draftState.bans} />
          <DraftStrip title="Picks" items={session.draftState.picks} />
          <div className="rounded-2xl border border-white/10 bg-slate-950/78 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">God Pool</h2>
              <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {(["all", "available", "vaulted"] as const).map((value) => (
                  <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase ${filter === value ? "bg-cyan-300 text-slate-950" : "text-slate-400"}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {godList.map((god) => {
                const disabled = busy || !canAct || usedIds.has(god.id) || (session.currentType === "pick" && vaultedIds.has(god.id));
                return (
                  <button key={god.id} disabled={disabled || !session.currentType} onClick={() => post("/api/draft/god/action", { sessionId: session.id, godId: god.id })} className="min-h-20 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-45">
                    <span className="block font-black text-white">{god.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{god.class ?? "Unknown"} {god.damageType ? `- ${god.damageType}` : ""}</span>
                    {vaultedIds.has(god.id) && <span className="mt-2 block text-[0.65rem] font-black uppercase text-amber-300">Vaulted</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-slate-950/78 p-4">
          <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {initialData.canChatTeam && <ChatTab label="Team" value="team" channel={channel} setChannel={setChannel} />}
            {initialData.canChatSpectator && <ChatTab label="Spectator" value="spectator" channel={channel} setChannel={setChannel} />}
          </div>
          {initialData.canChatTeam || initialData.canChatSpectator ? (
            <>
              <div className="h-72 space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-3">
                {currentChat.length === 0 ? <p className="text-xs font-semibold text-slate-500">No messages yet.</p> : currentChat.map((m) => (
                  <div key={m.id}>
                    <p className="text-[0.65rem] font-black uppercase text-cyan-300">{m.senderName}</p>
                    <p className="text-sm text-slate-200">{m.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50" />
                <button onClick={sendMessage} disabled={busy} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase text-cyan-100">Send</button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/8 bg-black/20 p-6 text-center text-sm font-semibold text-slate-500">
              Sign in to chat. Unauthenticated viewers can watch the board only.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function TeamPanel({ name, tag, ready, side, alignRight = false }: { name: string; tag: string; ready: boolean; side: string; alignRight?: boolean }) {
  return (
    <div className={alignRight ? "text-right" : ""}>
      <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500">Side {side}</p>
      <h2 className="text-xl font-black text-white">{name}</h2>
      <p className="text-sm font-bold text-slate-400">{tag}</p>
      <p className={`mt-2 text-xs font-black uppercase ${ready ? "text-emerald-300" : "text-slate-600"}`}>{ready ? "Ready" : "Not Ready"}</p>
    </div>
  );
}

function DraftStrip({ title, items }: { title: string; items: DraftSelection[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/78 p-4">
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-5">
        {items.length === 0 ? <p className="text-sm font-semibold text-slate-600">No {title.toLowerCase()} yet.</p> : items.map((item, index) => (
          <div key={`${item.godId}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[0.65rem] font-black uppercase text-slate-500">Side {item.side}</p>
            <p className="font-black text-white">{item.godName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatTab({ label, value, channel, setChannel }: { label: string; value: DraftChatChannel; channel: DraftChatChannel; setChannel: (channel: DraftChatChannel) => void }) {
  return (
    <button onClick={() => setChannel(value)} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-black uppercase ${channel === value ? "bg-cyan-300 text-slate-950" : "text-slate-400"}`}>
      {label}
    </button>
  );
}

function mapRealtimeSession(row: Record<string, unknown>): GodDraftSession {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    gameNumber: Number(row.game_number ?? 1),
    status: String(row.status) as GodDraftSession["status"],
    homeReady: Boolean(row.home_ready),
    awayReady: Boolean(row.away_ready),
    currentPhaseIndex: Number(row.current_phase_index ?? 0),
    currentStepIndex: Number(row.current_step_index ?? 0),
    currentType: row.current_type as GodDraftSession["currentType"],
    currentSide: row.current_side as GodDraftSession["currentSide"],
    turnStartedAt: (row.turn_started_at as string | null) ?? null,
    draftState: (row.draft_state as GodDraftSession["draftState"]) ?? { picks: [], bans: [] },
    resetRequestedBy: row.reset_requested_by as GodDraftSession["resetRequestedBy"],
  };
}

function calculateSecondsLeft(session: GodDraftSession) {
  if (!session.turnStartedAt || !session.currentType) return TURN_SECONDS;
  const elapsed = Math.floor((Date.now() - new Date(session.turnStartedAt).getTime()) / 1000);
  return Math.max(0, TURN_SECONDS - elapsed);
}

function mapRealtimeMessage(row: Record<string, unknown>): DraftChatMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    channel: row.channel as DraftChatChannel,
    senderName: String(row.sender_name ?? "Player"),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at),
  };
}
