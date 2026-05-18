"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
];

export function SiteNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-slate-950/84 shadow-2xl shadow-black/35 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Wordmark */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 via-transparent to-fuchsia-600/20 text-[0.65rem] font-black text-cyan-200 shadow-lg shadow-cyan-950/40 transition-all duration-200 group-hover:border-cyan-400/60 group-hover:shadow-cyan-500/20">
            SAL
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black uppercase text-cyan-200">Serpent Ascension League</p>
            <p className="text-[0.6rem] font-black uppercase text-slate-500">Season 1 · Active</p>
          </div>
        </Link>

        {/* Primary nav */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                  active
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Admin link */}
        <Link
          href="/admin"
          className={cn(
            "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
            pathname.startsWith("/admin")
              ? "border-orange-300/40 bg-orange-300/15 text-orange-100"
              : "border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300",
          )}
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
