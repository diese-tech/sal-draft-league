"use client";

import { useState } from "react";
import type { Division, OrgStanding, Org, DivisionId } from "@/types/league";
import { OrgLogo } from "@/components/card-lab/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

const divisionTab: Record<DivisionId, { active: string; label: string }> = {
  solar: {
    active: "border-orange-300/40 bg-orange-300/15 text-orange-100",
    label: "Solar",
  },
  lunar: {
    active: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
    label: "Lunar",
  },
  gaia: {
    active: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
    label: "Gaia",
  },
};

const divisionTopRow: Record<DivisionId, string> = {
  solar: "bg-orange-500/8",
  lunar: "bg-cyan-500/8",
  gaia: "bg-emerald-500/8",
};

const inactiveTab = "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200";

function StreakDots({ streak }: { streak: ("W" | "L")[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {streak.slice(-5).map((r, i) => (
        <span
          key={i}
          className={cn("h-2 w-2 rounded-full", r === "W" ? "bg-emerald-400" : "bg-red-500/70")}
          title={r}
        />
      ))}
    </div>
  );
}

export function StandingsTable({
  divisions,
  standings,
  orgs,
  defaultDivision = "solar",
}: {
  divisions: Division[];
  standings: OrgStanding[];
  orgs: Org[];
  defaultDivision?: DivisionId;
}) {
  const [activeDivision, setActiveDivision] = useState<DivisionId>(defaultDivision);

  const divStandings = standings
    .filter((s) => s.divisionId === activeDivision)
    .sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const topRow = divisionTopRow[activeDivision];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/84 shadow-2xl shadow-black/35 backdrop-blur">
      {/* Division tab bar */}
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <span className="mr-1 text-xs font-black uppercase text-slate-500">Division</span>
        {divisions.map((d) => {
          const tab = divisionTab[d.id];
          const isActive = d.id === activeDivision;
          return (
            <button
              key={d.id}
              onClick={() => setActiveDivision(d.id)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                isActive ? tab.active : inactiveTab,
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_4rem_4rem_5rem] gap-x-3 border-b border-white/8 px-4 py-2.5 text-[0.65rem] font-black uppercase text-slate-500">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">W</span>
        <span className="text-center">L</span>
        <span className="text-center">Win%</span>
        <span className="text-center">GB</span>
        <span className="text-center">Last 5</span>
      </div>

      {/* Rows */}
      {divStandings.map((s, i) => {
        const org = orgs.find((o) => o.id === s.orgId);
        if (!org) return null;
        const winPct = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) : 0;

        return (
          <Link
            key={s.orgId}
            href={`/teams/${org.id}`}
            className={cn(
              "grid grid-cols-[2rem_1fr_3.5rem_3.5rem_4rem_4rem_5rem] gap-x-3 items-center px-4 py-3 transition-colors hover:bg-white/[0.04]",
              i === 0 && topRow,
            )}
          >
            <span className={cn("text-xs font-black tabular-nums", i === 0 ? "text-white" : "text-slate-500")}>
              {i + 1}
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-7 w-7 shrink-0 text-xs" />
              <div className="min-w-0">
                <p className="truncate font-black text-white">{org.name}</p>
                <p className="text-[0.6rem] font-black uppercase text-slate-500">{org.tag}</p>
              </div>
            </div>
            <span className="text-center font-black tabular-nums text-white">{s.wins}</span>
            <span className="text-center tabular-nums text-slate-400">{s.losses}</span>
            <span className="text-center tabular-nums text-slate-400">{(winPct * 100).toFixed(0)}%</span>
            <span className="text-center tabular-nums text-slate-500">{s.gamesBack === 0 ? "—" : s.gamesBack}</span>
            <div className="flex justify-center">
              <StreakDots streak={s.streak} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
