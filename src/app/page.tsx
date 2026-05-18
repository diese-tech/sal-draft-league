import Link from "next/link";
import { LeagueHero } from "@/components/league/LeagueHero";
import { DivisionCard } from "@/components/league/DivisionCard";
import { MatchCard } from "@/components/league/MatchCard";
import { StandingsTable } from "@/components/league/StandingsTable";
import { AnnouncementCard } from "@/components/league/AnnouncementCard";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export default function HomePage() {
  const { season, divisions, orgs, matches, standings, announcements } = MOCK_LEAGUE_DATA;

  const liveMatches = matches.filter((m) => m.status === "live");
  const upcomingMatches = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 4);
  const recentResults = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 4);

  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  // Build live match label for hero banner
  const liveMatchName = liveMatches.length > 0
    ? `${getOrg(liveMatches[0].homeOrgId).name} vs ${getOrg(liveMatches[0].awayOrgId).name}`
    : undefined;

  return (
    <main>
      <LeagueHero season={season} liveMatchName={liveMatchName} />

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader eyebrow="Right Now" title="Live Matches" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming + Recent grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Schedule"
              title="Upcoming Matches"
              action={{ label: "Full Schedule →", href: "/schedule" }}
            />
            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader
              eyebrow="Results"
              title="Recent Results"
              action={{ label: "Full Schedule →", href: "/schedule" }}
            />
            <div className="space-y-3">
              {recentResults.map((m) => (
                <MatchCard key={m.id} match={m} homeOrg={getOrg(m.homeOrgId)} awayOrg={getOrg(m.awayOrgId)} compact />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divisions */}
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

      {/* Standings preview */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader eyebrow="Standings" title="League Standings" action={{ label: "Full Standings →", href: "/standings" }} />
        <StandingsTable divisions={divisions} standings={standings} orgs={orgs} />
      </section>

      {/* Announcements */}
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

      {/* Discord CTA */}
      <section id="discord" className="relative overflow-hidden py-20">
        <div className="sal-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="mb-2 text-xs font-black uppercase text-fuchsia-200">Community</p>
          <h2 className="mb-2 text-3xl font-black text-white">Join the Discord</h2>
          <p className="mb-8 text-sm font-semibold text-slate-400">
            Drafts, match callouts, captain coordination, and league operations all live in the SAL Discord server.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="#"
              className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-300/15 px-8 py-2.5 text-sm font-black uppercase text-fuchsia-100 transition hover:bg-fuchsia-300/20 active:translate-y-0.5 active:scale-95"
            >
              Join Discord Server
            </a>
            <Link
              href="/schedule"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-8 py-2.5 text-sm font-black uppercase text-slate-300 transition hover:bg-white/[0.08] active:translate-y-0.5 active:scale-95"
            >
              View Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <div className="border-t border-white/8 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-6">
          {[
            { label: "Standings", href: "/standings" },
            { label: "Schedule", href: "/schedule" },
            { label: "Teams", href: "/teams" },
            { label: "Admin", href: "/admin" },
          ].map(({ label, href }) => (
            <Link key={href} href={href} className="text-[0.65rem] font-black uppercase text-slate-600 transition-colors hover:text-slate-400">
              {label}
            </Link>
          ))}
        </div>
      </div>
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
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="mb-0.5 text-[0.65rem] font-black uppercase text-slate-500">{eyebrow}</p>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="text-xs font-black uppercase text-slate-500 transition-colors hover:text-slate-300">
          {action.label}
        </Link>
      )}
    </div>
  );
}
