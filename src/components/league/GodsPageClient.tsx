"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { DivisionId, OrgGodTendency, PlayerGodStats } from "@/types/league";
import { cn } from "@/lib/utils";

type DivisionFilter = DivisionId | "all";
type SortKey = "godPlayed" | "godClass" | "gamesPlayed" | "winRate" | "kda" | "avgDamage" | "avgMitigated" | "pickRate";
type SortDirection = "asc" | "desc";

const DIVISION_FILTERS: { id: DivisionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "solar", label: "Solar" },
  { id: "lunar", label: "Lunar" },
  { id: "gaia", label: "Gaia" },
];

const divisionActive: Record<DivisionId, string> = {
  solar: "border-orange-300/40 bg-orange-300/15 text-orange-100",
  lunar: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
  gaia: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
};

const inactiveBtn = "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200";

const columns: { key: SortKey; label: string; align?: "left" | "right" }[] = [
  { key: "godPlayed", label: "God" },
  { key: "godClass", label: "Class" },
  { key: "gamesPlayed", label: "Games", align: "right" },
  { key: "winRate", label: "Win Rate", align: "right" },
  { key: "kda", label: "KDA", align: "right" },
  { key: "avgDamage", label: "Avg DMG", align: "right" },
  { key: "avgMitigated", label: "Avg MIT", align: "right" },
  { key: "pickRate", label: "Pick Rate", align: "right" },
];

function fmtN(value: number) {
  return value.toLocaleString("en-US");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getSortValue(stat: PlayerGodStats, key: SortKey, totalGames: number) {
  if (key === "godClass") return stat.godClass ?? "";
  if (key === "avgMitigated") return stat.avgMitigated ?? -1;
  if (key === "pickRate") return totalGames > 0 ? stat.gamesPlayed / totalGames : 0;
  return stat[key];
}

function stableSort(stats: PlayerGodStats[], key: SortKey, direction: SortDirection, totalGames: number) {
  return stats
    .map((stat, index) => ({ stat, index }))
    .sort((a, b) => {
      const av = getSortValue(a.stat, key, totalGames);
      const bv = getSortValue(b.stat, key, totalGames);
      let result = 0;

      if (typeof av === "number" && typeof bv === "number") {
        result = av - bv;
      } else {
        result = String(av).localeCompare(String(bv));
      }

      if (result === 0) result = a.stat.godPlayed.localeCompare(b.stat.godPlayed);
      if (result === 0) result = a.index - b.index;
      return direction === "asc" ? result : -result;
    })
    .map(({ stat }) => stat);
}

export function getQualifiedHighestWinRateStats(stats: PlayerGodStats[]) {
  const totalGames = stats.reduce((sum, stat) => sum + stat.gamesPlayed, 0);
  return stableSort(stats.filter((stat) => stat.gamesPlayed >= 3), "winRate", "desc", totalGames);
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {children}
    </div>
  );
}

function GodTable({
  stats,
  totalGames,
  sortKey,
  sortDirection,
  onSort,
}: {
  stats: PlayerGodStats[];
  totalGames: number;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (stats.length === 0) {
    return <EmptyState>No god stats recorded for this filter yet.</EmptyState>;
  }

  const sorted = stableSort(stats, sortKey, sortDirection, totalGames);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="border-b border-white/8">
            {columns.map((column) => (
              <th key={column.key} className={cn("pb-2 font-black uppercase text-slate-500", column.align === "right" ? "text-right" : "text-left")}>
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className={cn("inline-flex items-center gap-1 transition hover:text-slate-200", column.align === "right" && "justify-end")}
                >
                  {column.label}
                  {sortKey === column.key && <span className="text-cyan-300">{sortDirection === "asc" ? "ASC" : "DESC"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map((stat) => {
            const pickRate = totalGames > 0 ? Math.round((stat.gamesPlayed / totalGames) * 100) : 0;
            return (
              <tr key={stat.godPlayed} className="hover:bg-white/[0.02]">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/10 text-[0.65rem] font-black text-cyan-100">
                      {initials(stat.godPlayed)}
                    </span>
                    <span className="font-black text-white">{stat.godPlayed}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 font-semibold text-slate-500">{stat.godClass ?? "-"}</td>
                <td className="py-2.5 pr-3 text-right font-black text-slate-300">{stat.gamesPlayed}</td>
                <td className="py-2.5 pr-3 text-right font-black">
                  <span className={cn(stat.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>{stat.winRate}%</span>
                </td>
                <td className="py-2.5 pr-3 text-right font-black text-slate-300">{stat.kda.toFixed(2)}</td>
                <td className="py-2.5 pr-3 text-right font-black text-slate-300">{fmtN(stat.avgDamage)}</td>
                <td className="py-2.5 pr-3 text-right font-black text-slate-300">{stat.avgMitigated != null ? fmtN(stat.avgMitigated) : "-"}</td>
                <td className="py-2.5 text-right font-black text-cyan-200">{pickRate}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {eyebrow && <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">{eyebrow}</p>}
          <h2 className="text-lg font-black text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function GodsPageClient({
  statsByDivision,
  tendenciesByDivision,
}: {
  statsByDivision: Record<DivisionFilter, PlayerGodStats[]>;
  tendenciesByDivision: Record<DivisionFilter, OrgGodTendency[]>;
}) {
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("gamesPlayed");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const stats = useMemo(() => statsByDivision[divisionFilter] ?? [], [divisionFilter, statsByDivision]);
  const totalGames = useMemo(() => stats.reduce((sum, stat) => sum + stat.gamesPlayed, 0), [stats]);
  const highestWinRate = useMemo(() => getQualifiedHighestWinRateStats(stats), [stats]);
  const tendencies = tendenciesByDivision[divisionFilter] ?? [];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "godPlayed" || key === "godClass" ? "asc" : "desc");
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-300/15 bg-slate-950/84 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500">Division</span>
          {DIVISION_FILTERS.map(({ id, label }) => {
            const isActive = divisionFilter === id;
            const activeStyle = id !== "all" ? divisionActive[id] : "border-white/25 bg-white/10 text-white";
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDivisionFilter(id)}
                className={cn("rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition", isActive ? activeStyle : inactiveBtn)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-[0.65rem] font-black uppercase text-slate-600">
          {stats.length} gods / {totalGames} games
        </span>
      </div>

      <div className="space-y-5">
        <Section title="Most Played" eyebrow="League Picks">
          <GodTable stats={stats} totalGames={totalGames} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
        </Section>

        <Section title="Highest Win Rate" eyebrow="Minimum 3 Games">
          <GodTable stats={highestWinRate} totalGames={totalGames} sortKey="winRate" sortDirection="desc" onSort={() => undefined} />
        </Section>

        <Section title="Most Banned" eyebrow="Coming In A Future Update">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  {["God", "Class", "Ban Count", "Ban Rate"].map((label, index) => (
                    <th key={label} className={cn("pb-2 font-black uppercase text-slate-500", index >= 2 ? "text-right" : "text-left")}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="mt-3">
            <EmptyState>God draft data will appear here once in-game drafting is live.</EmptyState>
          </div>
        </Section>

        <Section title="Org Tendencies" eyebrow="Top 5 Most Played">
          {tendencies.length === 0 ? (
            <EmptyState>No org tendencies recorded for this filter yet.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tendencies.map((org) => (
                <div key={org.brandId ?? org.orgId} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/teams/${org.orgId}`} className="truncate text-sm font-black text-white transition hover:text-cyan-200">
                        {org.orgName}
                      </Link>
                      <p className="mt-0.5 text-[0.6rem] font-black uppercase text-slate-600">
                        {org.brandId ? "Brand group" : org.orgTag} / {org.gamesPlayed} games
                      </p>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[0.65rem] font-black text-slate-400">
                      {org.orgTag}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {org.topGods.map((god, index) => (
                      <div key={god.godPlayed} className="grid grid-cols-[1.5rem_1fr_3rem_3rem] items-center gap-2 text-xs">
                        <span className="font-mono font-black text-slate-600">{index + 1}</span>
                        <span className="truncate font-black text-slate-300">{god.godPlayed}</span>
                        <span className="text-right font-black text-slate-500">{god.gamesPlayed}G</span>
                        <span className={cn("text-right font-black", god.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>{god.winRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
