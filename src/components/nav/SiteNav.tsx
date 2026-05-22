"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { BRAND_ASSETS } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/auth/AuthButton";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/gods", label: "Gods" },
  { href: "/watch", label: "Watch" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-8 z-50 h-16 border-b border-cyan-300/25 bg-[rgba(4,9,26,0.92)] shadow-2xl shadow-cyan-950/30 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/25 shadow-lg shadow-cyan-500/20 transition-all duration-200 group-hover:border-cyan-300/80 group-hover:shadow-cyan-400/35">
              <Image src={BRAND_ASSETS.leagueLogo} alt="" fill sizes="40px" className="object-cover" priority />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-black uppercase text-cyan-200">Serpent Ascension League</p>
              <p className="text-[0.6rem] font-black uppercase text-slate-500">Season 1 · Active</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 sm:flex">
            {NAV_LINKS.filter((l) => !l.exact).map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                    active
                      ? "border-cyan-300/55 bg-cyan-300/22 text-cyan-100"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <AuthButton />
            <Link
              href="/admin"
              className={cn(
                "hidden shrink-0 rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition sm:block",
                pathname.startsWith("/admin")
                  ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300",
              )}
            >
              Admin
            </Link>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] sm:hidden"
            >
              {menuOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-24 z-40 border-b border-white/10 bg-[rgba(4,9,26,0.97)] px-4 py-3 shadow-2xl backdrop-blur-md sm:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-black uppercase transition",
                    active
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/admin"
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-black uppercase transition",
                pathname.startsWith("/admin")
                  ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
