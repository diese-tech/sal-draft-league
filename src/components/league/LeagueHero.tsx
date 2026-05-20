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
        {/* Bottom fade — video dissolves into body background at hero end */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#050912]" />

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
            {/* Main title — solid white + single solar accent; video is the color */}
            <h1 className="mb-2 font-display text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Serpent{" "}
              <span className="italic text-orange-400">Ascension</span>
            </h1>
            <p className="mb-10 font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              League · {season.name}
            </p>

            {/* CTAs — one primary action, three ghost links */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={liveMatchName ? "/watch" : "/standings"}
                className="sal-button sal-btn-ember inline-flex items-center gap-2 rounded-[var(--sal-button-radius)] px-6 py-2.5 text-sm font-bold"
              >
                {liveMatchName ? "▶ Watch Live" : "View Standings"}
              </Link>
              <div className="flex items-center gap-5">
                <Link href="/schedule" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Schedule
                </Link>
                <Link href="/teams" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Teams
                </Link>
                <a href="#discord" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Discord
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
