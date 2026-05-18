import { StandingsTable } from "@/components/league/StandingsTable";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = {
  title: "Standings — Serpent Ascension League",
};

export default function StandingsPage() {
  const { divisions, standings, orgs, season } = MOCK_LEAGUE_DATA;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Page header card — editor style */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/84 p-5 shadow-2xl shadow-black/35 backdrop-blur">
        <p className="text-xs font-black uppercase text-cyan-200">League Standings</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white">
          {season.name} · Week {season.currentWeek}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm font-semibold text-slate-400">
          Win%, games back, and form across Solar, Lunar, and Gaia divisions. Click any team to view their roster.
        </p>
      </div>

      <StandingsTable divisions={divisions} standings={standings} orgs={orgs} />

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-4 text-[0.65rem] font-bold uppercase text-slate-600">
        <span>W — Wins</span>
        <span>L — Losses</span>
        <span>Win% — Win percentage</span>
        <span>GB — Games behind leader</span>
        <span>Last 5 — Recent form</span>
      </div>
    </main>
  );
}
