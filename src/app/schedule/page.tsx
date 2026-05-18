"use client";

import { useState, useMemo } from "react";
import type { DivisionId, MatchStatus } from "@/types/league";
import { MatchCard } from "@/components/league/MatchCard";
import { ScheduleFilters } from "@/components/league/ScheduleFilters";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

function formatGroupDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SchedulePage() {
  const { matches, orgs, season } = MOCK_LEAGUE_DATA;

  const maxWeek = season.currentWeek + 2;

  const [division, setDivision] = useState<DivisionId | "all">("all");
  const [status, setStatus] = useState<MatchStatus | "all">("all");
  const [week, setWeek] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (division !== "all" && m.divisionId !== division) return false;
      if (status !== "all" && m.status !== status) return false;
      if (week !== "all" && m.week !== week) return false;
      return true;
    });
  }, [matches, division, status, week]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const m of filtered.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))) {
      const existing = map.get(m.scheduledDate) ?? [];
      map.set(m.scheduledDate, [...existing, m]);
    }
    return map;
  }, [filtered]);

  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Page header card */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/84 p-5 shadow-2xl shadow-black/35 backdrop-blur">
        <p className="text-xs font-black uppercase text-cyan-200">Match Schedule</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white">{season.name} · All Matches</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-400">
          Filter by division, week, or status. Live matches broadcast on the SAL Twitch channel.
        </p>
      </div>

      {/* Filter panel */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/84 p-4 shadow-2xl shadow-black/35 backdrop-blur">
        <ScheduleFilters
          division={division}
          status={status}
          week={week}
          maxWeek={maxWeek}
          onDivisionChange={setDivision}
          onStatusChange={setStatus}
          onWeekChange={setWeek}
        />
      </div>

      {/* Match list grouped by date */}
      {grouped.size === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/84 py-16 text-center backdrop-blur">
          <p className="text-sm font-black uppercase text-slate-500">No matches found for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([date, dayMatches]) => (
            <div key={date}>
              <p className="mb-3 text-[0.65rem] font-black uppercase text-slate-500">
                {formatGroupDate(date)}
              </p>
              <div className="space-y-3">
                {dayMatches.map((m) => (
                  <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
