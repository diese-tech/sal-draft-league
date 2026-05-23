import type { Match, Org, DivisionId } from "@/types/league";
import Link from "next/link";
import { OrgLogo } from "@/components/card-lab/ui";
import { formatMatchDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

const divisionHeaderGradient: Record<DivisionId, string> = {
  solar: "from-orange-500/30 via-amber-400/10 to-transparent",
  lunar: "from-cyan-500/30 via-blue-500/10 to-transparent",
  gaia: "from-emerald-500/30 via-teal-400/10 to-transparent",
};

const divisionBorder: Record<DivisionId, string> = {
  solar: "border-orange-500/35 hover:border-orange-500/55",
  lunar: "border-cyan-500/35 hover:border-cyan-500/55",
  gaia: "border-emerald-500/35 hover:border-emerald-500/55",
};

const statusConfig = {
  scheduled: {
    label: "Scheduled",
    dot: "bg-slate-500",
    pill: "border-white/10 bg-white/[0.04] text-slate-400",
    pulse: false,
  },
  live: {
    label: "LIVE",
    dot: "bg-orange-400",
    pill: "border-orange-300/50 bg-orange-400/15 text-orange-100",
    pulse: true,
  },
  completed: {
    label: "Final",
    dot: "bg-zinc-500",
    pill: "border-white/10 bg-white/[0.04] text-slate-400",
    pulse: false,
  },
  postponed: {
    label: "Postponed",
    dot: "bg-yellow-500",
    pill: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
    pulse: false,
  },
  forfeit: {
    label: "Forfeit",
    dot: "bg-red-500",
    pill: "border-red-500/30 bg-red-500/10 text-red-200",
    pulse: false,
  },
};

export function MatchCard({
  match,
  homeOrg,
  awayOrg,
  compact = false,
}: {
  match: Match;
  homeOrg: Org;
  awayOrg: Org;
  compact?: boolean;
}) {
  const cfg = statusConfig[match.status];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-slate-950/72 shadow-xl shadow-black/30 backdrop-blur transition duration-300",
        divisionBorder[match.divisionId],
      )}
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", divisionHeaderGradient[match.divisionId])} />

      {match.status === "live" && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.08),transparent_60%)]" />
      )}

      <div className={compact ? "p-3" : "p-4"}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black uppercase",
              cfg.pill,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot, cfg.pulse && "live-pulse")} />
            {cfg.label}
          </span>
          <span className="text-[0.65rem] font-bold text-slate-500">
            Wk {match.week} · {formatMatchDate(match.scheduledDate, match.scheduledTime)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <OrgLogo initials={homeOrg.logoInitials} gradient={homeOrg.logoGradient} className={cn("shrink-0", compact ? "h-8 w-8 text-xs" : "h-10 w-10")} />
            <span className={cn("truncate font-black text-white", compact ? "text-sm" : "text-base")}>{homeOrg.name}</span>
          </div>

          <div className="shrink-0 px-1">
            {match.status === "completed" ? (
              <span className={cn("font-mono font-black text-white", compact ? "text-lg" : "text-2xl")}>
                {match.homeScore}
                <span className="mx-1.5 text-slate-600">–</span>
                {match.awayScore}
              </span>
            ) : (
              <span className="text-xs font-black uppercase text-slate-600">vs</span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
            <span className={cn("truncate text-right font-black text-white", compact ? "text-sm" : "text-base")}>{awayOrg.name}</span>
            <OrgLogo initials={awayOrg.logoInitials} gradient={awayOrg.logoGradient} className={cn("shrink-0", compact ? "h-8 w-8 text-xs" : "h-10 w-10")} />
          </div>
        </div>

        {(match.status !== "completed" || match.streamUrl || match.vodUrl) && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
            {match.status !== "completed" && (
              <Link href={`/draft/god/${match.id}`} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-400/15">
                Start / Join / Watch Draft
              </Link>
            )}
            {match.streamUrl && (
              <a href={match.streamUrl} className="rounded-lg border border-orange-300/30 bg-orange-400/10 px-3 py-1.5 text-xs font-black uppercase text-orange-100 transition hover:bg-orange-400/15">
                ▶ Watch Live
              </a>
            )}
            {match.vodUrl && (
              <a href={match.vodUrl} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase text-slate-300 transition hover:bg-white/[0.08]">
                VOD
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
