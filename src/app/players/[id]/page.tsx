import { notFound } from "next/navigation";
import Link from "next/link";
import type { DivisionId } from "@/types/league";
import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import { getLeagueData } from "@/lib/league-data";
import { cn } from "@/lib/utils";

export const revalidate = 30;

const divisionBadge: Record<DivisionId, string> = {
  solar: "border-orange-300/40 bg-orange-400/15 text-orange-100",
  lunar: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
  gaia: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
};

const divisionName: Record<DivisionId, string> = {
  solar: "Solar Division",
  lunar: "Lunar Division",
  gaia: "Gaia Division",
};

const statusStyle: Record<string, string> = {
  "free-agent": "border-slate-300/25 bg-slate-300/10 text-slate-300",
  "org-affiliated": "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  drafted: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  "queued-ghost": "border-amber-300/30 bg-amber-300/10 text-amber-200",
  active: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200",
};

const statusLabel: Record<string, string> = {
  "free-agent": "Free Agent",
  "org-affiliated": "Org Affiliated",
  drafted: "Drafted",
  "queued-ghost": "Queued",
  active: "Active",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { players } = await getLeagueData();
  const p = players.find((x) => x.id === id);
  return { title: p ? `${p.ign} — SAL` : "Player — SAL" };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { players, orgs } = await getLeagueData();

  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const org = orgs.find((o) => o.id === player.orgId);
  const kda = player.stats && player.stats.deaths > 0
    ? ((player.stats.kills + player.stats.assists) / player.stats.deaths).toFixed(2)
    : player.stats ? String(player.stats.kills + player.stats.assists) : null;
  const winPct = player.stats && player.stats.gamesPlayed > 0
    ? Math.round((player.stats.wins / player.stats.gamesPlayed) * 100)
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/players"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500 transition hover:text-slate-200"
      >
        ← All Players
      </Link>

      {/* Profile header */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/84 shadow-2xl shadow-black/40 backdrop-blur">
        <div className={cn("h-24 bg-gradient-to-br opacity-60", player.avatarGradient)} />
        <div className="relative -mt-10 flex flex-wrap items-end gap-4 px-6 pb-6">
          <AvatarMark
            initials={player.avatarInitials}
            gradient={player.avatarGradient}
            className="h-20 w-20 shrink-0 rounded-2xl border-4 border-slate-950 text-2xl shadow-xl"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {player.divisionId && (
                <span className={cn("rounded-xl border px-2.5 py-0.5 text-[0.65rem] font-black uppercase", divisionBadge[player.divisionId])}>
                  {divisionName[player.divisionId]}
                </span>
              )}
              {player.isCaptain && (
                <span className="rounded-xl border border-orange-300/40 bg-orange-300/15 px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-orange-100">
                  Captain
                </span>
              )}
              {!player.isStarter && player.orgId && (
                <span className="rounded-xl border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-slate-400">
                  Sub
                </span>
              )}
              <span className={cn("rounded-xl border px-2.5 py-0.5 text-[0.65rem] font-black uppercase", statusStyle[player.status])}>
                {statusLabel[player.status]}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">{player.ign}</h1>
            <p className="text-sm text-slate-500">@{player.discordUsername}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Role */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase text-slate-500">Role</p>
          <div className="flex flex-wrap gap-2">
            <RolePill role={player.primaryRole} />
            {player.secondaryRoles.map((r) => (
              <span key={r} className="rounded-xl border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-black uppercase text-slate-400">
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Org */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <p className="mb-3 text-[0.65rem] font-black uppercase text-slate-500">Team</p>
          {org ? (
            <Link
              href={`/teams/${org.id}`}
              className="flex items-center gap-2 text-sm font-black text-white transition hover:text-cyan-200"
            >
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-slate-400">{org.tag}</span>
              {org.name}
              <span className="text-slate-600">→</span>
            </Link>
          ) : (
            <p className="text-sm font-semibold text-slate-500">Unaffiliated</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {player.stats && player.stats.gamesPlayed > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <p className="mb-4 text-[0.65rem] font-black uppercase text-slate-500">Season Stats</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: "Kills", value: player.stats.kills },
              { label: "Deaths", value: player.stats.deaths },
              { label: "Assists", value: player.stats.assists },
              { label: "KDA", value: kda },
              { label: "Games", value: player.stats.gamesPlayed },
              { label: "Win%", value: winPct !== null ? `${winPct}%` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
                <p className="text-xl font-black text-white">{value}</p>
                <p className="mt-0.5 text-[0.6rem] font-black uppercase text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
