import type { Division, OrgStanding, Org } from "@/types/league";
import { GlowPanel, OrgLogo } from "@/components/card-lab/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

const divisionAccent = {
  solar: {
    border: "border-orange-500/25 hover:border-orange-500/45",
    badge: "border-orange-300/35 bg-orange-400/10 text-orange-100",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    header: "from-orange-500/20 via-amber-400/5 to-transparent",
    text: "text-orange-100",
    sub: "text-orange-200/60",
  },
  lunar: {
    border: "border-cyan-500/25 hover:border-cyan-500/45",
    badge: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    bar: "bg-gradient-to-r from-cyan-400 to-violet-500",
    header: "from-cyan-500/20 via-blue-500/5 to-transparent",
    text: "text-cyan-100",
    sub: "text-cyan-200/60",
  },
  gaia: {
    border: "border-emerald-500/25 hover:border-emerald-500/45",
    badge: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-500",
    header: "from-emerald-500/20 via-teal-400/5 to-transparent",
    text: "text-emerald-100",
    sub: "text-emerald-200/60",
  },
};

export function DivisionCard({
  division,
  standings,
  orgs,
}: {
  division: Division;
  standings: OrgStanding[];
  orgs: Org[];
}) {
  const accent = divisionAccent[division.id];
  const topOrgs = standings.slice(0, 3).map((s) => orgs.find((o) => o.id === s.orgId)).filter(Boolean) as Org[];

  return (
    <GlowPanel className={cn("transition-all duration-300 h-full", accent.border)}>
      {/* Color bar */}
      <div className={cn("h-1 w-full rounded-t-2xl", accent.bar)} />

      {/* Division header */}
      <div className={cn("relative bg-gradient-to-br p-4 pb-3", accent.header)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-0.5 text-[0.65rem] font-black uppercase text-slate-500">Tier {division.tier}</p>
            <h3 className={cn("text-xl font-black", accent.text)}>{division.name}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">{division.description}</p>
          </div>
        </div>
      </div>

      {/* Standings body */}
      <div className="space-y-2 p-4 pt-3">
        <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Standings</p>
        {topOrgs.map((org, i) => {
          const standing = standings[i];
          return (
            <Link
              key={org.id}
              href={`/teams/${org.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="w-4 shrink-0 text-xs font-black text-slate-600">{i + 1}</span>
              <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-7 w-7 shrink-0 text-xs" />
              <span className="flex-1 truncate font-black text-white">{org.name}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-400">
                {standing.wins}–{standing.losses}
              </span>
            </Link>
          );
        })}
        <Link
          href={`/standings?division=${division.id}`}
          className={cn("mt-1 block text-right text-xs font-black uppercase transition-colors hover:text-white", accent.sub)}
        >
          Full Standings →
        </Link>
      </div>
    </GlowPanel>
  );
}
