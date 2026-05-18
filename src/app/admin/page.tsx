import { AdminStatCard } from "@/components/league/AdminStatCard";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = { title: "Admin — SAL" };

export default function AdminOverviewPage() {
  const { orgs, players, matches, standings, season } = MOCK_LEAGUE_DATA;

  const totalPlayers = players.length;
  const scheduledMatches = matches.filter((m) => m.status === "scheduled").length;
  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const liveMatches = matches.filter((m) => m.status === "live").length;

  const divisionBreakdown = ["solar", "lunar", "gaia"].map((id) => ({
    id,
    orgs: orgs.filter((o) => o.divisionId === id).length,
    players: players.filter((p) => p.divisionId === id).length,
    topOrg: (() => {
      const divStandings = standings
        .filter((s) => s.divisionId === id)
        .sort((a, b) => b.wins - a.wins);
      if (!divStandings[0]) return "—";
      return orgs.find((o) => o.id === divStandings[0].orgId)?.name ?? "—";
    })(),
  }));

  return (
    <main className="p-8">
      <div className="mb-8">
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          {season.name} · Week {season.currentWeek} · Status:{" "}
          <span className="font-semibold text-emerald-400">{season.status}</span>
        </p>
      </div>

      {/* Top stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Total Orgs" value={orgs.length} accent="cyan" />
        <AdminStatCard label="Total Players" value={totalPlayers} accent="violet" />
        <AdminStatCard label="Completed Matches" value={completedMatches} accent="emerald" />
        <AdminStatCard label="Scheduled Matches" value={scheduledMatches} sub={liveMatches > 0 ? `${liveMatches} live now` : undefined} accent="orange" />
      </div>

      {/* Division overview */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/35">Division Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {divisionBreakdown.map(({ id, orgs: orgCount, players: playerCount, topOrg }) => {
            const divName = id.charAt(0).toUpperCase() + id.slice(1);
            const accentMap = { solar: "orange", lunar: "cyan", gaia: "emerald" } as const;
            return (
              <div key={id} className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/35">{divName} Division</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Orgs</span>
                    <span className="font-bold text-white/90">{orgCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Players</span>
                    <span className="font-bold text-white/90">{playerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Leader</span>
                    <span className="truncate max-w-[120px] text-right font-bold text-white/90">{topOrg}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TODO notice */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-xs font-semibold text-orange-300/80">
          {/* TODO: wire to backend/auth */}
          Admin tools are currently mock-data driven. Backend integration and authentication are future work.
        </p>
      </div>
    </main>
  );
}
