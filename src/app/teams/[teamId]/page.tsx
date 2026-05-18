import { notFound } from "next/navigation";
import type { DivisionId } from "@/types/league";
import { GlowPanel, OrgLogo } from "@/components/card-lab/ui";
import { OrgRosterPanel } from "@/components/league/OrgRosterPanel";
import { MatchCard } from "@/components/league/MatchCard";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";
import { cn } from "@/lib/utils";
import Link from "next/link";

const divisionAccent: Record<DivisionId, { badge: string; bar: string; header: string; name: string }> = {
  solar: {
    badge: "border-orange-300/40 bg-orange-400/15 text-orange-100",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    header: "from-orange-500/20 via-amber-400/8 to-transparent",
    name: "Solar Division",
  },
  lunar: {
    badge: "border-cyan-300/40 bg-cyan-400/15 text-cyan-100",
    bar: "bg-gradient-to-r from-cyan-400 to-violet-500",
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
  return MOCK_LEAGUE_DATA.orgs.map((o) => ({ teamId: o.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const org = MOCK_LEAGUE_DATA.orgs.find((o) => o.id === teamId);
  return { title: org ? `${org.name} — SAL` : "Team — SAL" };
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { orgs, players, matches, standings } = MOCK_LEAGUE_DATA;

  const org = orgs.find((o) => o.id === teamId);
  if (!org) notFound();

  const roster = players.filter((p) => p.orgId === org.id);
  const standing = standings.find((s) => s.orgId === org.id);
  const accent = divisionAccent[org.divisionId];

  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  const orgMatches = matches
    .filter((m) => m.homeOrgId === org.id || m.awayOrgId === org.id)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const upcoming = orgMatches.filter((m) => m.status === "scheduled" || m.status === "live").slice(0, 3);
  const results = orgMatches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 3);

  const winPct =
    standing && standing.matchesPlayed > 0
      ? ((standing.wins / standing.matchesPlayed) * 100).toFixed(0)
      : "—";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/teams"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500 transition-colors hover:text-slate-300"
      >
        ← All Teams
      </Link>

      {/* Team banner — editor header card style with division gradient */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/84 shadow-2xl shadow-black/35 backdrop-blur">
        <div className={cn("h-1 w-full", accent.bar)} />
        <div className={cn("relative bg-gradient-to-br p-6", accent.header)}>
          <div className="flex flex-wrap items-center gap-5">
            <OrgLogo initials={org.logoInitials} gradient={org.logoGradient} className="h-20 w-20 shrink-0 text-xl" />
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-xl border px-2.5 py-0.5 text-xs font-black uppercase", accent.badge)}>
                  {accent.name}
                </span>
                {org.founded && (
                  <span className="text-[0.65rem] font-black uppercase text-slate-600">Est. {org.founded}</span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white">{org.name}</h1>
              <p className="text-xs font-black uppercase text-slate-500">[{org.tag}]</p>
            </div>

            {/* Standing stats */}
            {standing && (
              <div className="flex gap-5 rounded-xl border border-white/10 bg-black/20 px-5 py-3">
                {[
                  { label: "Wins", value: standing.wins },
                  { label: "Losses", value: standing.losses },
                  { label: "Win%", value: `${winPct}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-[0.6rem] font-black uppercase text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid: roster + sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Roster */}
        <div>
          <p className="mb-3 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Full Roster</p>
          <GlowPanel>
            <div className="p-4">
              <OrgRosterPanel players={roster} divisionId={org.divisionId} />
            </div>
          </GlowPanel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Upcoming Matches</p>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Recent Results</p>
              <div className="space-y-2">
                {results.map((m) => (
                  <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {org.socialLinks && Object.keys(org.socialLinks).length > 0 && (
            <div>
              <p className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Links</p>
              <div className="flex flex-wrap gap-2">
                {org.socialLinks.discord && (
                  <a href={org.socialLinks.discord} className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black uppercase text-fuchsia-100 transition hover:bg-fuchsia-300/15">
                    Discord
                  </a>
                )}
                {org.socialLinks.twitch && (
                  <a href={org.socialLinks.twitch} className="rounded-xl border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-xs font-black uppercase text-violet-100 transition hover:bg-violet-300/15">
                    Twitch
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
