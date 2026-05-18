import type { Season } from "@/types/league";
import Link from "next/link";
import { cn } from "@/lib/utils";

const seasonStatusLabel = {
  "pre-season": "Pre-Season",
  active: "Season Active",
  "post-season": "Post-Season",
  offseason: "Off-Season",
};

const seasonStatusStyle = {
  "pre-season": "border-white/10 bg-white/[0.04] text-slate-400",
  active: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
  "post-season": "border-violet-300/40 bg-violet-300/15 text-violet-100",
  offseason: "border-white/10 bg-white/[0.04] text-slate-400",
};

export function LeagueHero({ season, liveMatchName }: { season: Season; liveMatchName?: string }) {
  return (
    <section className="relative overflow-hidden">
      {/* Tactical grid */}
      <div className="sal-grid pointer-events-none absolute inset-0" />

      {/* Radial atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-orange-500/7 blur-3xl" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 translate-x-1/2 rounded-full bg-cyan-500/7 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-fuchsia-600/5 blur-3xl" />
      </div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20">
        {/* Live match banner — if there's a live match */}
        {liveMatchName && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-center backdrop-blur">
            <p className="text-xs font-black uppercase text-orange-200">Live Now</p>
            <p className="mt-0.5 text-lg font-black text-white">{liveMatchName} is on stream</p>
          </div>
        )}

        {/* Crest + identity */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-500/20 via-transparent to-fuchsia-600/20 text-base font-black text-cyan-200 shadow-2xl shadow-cyan-950/50">
            SAL
          </div>

          {/* Status badges */}
          <div className="mb-5 flex items-center gap-2">
            <span
              className={cn(
                "rounded-xl border px-3 py-1 text-xs font-black uppercase",
                seasonStatusStyle[season.status],
              )}
            >
              {seasonStatusLabel[season.status]}
            </span>
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase text-slate-400">
              Week {season.currentWeek}
            </span>
          </div>

          {/* Main title */}
          <h1 className="mb-2 text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Serpent{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
              Ascension
            </span>
          </h1>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
            League · {season.name}
          </p>
          <p className="mb-10 max-w-lg text-base font-semibold leading-relaxed text-slate-400">
            Competitive Smite 2. Three divisions. One throne. The season is live — follow every match, every roster, every moment.
          </p>

          {/* CTAs — styled like lab utility buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/standings"
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-6 py-2.5 text-sm font-black uppercase text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300/20 active:translate-y-0.5 active:scale-95"
            >
              View Standings
            </Link>
            <Link
              href="/schedule"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-black uppercase text-slate-300 transition hover:bg-white/[0.08] active:translate-y-0.5 active:scale-95"
            >
              Schedule
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-black uppercase text-slate-300 transition hover:bg-white/[0.08] active:translate-y-0.5 active:scale-95"
            >
              Teams
            </Link>
            <a
              href="#discord"
              className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-6 py-2.5 text-sm font-black uppercase text-fuchsia-100 transition hover:bg-fuchsia-300/15 active:translate-y-0.5 active:scale-95"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
