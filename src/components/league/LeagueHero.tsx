import type { Season } from "@/types/league";
import Link from "next/link";
import { HeroVideoLoop } from "./HeroVideoLoop";

// Drop clip URLs here as they become available.
// Poster image (/assets/hero-poster.jpg) shows until the first clip loads.
const HERO_CLIPS: string[] = [
  "https://pub-b669f1a9eb0f4e0da6e4159b0152d6c2.r2.dev/inspectorcody%20penta.mp4",
  "https://pub-b669f1a9eb0f4e0da6e4159b0152d6c2.r2.dev/tes%20quadra.mp4",
];

export function LeagueHero({ season, liveMatchName }: { season: Season; liveMatchName?: string }) {
  return (
    <>
      {/* Fixed full-viewport video — stays pinned as the page scrolls */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <HeroVideoLoop
          clips={HERO_CLIPS}
          poster="/assets/hero-poster.jpg"
          className="h-full w-full object-cover opacity-35"
        />
        {/* Left-to-right gradient so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/30" />
      </div>

      <section className="relative min-h-[88vh]">
        {/* Radial atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-[40rem] w-[40rem] translate-x-1/4 rounded-full bg-cyan-500/[0.16] blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-80 w-80 translate-x-1/2 rounded-full bg-orange-500/[0.12] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-fuchsia-600/[0.10] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24">
          {/* Live match banner — left-aligned pill */}
          {liveMatchName && (
            <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
              </span>
              <span className="text-xs font-black uppercase text-orange-200">Live —</span>
              <span className="text-xs font-semibold text-white">{liveMatchName}</span>
            </div>
          )}

          {/* Identity — left-anchored, max half-width */}
          <div className="flex max-w-xl flex-col">
            {/* Main title */}
            <h1 className="mb-2 text-5xl font-black leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Serpent{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                Ascension
              </span>
            </h1>
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
              League · {season.name}
            </p>
            <p className="mb-10 max-w-sm text-base font-semibold leading-relaxed text-slate-400">
              Competitive Smite 2. Three divisions. One throne. Every play, every rivalry, every moment — on the record and in the spotlight.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2">
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
    </>
  );
}
