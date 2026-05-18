"use client";

import { useState, useMemo } from "react";
import type { DivisionId } from "@/types/league";
import { OrgCard } from "@/components/league/OrgCard";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";
import { cn } from "@/lib/utils";

const DIVISION_FILTERS: { id: DivisionId | "all"; label: string }[] = [
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

export default function TeamsPage() {
  const { orgs, standings, players } = MOCK_LEAGUE_DATA;

  const [divisionFilter, setDivisionFilter] = useState<DivisionId | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (divisionFilter !== "all" && o.divisionId !== divisionFilter) return false;
      if (
        search &&
        !o.name.toLowerCase().includes(search.toLowerCase()) &&
        !o.tag.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [orgs, divisionFilter, search]);

  const getStanding = (orgId: string) => standings.find((s) => s.orgId === orgId);
  const getCaptainIgn = (captainId?: string) =>
    captainId ? players.find((p) => p.id === captainId)?.ign : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Page header card */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/84 p-5 shadow-2xl shadow-black/35 backdrop-blur">
        <p className="text-xs font-black uppercase text-cyan-200">Teams & Orgs</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white">Season 1 Roster</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-400">
          {orgs.length} orgs competing across Solar, Lunar, and Gaia divisions. Click any team to view their full roster.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/84 p-4 shadow-2xl shadow-black/35 backdrop-blur">
        {/* Search */}
        <input
          type="text"
          placeholder="Search teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/45 px-4 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        />

        {/* Division filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500">Division</span>
          {DIVISION_FILTERS.map(({ id, label }) => {
            const isActive = divisionFilter === id;
            const activeStyle = id !== "all" ? divisionActive[id as DivisionId] : "border-white/25 bg-white/10 text-white";
            return (
              <button
                key={id}
                onClick={() => setDivisionFilter(id as DivisionId | "all")}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                  isActive ? activeStyle : inactiveBtn,
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <span className="ml-auto text-[0.65rem] font-black uppercase text-slate-600">
          {filtered.length} / {orgs.length} teams
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/84 py-16 text-center backdrop-blur">
          <p className="text-sm font-black uppercase text-slate-500">No teams match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              standing={getStanding(org.id)}
              captainIgn={getCaptainIgn(org.captainId)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
