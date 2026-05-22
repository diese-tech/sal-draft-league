import { GodsPageClient } from "@/components/league/GodsPageClient";
import { getLeagueData } from "@/lib/league-data";
import { getLeagueGodStats, getOrgGodTendencies } from "@/lib/stats-data";
import type { DivisionId, OrgGodTendency, PlayerGodStats } from "@/types/league";

export const metadata = {
  title: "Gods - Serpent Ascension League",
};

export const revalidate = 30;

const divisions: DivisionId[] = ["solar", "lunar", "gaia"];

export default async function GodsPage() {
  const data = await getLeagueData();
  const seasonId = data.season.id;

  const [allStats, allTendencies, solarStats, solarTendencies, lunarStats, lunarTendencies, gaiaStats, gaiaTendencies] =
    await Promise.all([
      getLeagueGodStats(seasonId),
      getOrgGodTendencies(data.orgs, seasonId),
      getLeagueGodStats(seasonId, "solar"),
      getOrgGodTendencies(data.orgs, seasonId, "solar"),
      getLeagueGodStats(seasonId, "lunar"),
      getOrgGodTendencies(data.orgs, seasonId, "lunar"),
      getLeagueGodStats(seasonId, "gaia"),
      getOrgGodTendencies(data.orgs, seasonId, "gaia"),
    ]);

  const statsByDivision: Record<DivisionId | "all", PlayerGodStats[]> = {
    all: allStats,
    solar: solarStats,
    lunar: lunarStats,
    gaia: gaiaStats,
  };

  const tendenciesByDivision: Record<DivisionId | "all", OrgGodTendency[]> = {
    all: allTendencies,
    solar: solarTendencies,
    lunar: lunarTendencies,
    gaia: gaiaTendencies,
  };

  const trackedGames = allStats.reduce((sum, stat) => sum + stat.gamesPlayed, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/84 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-200">League God Analytics</p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white">{data.season.name} God Trends</h1>
          <p className="mt-1.5 max-w-3xl text-sm font-semibold text-slate-400">
            Most played picks, qualified win rates, and org tendencies across {divisions.length} divisions. Ban analytics are reserved for the next draft-data update.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xl font-black text-white">{allStats.length}</p>
              <p className="mt-0.5 text-[0.6rem] font-black uppercase text-slate-500">Gods Tracked</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xl font-black text-white">{trackedGames}</p>
              <p className="mt-0.5 text-[0.6rem] font-black uppercase text-slate-500">Stat Rows</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-xl font-black text-white">{allTendencies.length}</p>
              <p className="mt-0.5 text-[0.6rem] font-black uppercase text-slate-500">Org Tendencies</p>
            </div>
          </div>
        </div>
      </div>

      <GodsPageClient statsByDivision={statsByDivision} tendenciesByDivision={tendenciesByDivision} />
    </main>
  );
}
