import Link from "next/link";
import { LeagueHero } from "@/components/league/LeagueHero";
import { DivisionCard } from "@/components/league/DivisionCard";
import { MatchCard } from "@/components/league/MatchCard";
import { StandingsTable } from "@/components/league/StandingsTable";
import { AnnouncementCard } from "@/components/league/AnnouncementCard";
import { LiveMatchFeature } from "@/components/league/LiveMatchFeature";
import { getLeagueData } from "@/lib/league-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { season, divisions, orgs, matches, standings, announcements } = await getLeagueData();

  const liveMatches = matches.filter((m) => m.status === "live");
  const upcomingMatches = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
    .slice(0, 5);
  const recentResults = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.scheduledTime.localeCompare(a.scheduledTime))
    .slice(0, 4);

  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;
  const liveMatch = liveMatches[0] ?? null;
  const upcomingMatch = upcomingMatches[0] ?? null;
  const liveMatchName = liveMatch
    ? `${getOrg(liveMatch.homeOrgId).name} vs ${getOrg(liveMatch.awayOrgId).name}`
    : undefined;

  return (
    <main>
      <LeagueHero season={season} liveMatchName={liveMatchName} />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.45fr_0.9fr]">
        <div>
          <SectionHeader eyebrow="Right Now" title={liveMatch ? "Live Matches" : "League Pulse"} />
          <LiveMatchFeature
            liveMatch={liveMatch}
            upcomingMatch={upcomingMatch}
            liveMatchHomeOrg={liveMatch ? getOrg(liveMatch.homeOrgId) : null}
            liveMatchAwayOrg={liveMatch ? getOrg(liveMatch.awayOrgId) : null}
            upcomingHomeOrg={upcomingMatch ? getOrg(upcomingMatch.homeOrgId) : null}
            upcomingAwayOrg={upcomingMatch ? getOrg(upcomingMatch.awayOrgId) : null}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/78 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
          <div className="space-y-4 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-200">Choose Division</p>
            {divisions.map((division) => {
              const leader = standings
                .filter((standing) => standing.divisionId === division.id)
                .sort((a, b) => b.wins - a.wins)[0];
              const leaderOrg = leader ? getOrg(leader.orgId) : undefined;
              return (
                <Link
                  key={division.id}
                  href={`/standings?division=${division.id}`}
                  className={cn(
                    "block rounded-xl border px-4 py-3 transition hover:bg-white/[0.05]",
                    division.id === "solar" && "border-orange-300/20 bg-orange-400/8",
                    division.id === "lunar" && "border-cyan-300/20 bg-cyan-400/8",
                    division.id === "gaia" && "border-emerald-300/20 bg-emerald-400/8",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-black italic text-white">{division.name.replace(" Division", "")}</span>
                    <span className="text-[0.65rem] font-black uppercase text-slate-500">Tier {division.tier}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{leaderOrg ? `Leader: ${leaderOrg.name}` : division.description}</p>
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs font-black uppercase text-slate-500">
              <span>{season.name}</span>
              <span className="text-right text-emerald-200">Week {season.currentWeek}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Schedule" title="Upcoming Matches" action={{ label: "Full Schedule →", href: "/schedule" }} />
            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Results" title="Recent Results" action={{ label: "Full Schedule →", href: "/schedule" }} />
            <div className="space-y-3">
              {recentResults.map((m) => (
                <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader eyebrow="League" title="Divisions" action={{ label: "All Teams →", href: "/teams" }} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {divisions.map((div) => (
            <DivisionCard
              key={div.id}
              division={div}
              standings={standings.filter((s) => s.divisionId === div.id).sort((a, b) => b.wins - a.wins)}
              orgs={orgs}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader eyebrow="Standings" title="League Standings" action={{ label: "Full Standings →", href: "/standings" }} />
        <StandingsTable divisions={divisions} standings={standings} orgs={orgs} />
      </section>

      {announcements.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader eyebrow="News" title="Announcements" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        </section>
      )}

      <section id="discord" className="relative overflow-hidden py-20">
        <div className="sal-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(45,212,191,0.15),transparent_34%),radial-gradient(circle_at_70%_40%,rgba(59,130,246,0.13),transparent_36%),radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.68)_100%)]" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="mb-2 text-xs font-black uppercase text-emerald-200">Community</p>
          <h2 className="mb-2 text-3xl font-black text-white">Join the Discord</h2>
          <p className="mb-8 text-sm font-semibold text-slate-400">
            Drafts, match callouts, captain coordination, and league operations all live in the SAL Discord server.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a href="#" className="rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-8 py-2.5 text-sm font-black uppercase text-emerald-100 transition hover:bg-emerald-300/20 active:translate-y-0.5 active:scale-95">
              Join Discord Server
            </a>
            <Link href="/schedule" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-8 py-2.5 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/15 active:translate-y-0.5 active:scale-95">
              View Schedule
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="mb-0.5 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">{eyebrow}</p>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="shrink-0 text-xs font-black uppercase text-emerald-300/70 transition-colors hover:text-emerald-100">
          {action.label}
        </Link>
      )}
    </div>
  );
}
