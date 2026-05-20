"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Match, Org } from "@/types/league";
import { OrgLogo } from "@/components/card-lab/ui";
import { cn } from "@/lib/utils";

interface Props {
  channel: string;
  isLive: boolean;
  streamTitle: string;
  viewerCount: number;
  liveMatch: Match | null;
  homeOrg: Org | null;
  awayOrg: Org | null;
  nextMatch: Match | null;
  nextHomeOrg: Org | null;
  nextAwayOrg: Org | null;
}

export function WatchLiveClient({
  channel,
  isLive,
  streamTitle,
  viewerCount,
  liveMatch,
  homeOrg,
  awayOrg,
  nextMatch,
  nextHomeOrg,
  nextAwayOrg,
}: Props) {
  const [hostname, setHostname] = useState<string>("");

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const playerSrc = hostname
    ? `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&autoplay=true`
    : null;
  const chatSrc = hostname
    ? `https://www.twitch.tv/embed/${channel}/chat?parent=${hostname}&darkpopout`
    : null;

  if (!isLive) {
    return <OfflineState nextMatch={nextMatch} nextHomeOrg={nextHomeOrg} nextAwayOrg={nextAwayOrg} channel={channel} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Match context bar */}
      {liveMatch && homeOrg && awayOrg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-300/25 bg-orange-400/8 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg border border-orange-300/50 bg-orange-400/15 px-2 py-0.5 text-[0.6rem] font-black uppercase text-orange-100">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 live-pulse" />
              Live
            </span>
            <OrgLogo initials={homeOrg.logoInitials} gradient={homeOrg.logoGradient} className="h-7 w-7 text-[0.5rem]" />
            <span className="text-sm font-black text-white">{homeOrg.name}</span>
            {liveMatch.homeScore !== undefined ? (
              <span className="font-mono text-lg font-black text-white">
                {liveMatch.homeScore}
                <span className="mx-1 text-slate-600">:</span>
                {liveMatch.awayScore}
              </span>
            ) : (
              <span className="text-xs text-slate-500">vs</span>
            )}
            <span className="text-sm font-black text-white">{awayOrg.name}</span>
            <OrgLogo initials={awayOrg.logoInitials} gradient={awayOrg.logoGradient} className="h-7 w-7 text-[0.5rem]" />
          </div>
          {viewerCount > 0 && (
            <span className="text-[0.65rem] font-semibold text-slate-500">{viewerCount.toLocaleString()} viewers</span>
          )}
        </div>
      )}

      {streamTitle && (
        <p className="text-xs font-semibold text-slate-500">{streamTitle}</p>
      )}

      {/* Player + chat */}
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        {/* Player */}
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {playerSrc ? (
            <iframe
              src={playerSrc}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-slate-600">Loading player…</span>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-black", "hidden lg:block")}>
          {chatSrc ? (
            <iframe src={chatSrc} className="h-full min-h-[480px] w-full" />
          ) : (
            <div className="flex h-full min-h-[480px] items-center justify-center">
              <span className="text-sm text-slate-600">Loading chat…</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile chat toggle note */}
      <p className="text-center text-[0.65rem] text-slate-600 lg:hidden">
        Chat is available on desktop. Open{" "}
        <a
          href={`https://www.twitch.tv/${channel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 underline underline-offset-2"
        >
          Twitch
        </a>{" "}
        to join the chat.
      </p>
    </div>
  );
}

function OfflineState({
  nextMatch,
  nextHomeOrg,
  nextAwayOrg,
  channel,
}: {
  nextMatch: Match | null;
  nextHomeOrg: Org | null;
  nextAwayOrg: Org | null;
  channel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <span className="text-3xl">📺</span>
      </div>
      <div>
        <h2 className="text-xl font-black text-white">Stream is Offline</h2>
        <p className="mt-1 text-sm text-slate-500">
          The SAL broadcast is not currently live.{" "}
          <a
            href={`https://www.twitch.tv/${channel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline underline-offset-2 hover:text-purple-200"
          >
            Follow on Twitch
          </a>{" "}
          to get notified.
        </p>
      </div>

      {nextMatch && nextHomeOrg && nextAwayOrg && (
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left">
          <p className="mb-3 text-[0.65rem] font-black uppercase text-slate-500">Next Up</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <OrgLogo initials={nextHomeOrg.logoInitials} gradient={nextHomeOrg.logoGradient} className="h-8 w-8 text-xs" />
              <span className="text-sm font-black text-white">{nextHomeOrg.name}</span>
            </div>
            <span className="text-xs text-slate-600">vs</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{nextAwayOrg.name}</span>
              <OrgLogo initials={nextAwayOrg.logoInitials} gradient={nextAwayOrg.logoGradient} className="h-8 w-8 text-xs" />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/schedule"
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-2 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/15"
        >
          View Schedule
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-black uppercase text-slate-300 transition hover:bg-white/[0.08]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
