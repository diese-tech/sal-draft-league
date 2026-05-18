import type { Org, OrgStanding, DivisionId } from "@/types/league";
import { GlowPanel, OrgLogo } from "@/components/card-lab/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

const divisionAccent: Record<DivisionId, { border: string; badge: string; bar: string; headerGlow: string }> = {
  solar: {
    border: "border-orange-500/20 hover:border-orange-500/45",
    badge: "border-orange-300/35 bg-orange-400/10 text-orange-100",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    headerGlow: "from-orange-500/25 via-amber-400/10 to-transparent",
  },
  lunar: {
    border: "border-cyan-500/20 hover:border-cyan-500/45",
    badge: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    bar: "bg-gradient-to-r from-cyan-400 to-violet-500",
    headerGlow: "from-cyan-500/25 via-blue-500/10 to-transparent",
  },
  gaia: {
    border: "border-emerald-500/20 hover:border-emerald-500/45",
    badge: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-500",
    headerGlow: "from-emerald-500/25 via-teal-400/10 to-transparent",
  },
};

export function OrgCard({
  org,
  standing,
  captainIgn,
}: {
  org: Org;
  standing?: OrgStanding;
  captainIgn?: string;
}) {
  const accent = divisionAccent[org.divisionId];

  return (
    <Link href={`/teams/${org.id}`} className="block">
      <GlowPanel className={cn("transition-all duration-300 h-full", accent.border)}>
        {/* Division color bar */}
        <div className={cn("h-1 w-full rounded-t-2xl", accent.bar)} />

        {/* Header with gradient */}
        <div className={cn("relative bg-gradient-to-br p-4", accent.headerGlow)}>
          <div className="flex items-start gap-3">
            <OrgLogo
              initials={org.logoInitials}
              gradient={org.logoGradient}
              className="h-12 w-12 shrink-0"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="truncate text-xl font-black text-white">{org.name}</h3>
              <p className="text-xs font-bold uppercase text-white/55">[{org.tag}]</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4 pt-3">
          {/* Division badge */}
          <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-black uppercase tracking-normal", accent.badge)}>
            {org.divisionId.charAt(0).toUpperCase() + org.divisionId.slice(1)} Division
          </span>

          {/* Captain locked block */}
          {captainIgn && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1.5 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Captain locked</p>
              <p className="truncate font-black text-white">{captainIgn}</p>
            </div>
          )}

          {/* Standing */}
          {standing && (
            <div className="flex items-center justify-between border-t border-white/8 pt-3">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-black tabular-nums text-white">{standing.wins}</p>
                  <p className="text-[0.6rem] font-black uppercase text-slate-500">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black tabular-nums text-slate-400">{standing.losses}</p>
                  <p className="text-[0.6rem] font-black uppercase text-slate-500">Loss</p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase text-slate-400">
                View Roster →
              </span>
            </div>
          )}
        </div>
      </GlowPanel>
    </Link>
  );
}
