"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/standings", label: "Standings" },
  { href: "/admin/announcements", label: "Announcements" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-56 border-r border-white/8 bg-[#05070d]/95 backdrop-blur">
        {/* Admin top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4">
          <div className="grid h-7 w-7 place-items-center rounded-md border border-orange-500/40 bg-orange-500/10 text-[0.6rem] font-black text-orange-300">
            ADM
          </div>
          <span className="text-sm font-bold text-white/80">SAL Admin</span>
        </div>

        {/* Nav links */}
        <nav className="p-3 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive(href, exact)
                  ? "bg-white/8 text-white"
                  : "text-white/45 hover:bg-white/4 hover:text-white/75",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Back to league */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/8 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/30 transition-colors hover:text-white/60"
          >
            ← Back to League
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-56 flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
