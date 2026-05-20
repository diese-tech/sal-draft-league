"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DivisionId, LeagueData, LeaguePlayer } from "@/types/league";
import type { PlayerRole } from "@/types/card-lab";
import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import { cn } from "@/lib/utils";

const ROLE_FILTERS: { id: PlayerRole | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Solo", label: "Solo" },
  { id: "Jungle", label: "Jungle" },
  { id: "Mid", label: "Mid" },
  { id: "Carry", label: "Carry" },
  { id: "Support", label: "Support" },
  { id: "Flex", label: "Flex" },
];

const DIVISION_FILTERS: { id: DivisionId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "solar", label: "Solar" },
  { id: "lunar", label: "Lunar" },
  { id: "gaia", label: "Gaia" },
];

const divisionActive: Record<DivisionId, string> = {
  solar: "border-orange-300/40 bg-orange-300/15 text-orange-100",
  lunar: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
  gaia: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
};

const inactiveBtn = "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200";

function PlayerCard({ player, org }: { player: LeaguePlayer; org?: { id: string; name: string; tag: string } }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 p-4 shadow-xl shadow-black/30 backdrop-blur transition duration-300",
        "hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-slate-900/85",
        player.isCaptain && "border-orange-300/30 shadow-orange-500/8",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-12 bg-gradient-to-br opacity-50", player.avatarGradient)} />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/5 to-slate-950/90" />

      <div className="relative flex items-center gap-3">
        <AvatarMark initials={player.avatarInitials} gradient={player.avatarGradient} className="h-12 w-12 shrink-0 rounded-xl text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-black text-white group-hover:text-cyan-100 transition">{player.ign}</p>
            {player.isCaptain && <span className="shrink-0 text-[0.6rem] font-black uppercase text-orange-300">CPT</span>}
          </div>
          <p className="truncate text-xs text-slate-500">@{player.discordUsername}</p>
          {org && <p className="truncate text-[0.65rem] font-semibold text-slate-600">{org.tag}</p>}
        </div>
        <RolePill role={player.primaryRole} compact />
      </div>

      {player.stats && player.stats.gamesPlayed > 0 && (
        <div className="relative mt-3 flex items-center gap-2 border-t border-white/8 pt-2.5">
          {[
            { label: "K", value: player.stats.kills },
            { label: "D", value: player.stats.deaths },
            { label: "A", value: player.stats.assists },
          ].map(({ label, value }) => (
            <span key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[0.65rem] font-black text-slate-300">
              {label} {value}
            </span>
          ))}
          <span className="ml-auto text-[0.6rem] font-bold text-slate-600">{player.stats.gamesPlayed}GP</span>
        </div>
      )}
    </Link>
  );
}

export function PlayersPageClient({ data }: { data: LeagueData }) {
  const { players, orgs } = data;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<PlayerRole | "all">("all");
  const [divisionFilter, setDivisionFilter] = useState<DivisionId | "all">("all");

  const filtered = useMemo(() => {
    return [...players]
      .sort((a, b) => a.ign.localeCompare(b.ign))
      .filter((p) => {
        if (search && !p.ign.toLowerCase().includes(search.toLowerCase()) && !p.discordUsername.toLowerCase().includes(search.toLowerCase())) return false;
        if (roleFilter !== "all" && p.primaryRole !== roleFilter && !p.secondaryRoles.includes(roleFilter)) return false;
        if (divisionFilter !== "all" && p.divisionId !== divisionFilter) return false;
        return true;
      });
  }, [players, search, roleFilter, divisionFilter]);

  const getOrg = (orgId?: string) => orgs.find((o) => o.id === orgId);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-300/15 bg-slate-950/84 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          placeholder="Search by IGN or Discord…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/45 px-4 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 sm:w-56"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500">Role</span>
          {ROLE_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setRoleFilter(id)}
              className={cn(
                "rounded-xl border px-2.5 py-1 text-xs font-black uppercase transition",
                roleFilter === id ? "border-fuchsia-300/40 bg-fuchsia-300/15 text-fuchsia-100" : inactiveBtn,
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-500">Div</span>
          {DIVISION_FILTERS.map(({ id, label }) => {
            const isActive = divisionFilter === id;
            const activeStyle = id !== "all" ? divisionActive[id as DivisionId] : "border-white/25 bg-white/10 text-white";
            return (
              <button
                key={id}
                onClick={() => setDivisionFilter(id)}
                className={cn("rounded-xl border px-2.5 py-1 text-xs font-black uppercase transition", isActive ? activeStyle : inactiveBtn)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-[0.65rem] font-black uppercase text-slate-600">
          {filtered.length} / {players.length} players
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/84 py-16 text-center backdrop-blur">
          <p className="text-sm font-black uppercase text-slate-500">No players match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} org={getOrg(p.orgId)} />
          ))}
        </div>
      )}
    </>
  );
}
