import { OrgLogo } from "@/components/card-lab/ui";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = { title: "Manage Teams — SAL Admin" };

export default function AdminTeamsPage() {
  const { orgs, standings } = MOCK_LEAGUE_DATA;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
          <h1 className="text-2xl font-black text-white">Manage Teams</h1>
        </div>
        {/* TODO: wire to backend */}
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 opacity-50 cursor-not-allowed" disabled>
          + Add Team
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-slate-950/60 overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_6rem] gap-x-4 border-b border-white/6 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-wider text-white/30">
          <span>#</span>
          <span>Org</span>
          <span>Div</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span>Captain</span>
          <span className="text-right">Actions</span>
        </div>
        {orgs.map((org, i) => {
          const standing = standings.find((s) => s.orgId === org.id);
          const divLabel = org.divisionId.charAt(0).toUpperCase() + org.divisionId.slice(1);
          return (
            <div
              key={org.id}
              className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_6rem] gap-x-4 items-center px-5 py-3.5 text-sm border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors"
            >
              <span className="text-xs text-white/30 tabular-nums">{i + 1}</span>
              <div className="flex items-center gap-2.5 min-w-0">
                <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-7 w-7 shrink-0 text-xs" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white/90">{org.name}</p>
                  <p className="text-[0.6rem] text-white/35">{org.tag}</p>
                </div>
              </div>
              <span className="text-xs text-white/50">{divLabel}</span>
              <span className="text-center tabular-nums text-white/80">{standing?.wins ?? 0}</span>
              <span className="text-center tabular-nums text-white/50">{standing?.losses ?? 0}</span>
              <span className="truncate text-xs text-white/40">{org.captainId ?? "—"}</span>
              <div className="flex justify-end gap-1">
                {/* TODO: wire edit/delete to backend */}
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-white/30 hover:text-white/60 transition-colors" disabled>Edit</button>
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-red-400/30 hover:text-red-400/60 transition-colors" disabled>Del</button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
