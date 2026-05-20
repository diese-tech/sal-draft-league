"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Match, Org } from "@/types/league";
import type { TwitchLiveStatus } from "@/app/api/twitch/live/route";
import { OrgLogo } from "@/components/card-lab/ui";
import { MatchCard } from "@/components/league/MatchCard";
import { cn } from "@/lib/utils";

interface Props {
  liveMatch: Match | null;
  upcomingMatch: Match | null;
  liveMatchHomeOrg: Org | null;
  liveMatchAwayOrg: Org | null;
  upcomingHomeOrg: Org | null;
  upcomingAwayOrg: Org | null;
}

export function LiveMatchFeature({
  liveMatch,
  upcomingMatch,
  liveMatchHomeOrg,
  liveMatchAwayOrg,
  upcomingHomeOrg,
  upcomingAwayOrg,
}: Props) {
  const [twitch, setTwitch] = useState<TwitchLiveStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/twitch/live");
        if (!res.ok || cancelled) return;
        const data = await res.json() as TwitchLiveStatus;
        if (!cancelled) setTwitch(data);
      } catch {
        // silently ignore
      }
    }
    void check();
    const interval = setInterval(() => { void check(); }, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const twitchLive = twitch?.live === true;

  // --- Full "Live Now" featured card (Twitch live + match live) ---
  if (liveMatch && liveMatchHomeOrg && liveMatchAwayOrg && twitchLive) {
    return (
      <FeaturedLiveCard
        match={liveMatch}
        homeOrg={liveMatchHomeOrg}
        awayOrg={liveMatchAwayOrg}
        viewerCount={twitch?.viewerCount}
      />
    );
  }

  // --- Live match exists but Twitch status unknown/off ---
  if (liveMatch && liveMatchHomeOrg && liveMatchAwayOrg) {
    return (
      <div className="space-y-3">
        <MatchCard match={liveMatch} homeOrg={liveMatchHomeOrg} awayOrg={liveMatchAwayOrg} />
        {twitch?.channel && (
          <p className="text-xs text-slate-500">
            Watch on{" "}
            <a
              href={`https://www.twitch.tv/${twitch.channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 underline underline-offset-2 hover:text-purple-100"
            >
              Twitch →
            </a>
          </p>
        )}
      </div>
    );
  }

  // --- No live match: show upcoming ---
  if (upcomingMatch && upcomingHomeOrg && upcomingAwayOrg) {
    return <MatchCard match={upcomingMatch} homeOrg={upcomingHomeOrg} awayOrg={upcomingAwayOrg} />;
  }

  return <p className="py-4 text-sm text-slate-600">No upcoming matches.</p>;
}

function FeaturedLiveCard({
  match,
  homeOrg,
  awayOrg,
  viewerCount,
}: {
  match: Match;
  homeOrg: Org;
  awayOrg: Org;
  viewerCount?: number;
}) {
  const divColor = {
    solar: "border-orange-300/30 bg-orange-400/8",
    lunar: "border-cyan-300/30 bg-cyan-400/8",
    gaia: "border-emerald-300/30 bg-emerald-400/8",
  }[match.divisionId];

  const divLabel = { solar: "Solar Division", lunar: "Lunar Division", gaia: "Gaia Division" }[match.divisionId];
  const divText = { solar: "text-orange-200", lunar: "text-cyan-200", gaia: "text-emerald-200" }[match.divisionId];

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border backdrop-blur", divColor)}>
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(251,146,60,0.12),transparent_65%)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-orange-300/50 bg-orange-400/15 px-2.5 py-1 text-[0.65rem] font-black uppercase text-orange-100">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 live-pulse" />
            Live Now
          </span>
          <span className={cn("text-[0.65rem] font-black uppercase", divText)}>{divLabel} · Wk {match.week}</span>
        </div>
        {viewerCount !== undefined && viewerCount > 0 && (
          <span className="text-[0.6rem] font-black text-slate-500">{viewerCount.toLocaleString()} viewers</span>
        )}
      </div>

      {/* Teams */}
      <div className="relative flex items-center justify-between px-6 py-5">
        <TeamBlock org={homeOrg} score={match.homeScore} side="home" />

        <div className="flex flex-col items-center gap-1 px-4">
          {match.homeScore !== undefined && match.awayScore !== undefined ? (
            <span className="font-mono text-4xl font-black text-white">
              {match.homeScore}
              <span className="mx-2 text-slate-600">:</span>
              {match.awayScore}
            </span>
          ) : (
            <span className="text-xl font-black uppercase text-slate-600">vs</span>
          )}
        </div>

        <TeamBlock org={awayOrg} score={match.awayScore} side="away" />
      </div>

      {/* CTAs */}
      <div className="flex items-center justify-center gap-3 border-t border-white/8 px-5 py-3">
        <Link
          href="/watch"
          className="rounded-xl border border-orange-300/45 bg-orange-400/20 px-5 py-2 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-400/30"
        >
          ▶ Watch Live
        </Link>
        <Link
          href="/schedule"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-black uppercase text-slate-300 transition hover:bg-white/[0.08]"
        >
          Full Schedule
        </Link>
      </div>
    </article>
  );
}

function TeamBlock({ org, score: _score, side }: { org: Org; score?: number; side: "home" | "away" }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", side === "away" && "")}>
      <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-14 w-14 text-sm" />
      <span className="max-w-[7rem] text-center text-sm font-black text-white">{org.name}</span>
    </div>
  );
}
