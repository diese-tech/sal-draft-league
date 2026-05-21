"use client";

import { usePathname } from "next/navigation";
import { SiteNav } from "./SiteNav";

export function NavShell({ children, ticker }: { children: React.ReactNode; ticker: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith("/admin") || pathname.startsWith("/lab");

  return (
    <>
      {!hideChrome && ticker}
      {!hideChrome && <SiteNav />}
      {/* pt-[104px] = ticker (40px) + nav (64px) */}
      <div className={!hideChrome ? "pt-[104px]" : undefined}>{children}</div>
      {!hideChrome && (
        <footer className="border-t border-white/10 mt-16 py-6 px-4 text-center text-xs text-white/40 leading-relaxed">
          The Serpent Ascension League is an independent community tournament and is not affiliated with, endorsed by, or
          officially supported by Hi-Rez Studios, Inc. SMITE 2® is a registered trademark of Hi-Rez Studios, Inc. This
          tournament operates under the Hi-Rez Community Tournament License.
        </footer>
      )}
    </>
  );
}
