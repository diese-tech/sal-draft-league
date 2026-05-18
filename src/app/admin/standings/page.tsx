import { OrgLogo } from "@/components/card-lab/ui";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = { title: "Manage Standings — SAL Admin" };

export default function AdminStandingsPage() {
  const { orgs, standings, divisions } = MOCK_LEAGUE_DATA;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
          <h1 className="text-2xl font-black text-white">Standings</h1>
          <p className="mt-1 text-sm text-white/40">Auto-calculated from completed matches. Manually override below.</p>
        </div>
        {/* TODO: wire recalculate to backend */}
        <button className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 opacity-50 cursor-not-allowed" disabled>
          Recalculate All
        </button>
      </div>

      {divisions.map((div) => {
        const divStandings = standings
          .filter((s) => s.divisionId === div.id)
          .sort((a, b) => b.wins - a.wins);

        return (
          <div key={div.id} className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/35">{div.name}</h2>
            <div className="rounded-xl border border-white/8 bg-slate-950/60 overflow-hidden">
              <div className="grid grid-cols-[2rem_1fr_4rem_4rem_4rem_4rem_5rem_6rem] gap-x-3 border-b border-white/6 px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/30">
                <span>#</span>
                <span>Org</span>
                <span className="text-center">W</span>
                <span className="text-center">L</span>
                <span className="text-center">MP</span>
                <span className="text-center">GB</span>
                <span className="text-center">Win%</span>
                <span className="text-right">Actions</span>
              </div>
              {divStandings.map((s, i) => {
                const org = orgs.find((o) => o.id === s.orgId);
                if (!org) return null;
                const winPct = s.matchesPlayed > 0 ? ((s.wins / s.matchesPlayed) * 100).toFixed(0) : "0";
                return (
                  <div
                    key={s.orgId}
                    className="grid grid-cols-[2rem_1fr_4rem_4rem_4rem_4rem_5rem_6rem] gap-x-3 items-center px-4 py-3 text-sm border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors"
                  >
                    <span className="text-xs text-white/30">{i + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-6 w-6 shrink-0 text-xs" />
                      <span className="truncate text-sm font-semibold text-white/85">{org.name}</span>
                    </div>
                    <span className="text-center font-bold tabular-nums text-white/85">{s.wins}</span>
                    <span className="text-center tabular-nums text-white/50">{s.losses}</span>
                    <span className="text-center tabular-nums text-white/40">{s.matchesPlayed}</span>
                    <span className="text-center tabular-nums text-white/40">{s.gamesBack === 0 ? "—" : s.gamesBack}</span>
                    <span className="text-center tabular-nums text-white/50">{winPct}%</span>
                    <div className="flex justify-end">
                      {/* TODO: wire manual override to backend */}
                      <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-white/30 hover:text-white/60 transition-colors" disabled>
                        Override
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-xs font-semibold text-orange-300/80">
          {/* TODO: wire to backend */}
          Manual overrides and recalculation require backend integration.
        </p>
      </div>
    </main>
  );
}
