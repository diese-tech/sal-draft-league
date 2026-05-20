"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_ASSETS } from "@/lib/assets";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/watch", label: "Watch" },
];

export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-8 z-50 h-16 border-b border-cyan-300/10 bg-slate-950/88 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-cyan-500/40 bg-black shadow-lg shadow-cyan-950/40 transition-all duration-200 group-hover:border-cyan-400/60 group-hover:shadow-cyan-500/20">
            <Image src={BRAND_ASSETS.leagueLogo} alt="" fill sizes="40px" className="object-cover" priority />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black uppercase text-cyan-200">Serpent Ascension League</p>
            <p className="text-[0.6rem] font-black uppercase text-slate-500">Season 1 · Active</p>
          </div>
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
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

        <Link
          href="/admin"
          className={cn(
            "hidden rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition sm:block",
            pathname.startsWith("/admin")
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
              : "border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300",
          )}
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
