import { notFound } from "next/navigation";
import type { DivisionId, PlayerRole } from "@/types/league";
import { GlowPanel, OrgLogo, RolePill } from "@/components/card-lab/ui";
import { GodPoolGrid } from "@/components/league/GodPoolGrid";
import { OrgRosterPanel } from "@/components/league/OrgRosterPanel";
import { MatchCard } from "@/components/league/MatchCard";
import { getLeagueData } from "@/lib/league-data";
import { getTeamRosterStats, getOrgBrandGodStats } from "@/lib/stats-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 30;

const VALID_ROLES = new Set<string>(["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"]);

function fmtN(n: number) {
  return n.toLocaleString("en-US");
}

const divisionAccent: Record<DivisionId, { badge: string; bar: string; header: string; name: string }> = {
  solar: {
    badge: "border-orange-300/40 bg-orange-400/15 text-orange-100",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    header: "from-orange-500/20 via-amber-400/8 to-transparent",
    name: "Solar Division",
  },
  lunar: {
    badge: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
    bar: "bg-gradient-to-r from-cyan-400 to-blue-500",
    header: "from-cyan-500/20 via-blue-500/8 to-transparent",
    name: "Lunar Division",
  },
  gaia: {
    badge: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-500",
    header: "from-emerald-500/20 via-teal-400/8 to-transparent",
    name: "Gaia Division",
  },
};

export async function generateStaticParams() {
  const data = await getLeagueData();
  return data.orgs.map((org) => ({ teamId: org.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const data = await getLeagueData();
  const org = data.orgs.find((o) => o.id === teamId);
  return { title: org ? `${org.name} - SAL` : "Team - SAL" };
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { orgs, players, matches, standings, season } = await getLeagueData();

  const org = orgs.find((o) => o.id === teamId);
  if (!org) notFound();

  const roster = players.filter((p) => p.orgId === org.id);
  const standing = standings.find((s) => s.orgId === org.id);
  const accent = divisionAccent[org.divisionId];
  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  const orgMatches = matches
    .filter((m) => m.homeOrgId === org.id || m.awayOrgId === org.id)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime));

  const upcoming = orgMatches.filter((m) => m.status === "scheduled" || m.status === "live").slice(0, 3);
  const results = orgMatches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.scheduledTime.localeCompare(a.scheduledTime))
    .slice(0, 3);

  const winPct =
    standing && standing.matchesPlayed > 0
      ? ((standing.wins / standing.matchesPlayed) * 100).toFixed(0)
      : "—";

  const [rosterStats, brandGodStats] = await Promise.all([
    getTeamRosterStats(org.id, season.id),
    org.brandId ? getOrgBrandGodStats(org.brandId, season.id) : Promise.resolve([]),
  ]);

  const brandDisplayName = org.name
    .replace(/\s+(Solar|Lunar|Gaia)\s+Division$/i, "")
    .replace(/\s+(Solar|Lunar|Gaia)$/i, "")
    .trim();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/teams"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500 transition-colors hover:text-slate-300"
      >
        ← All Teams
      </Link>

      <div className="mb-8 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/84 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className={cn("h-1 w-full", accent.bar)} />
        <div className={cn("relative bg-gradient-to-br p-6", accent.header)}>
          <div className="flex flex-wrap items-start gap-4">
            <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-16 w-16 shrink-0 text-lg sm:h-20 sm:w-20 sm:text-xl" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-xl border px-2.5 py-0.5 text-xs font-black uppercase", accent.badge)}>{accent.name}</span>
                {org.founded && <span className="text-[0.65rem] font-black uppercase text-slate-600">Est. {org.founded}</span>}
              </div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{org.name}</h1>
              <p className="text-xs font-black uppercase text-slate-500">[{org.tag}]</p>
            </div>

            {standing && (
              <div className="flex w-full gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:w-auto sm:gap-5 sm:px-5">
                {[
                  { label: "Wins", value: standing.wins },
                  { label: "Losses", value: standing.losses },
                  { label: "Win%", value: `${winPct}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 text-center sm:flex-none">
                    <p className="text-xl font-black text-white sm:text-2xl">{value}</p>
                    <p className="text-[0.6rem] font-black uppercase text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="mb-3 text-[0.68rem] font-black uppercase tracking-normal text-slate-300">Full Roster</p>
          <GlowPanel>
            <div className="p-4">
              <OrgRosterPanel players={roster} divisionId={org.divisionId} />
            </div>
          </GlowPanel>
        </div>

        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-300">Upcoming Matches</p>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-300">Recent Results</p>
              <div className="space-y-2">
                {results.map((m) => (
                  <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
                ))}
              </div>
            </div>
          )}

          {org.socialLinks && Object.keys(org.socialLinks).length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-300">Links</p>
              <div className="flex flex-wrap gap-2">
                {org.socialLinks.discord && (
                  <a
                    href={org.socialLinks.discord}
                    className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black uppercase text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                  >
                    Discord
                  </a>
                )}
                {org.socialLinks.twitch && (
                  <a
                    href={org.socialLinks.twitch}
                    className="rounded-xl border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-xs font-black uppercase text-violet-100 transition hover:bg-violet-300/15"
                  >
                    Twitch
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster Stats */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase text-slate-300">Roster Stats</p>
        {rosterStats.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
            No stats recorded for this season yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  {(["Player", "Role", "Games", "K / D / A", "KDA", "Win Rate", "Damage", "Mitigated"] as const).map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "pb-2 font-black uppercase text-slate-500",
                        ["Games", "K / D / A", "KDA", "Win Rate", "Damage", "Mitigated"].includes(h)
                          ? "text-right"
                          : "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rosterStats.map((p) => (
                  <tr key={p.playerId} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/players/${p.playerId}`}
                        className="font-black text-slate-200 transition-colors hover:text-cyan-200"
                      >
                        {p.ign}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      {VALID_ROLES.has(p.primaryRole) ? (
                        <RolePill role={p.primaryRole as PlayerRole} compact />
                      ) : (
                        <span className="text-slate-600">{p.primaryRole}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-black text-white">{p.gamesPlayed}</td>
                    <td className="py-2 pr-3 text-right font-black text-slate-300">
                      <span>
                        {p.kills} / {p.deaths} / {p.assists}
                      </span>
                      <span className="block text-[0.6rem] text-slate-600">
                        {(p.kills / p.gamesPlayed).toFixed(1)} / {(p.deaths / p.gamesPlayed).toFixed(1)} /{" "}
                        {(p.assists / p.gamesPlayed).toFixed(1)}/g
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-black">
                      <span className={cn(p.kda >= 2 ? "text-emerald-400" : "text-red-400")}>{p.kda.toFixed(2)}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-black">
                      <span className={cn(p.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>{p.winRate}%</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-black text-slate-300">
                      <span>{fmtN(p.totalDamage)}</span>
                      <span className="block text-[0.6rem] text-slate-600">{fmtN(p.avgDamage)}/g</span>
                    </td>
                    <td className="py-2 text-right font-black text-slate-300">
                      {p.totalMitigated != null ? (
                        <>
                          <span>{fmtN(p.totalMitigated)}</span>
                          <span className="block text-[0.6rem] text-slate-600">
                            {p.avgMitigated != null ? fmtN(p.avgMitigated) : "—"}/g
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Brand God Tendency */}
      {org.brandId && brandGodStats.length > 0 && (
        <div className="mt-4">
          <GodPoolGrid stats={brandGodStats} subtitle={`${brandDisplayName} teams`} />
        </div>
      )}
    </main>
  );
}
