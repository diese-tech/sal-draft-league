"use client";

import { usePathname } from "next/navigation";
import { SiteNav } from "./SiteNav";

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSiteNav = pathname.startsWith("/admin") || pathname.startsWith("/lab");

  return (
    <>
      {!hideSiteNav && <SiteNav />}
      <div className={!hideSiteNav ? "pt-16" : undefined}>{children}</div>
    </>
  );
}
