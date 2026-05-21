import { Suspense } from "react";
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
  return (
    <main>
      <HeroSection />
      <Suspense fallback={<PulseSectionSkeleton />}>
        <PulseSection />
      </Suspense>
      <Suspense fallback={<MatchesSectionSkeleton />}>
        <MatchesSection />
      </Suspense>
      <Suspense fallback={<DivisionsSectionSkeleton />}>
        <DivisionsSection />
      </Suspense>
      <Suspense fallback={<StandingsSectionSkeleton />}>
        <StandingsSection />
      </Suspense>
      <Suspense fallback={<AnnouncementsSectionSkeleton />}>
        <AnnouncementsSection />
      </Suspense>
      <DiscordSection />
    </main>
  );
}

async function HeroSection() {
  const { season, orgs, matches } = await getLeagueData();
  const liveMatches = matches.filter((m) => m.status === "live");
  const liveMatch = liveMatches[0] ?? null;
  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;
  const liveMatchName = liveMatch
    ? `${getOrg(liveMatch.homeOrgId).name} vs ${getOrg(liveMatch.awayOrgId).name}`
    : undefined;

  return <LeagueHero season={season} liveMatchName={liveMatchName} />;
}

async function PulseSection() {
  const { season, divisions, orgs, matches, standings } = await getLeagueData();
  const liveMatches = matches.filter((m) => m.status === "live");
  const upcomingMatches = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
    .slice(0, 5);
  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;
  const liveMatch = liveMatches[0] ?? null;
  const upcomingMatch = upcomingMatches[0] ?? null;

  return (
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

      {/* Division leaders panel — top-3 per division replacing navigation links */}
      <div className="overflow-hidden rounded-[var(--sal-card-radius)] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="h-0.5 bg-gradient-to-r from-orange-500 via-cyan-400 to-emerald-400" />
        <div className="p-4">
          <p className="mb-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Division Leaders</p>
          <div className="space-y-4">
            {divisions.map((division) => {
              const divStandings = standings
                .filter((s) => s.divisionId === division.id)
                .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
                .slice(0, 3);
              const accentColor =
                division.id === "solar"
                  ? "text-orange-400"
                  : division.id === "lunar"
                    ? "text-cyan-400"
                    : "text-emerald-400";
              return (
                <div key={division.id}>
                  <Link
                    href={`/standings?division=${division.id}`}
                    className="group mb-1.5 flex items-center justify-between"
                  >
                    <span className={cn("font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] transition-colors group-hover:text-white", accentColor)}>
                      {division.name.replace(" Division", "")}
                    </span>
                    <span className="font-mono text-[0.55rem] text-slate-600 transition-colors group-hover:text-slate-400">→</span>
                  </Link>
                  <div className="space-y-0.5">
                    {divStandings.map((s, rank) => {
                      const org = getOrg(s.orgId);
                      return (
                        <div key={s.orgId} className="flex items-center gap-2 rounded px-1 py-1 transition hover:bg-white/[0.04]">
                          <span className="w-4 font-mono text-[0.6rem] text-slate-600">#{rank + 1}</span>
                          <span className="flex-1 truncate text-[0.75rem] font-semibold text-slate-200">{org.tag}</span>
                          <span className="font-mono text-[0.65rem] font-semibold text-slate-400">
                            {s.wins}–{s.losses}
                          </span>
                          {/* Win streak dots — leading W results, up to 5 */}
                          {s.streak.length > 0 && s.streak[0] === "W" && (
                            <span className="flex items-center gap-0.5">
                              {s.streak.slice(0, 5).map((r, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "h-1 w-1 rounded-full",
                                    r === "W" ? accentColor.replace("text-", "bg-") : "bg-slate-700",
                                  )}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {divStandings.length === 0 && (
                      <p className="px-1 text-[0.7rem] text-slate-600">No standings yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="font-mono text-[0.6rem] text-slate-600">{season.name}</span>
            <span className="font-mono text-[0.6rem] text-cyan-500">Wk {season.currentWeek}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

async function MatchesSection() {
  const { orgs, matches } = await getLeagueData();
  const upcomingMatches = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
    .slice(0, 5);
  const recentResults = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.scheduledTime.localeCompare(a.scheduledTime))
    .slice(0, 4);
  const getOrg = (id: string) => orgs.find((o) => o.id === id)!;

  return (
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
  );
}

async function DivisionsSection() {
  const { divisions, orgs, standings } = await getLeagueData();

  return (
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
  );
}

async function StandingsSection() {
  const { divisions, orgs, standings } = await getLeagueData();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeader eyebrow="Standings" title="League Standings" action={{ label: "Full Standings →", href: "/standings" }} />
      <StandingsTable divisions={divisions} standings={standings} orgs={orgs} />
    </section>
  );
}

async function AnnouncementsSection() {
  const { announcements } = await getLeagueData();

  if (announcements.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeader eyebrow="News" title="Announcements" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {announcements.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} />
        ))}
      </div>
    </section>
  );
}

function DiscordSection() {
  return (
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
          <a href="https://discord.gg/qY8uFve4Dd" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-8 py-2.5 text-sm font-black uppercase text-emerald-100 transition hover:bg-emerald-300/20 active:translate-y-0.5 active:scale-95">
            Join Discord Server
          </a>
          <Link href="/schedule" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-8 py-2.5 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/15 active:translate-y-0.5 active:scale-95">
            View Schedule
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Skeleton components ---

// --- Shared skeleton primitive ---
function SkeletonBlock({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "solar" | "gaia";
}) {
  const shimmerClass =
    variant === "solar"
      ? "skeleton-shimmer-solar"
      : variant === "gaia"
        ? "skeleton-shimmer-gaia"
        : "skeleton-shimmer";
  return <div className={cn("rounded-[var(--sal-card-radius)]", shimmerClass, className)} />;
}

function SkeletonHeader({ eyebrow, variant = "default" }: { eyebrow: string; variant?: "default" | "solar" | "gaia" }) {
  return (
    <div className="mb-5 space-y-2">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400/60">{eyebrow}</p>
      <SkeletonBlock className="h-7 w-44" variant={variant} />
    </div>
  );
}

function PulseSectionSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <SkeletonHeader eyebrow="Right Now" />
        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
      </div>
    </section>
  );
}

function MatchesSectionSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <SkeletonHeader eyebrow="Schedule" />
          {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-16" />)}
        </div>
        <div className="space-y-3">
          <SkeletonHeader eyebrow="Results" />
          {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-16" />)}
        </div>
      </div>
    </section>
  );
}

function DivisionsSectionSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SkeletonHeader eyebrow="League" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonBlock className="h-40" variant="solar" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" variant="gaia" />
      </div>
    </section>
  );
}

function StandingsSectionSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SkeletonHeader eyebrow="Standings" />
      <SkeletonBlock className="h-64" />
    </section>
  );
}

function AnnouncementsSectionSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SkeletonHeader eyebrow="News" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-32" />)}
      </div>
    </section>
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
        <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">{eyebrow}</p>
        <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-white">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="shrink-0 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400 transition-colors hover:text-emerald-200">
          {action.label}
        </Link>
      )}
    </div>
  );
}
