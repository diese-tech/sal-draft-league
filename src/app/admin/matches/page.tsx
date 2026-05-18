import { OrgLogo } from "@/components/card-lab/ui";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";
import { cn } from "@/lib/utils";

export const metadata = { title: "Manage Matches — SAL Admin" };

const statusStyle: Record<string, string> = {
  scheduled: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  live: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  postponed: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
};

export default function AdminMatchesPage() {
  const { matches, orgs } = MOCK_LEAGUE_DATA;

  const sorted = [...matches].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
          <h1 className="text-2xl font-black text-white">Manage Matches</h1>
          <p className="mt-1 text-sm text-white/40">{matches.length} total matches</p>
        </div>
        {/* TODO: wire to backend */}
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 opacity-50 cursor-not-allowed" disabled>
          + Schedule Match
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-slate-950/60 overflow-hidden">
        {sorted.map((m) => {
          const home = getOrg(m.homeOrgId);
          const away = getOrg(m.awayOrgId);
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-4 border-b border-white/4 px-5 py-3.5 last:border-0 hover:bg-white/3 transition-colors"
            >
              {/* Status + week */}
              <div className="flex items-center gap-2 w-36 shrink-0">
                <span className={cn("rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider", statusStyle[m.status])}>
                  {m.status}
                </span>
                <span className="text-xs text-white/30">Wk{m.week}</span>
              </div>

              {/* Match */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <OrgLogo initials={home.logoInitials} gradient={home.logoGradient} className="h-7 w-7 shrink-0 text-xs" />
                  <span className="truncate text-sm font-semibold text-white/85">{home.name}</span>
                </div>
                <span className="text-xs text-white/30 shrink-0">
                  {m.status === "completed" ? `${m.homeScore}–${m.awayScore}` : "vs"}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="truncate text-sm font-semibold text-white/85 text-right">{away.name}</span>
                  <OrgLogo initials={away.logoInitials} gradient={away.logoGradient} className="h-7 w-7 shrink-0 text-xs" />
                </div>
              </div>

              {/* Date */}
              <span className="text-xs text-white/35 w-24 shrink-0 text-right">
                {m.scheduledDate}
              </span>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {/* TODO: wire score entry + edit to backend */}
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-white/30 hover:text-white/60 transition-colors" disabled>
                  Score
                </button>
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-white/30 hover:text-white/60 transition-colors" disabled>
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
