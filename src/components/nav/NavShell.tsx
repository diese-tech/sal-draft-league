"use client";

import { usePathname } from "next/navigation";
import { SiteNav } from "./SiteNav";

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSiteNav = pathname.startsWith("/admin") || pathname.startsWith("/lab");

  return (
    <>
      {!hideSiteNav && <SiteNav />}
      {/* pt-24 = ticker (32px) + nav (64px) */}
      <div className={!hideSiteNav ? "pt-24" : undefined}>{children}</div>
    </>
  );
}
