"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/players", label: "Roster" },
  { href: "/admin/matches", label: "Schedule" },
  { href: "/admin/standings", label: "Standings" },
  { href: "/admin/draft", label: "Draft" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/form-fields", label: "Form Fields" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  if (isLogin) return children;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.12),transparent_28rem),radial-gradient(circle_at_80%_8%,rgba(16,185,129,0.12),transparent_28rem),#05070d]">
      <header className="sticky top-0 z-40 border-b border-cyan-300/10 bg-slate-950/90 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300/35 bg-emerald-300/10 text-[0.6rem] font-black text-emerald-100">ADM</div>
            <div>
              <p className="text-sm font-black uppercase text-white">SAL Admin</p>
              <p className="text-[0.6rem] font-black uppercase text-cyan-300/60">Schedule · Roster · Standings</p>
            </div>
          </Link>

          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:ml-6 sm:w-auto">
            {ADMIN_NAV.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-black uppercase transition",
                  isActive(href, exact)
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                    : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-black uppercase text-slate-300 transition hover:border-white/25 hover:bg-white/[0.10] hover:text-white">
              ← Back to Site
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
