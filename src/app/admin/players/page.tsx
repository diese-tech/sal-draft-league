import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = { title: "Manage Players — SAL Admin" };

export default function AdminPlayersPage() {
  const { players, orgs } = MOCK_LEAGUE_DATA;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
          <h1 className="text-2xl font-black text-white">Manage Players</h1>
          <p className="mt-1 text-sm text-white/40">{players.length} registered players</p>
        </div>
        {/* TODO: wire to backend */}
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 opacity-50 cursor-not-allowed" disabled>
          + Add Player
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-slate-950/60 overflow-hidden">
        <div className="grid grid-cols-[1fr_5rem_6rem_5rem_5rem_6rem] gap-x-4 border-b border-white/6 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-wider text-white/30">
          <span>Player</span>
          <span>Role</span>
          <span>Org</span>
          <span className="text-center">Starter</span>
          <span className="text-center">Captain</span>
          <span className="text-right">Actions</span>
        </div>
        {players.map((p) => {
          const org = orgs.find((o) => o.id === p.orgId);
          return (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_5rem_6rem_5rem_5rem_6rem] gap-x-4 items-center px-5 py-3 text-sm border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AvatarMark initials={p.avatarInitials} gradient={p.avatarGradient} className="h-8 w-8 shrink-0 text-xs" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white/90">{p.ign}</p>
                  <p className="text-[0.6rem] text-white/35">@{p.discordUsername}</p>
                </div>
              </div>
              <RolePill role={p.primaryRole} compact />
              <span className="truncate text-xs text-white/50">{org?.name ?? "—"}</span>
              <span className="text-center text-xs text-white/50">{p.isStarter ? "✓" : "—"}</span>
              <span className="text-center text-xs text-white/50">{p.isCaptain ? "⚑" : "—"}</span>
              <div className="flex justify-end gap-1">
                {/* TODO: wire to backend */}
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
