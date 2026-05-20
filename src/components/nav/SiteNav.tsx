"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_ASSETS } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/auth/AuthButton";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true, mobileHide: true },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/watch", label: "Watch" },
];

export function SiteNav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-8 z-50 h-16 border-b border-cyan-300/25 bg-[rgba(4,9,26,0.92)] shadow-2xl shadow-cyan-950/30 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/25 shadow-lg shadow-cyan-500/20 transition-all duration-200 group-hover:border-cyan-300/80 group-hover:shadow-cyan-400/35">
            <Image src={BRAND_ASSETS.leagueLogo} alt="" fill sizes="40px" className="object-cover" priority />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black uppercase text-cyan-200">Serpent Ascension League</p>
            <p className="text-[0.6rem] font-black uppercase text-slate-500">Season 1 · Active</p>
          </div>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto px-2">
          {NAV_LINKS.map(({ href, label, exact, mobileHide }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                  mobileHide && "hidden sm:block",
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
        </div>
      </div>
    </header>
  );
}
