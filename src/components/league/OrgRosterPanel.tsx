import type { LeaguePlayer, DivisionId } from "@/types/league";
import Link from "next/link";
import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import { cn } from "@/lib/utils";

const divisionAccentText: Record<DivisionId, string> = {
  solar: "text-orange-100",
  lunar: "text-cyan-100",
  gaia: "text-emerald-100",
};

function PlayerRow({ player, divisionId }: { player: LeaguePlayer; divisionId: DivisionId }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 p-3 shadow-xl shadow-black/30 backdrop-blur transition duration-300",
        "hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-slate-900/85",
        player.isCaptain && "border-orange-300/35 shadow-orange-500/10",
      )}
    >
      {/* Banner gradient strip */}
      <div className={cn("absolute inset-x-0 top-0 h-10 bg-gradient-to-br opacity-60", player.avatarGradient)} />
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/8 to-slate-950/80" />

      <div className="relative flex items-center gap-3">
        <AvatarMark
          initials={player.avatarInitials}
          gradient={player.avatarGradient}
          className="h-11 w-11 shrink-0 rounded-xl text-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-black leading-tight text-white">{player.ign}</p>
            {player.isCaptain && (
              <span className={cn("shrink-0 text-[0.65rem] font-black uppercase", divisionAccentText[divisionId])}>
                CPT
              </span>
            )}
            {!player.isStarter && (
              <span className="shrink-0 rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[0.65rem] font-black uppercase text-white/50">
                Sub
              </span>
            )}
          </div>
          <p className="truncate text-xs font-medium text-slate-400">@{player.discordUsername}</p>
        </div>
        <RolePill role={player.primaryRole} compact />
      </div>

      {/* Stats row */}
      {player.stats && player.stats.gamesPlayed > 0 && (
        <div className="relative mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5">
          {[
            { label: "K", value: player.stats.kills },
            { label: "D", value: player.stats.deaths },
            { label: "A", value: player.stats.assists },
          ].map(({ label, value }) => (
            <span key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-black text-slate-300">
              {label} {value}
            </span>
          ))}
          <span className="ml-auto text-[0.65rem] font-bold text-slate-500">
            {player.stats.gamesPlayed}GP · {player.stats.wins}W
          </span>
        </div>
      )}
    </Link>
  );
}

export function OrgRosterPanel({
  players,
  divisionId,
}: {
  players: LeaguePlayer[];
  divisionId: DivisionId;
}) {
  const captain = players.find((p) => p.isCaptain);
  const starters = players.filter((p) => p.isStarter && !p.isCaptain);
  const subs = players.filter((p) => !p.isStarter);

  return (
    <div className="space-y-5">
      {/* Captain */}
      {captain && (
        <div>
          <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Captain locked</p>
          <PlayerRow player={captain} divisionId={divisionId} />
        </div>
      )}

      {/* Starters */}
      {starters.length > 0 && (
        <div>
          <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Starting roster</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((p) => (
              <PlayerRow key={p.id} player={p} divisionId={divisionId} />
            ))}
          </div>
        </div>
      )}

      {/* Subs */}
      {subs.length > 0 && (
        <div>
          <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Substitutes</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {subs.map((p) => (
              <PlayerRow key={p.id} player={p} divisionId={divisionId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
