"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthButton() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setUser(null);
      return;
    }
    const sb = getSupabaseBrowserClient();
    sb.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await fetch("/api/auth/signout", { method: "POST" });
    router.refresh();
  }

  if (user === undefined) return null; // loading — render nothing

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="hidden shrink-0 rounded-xl border border-indigo-400/35 bg-indigo-400/10 px-3 py-1.5 text-xs font-black uppercase text-indigo-200 transition hover:bg-indigo-400/20 sm:block"
      >
        Sign In
      </Link>
    );
  }

  const initials = (user.user_metadata?.user_name as string | undefined)
    ?.slice(0, 2)
    .toUpperCase() ?? "??";

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/40 text-[0.55rem] font-black text-indigo-200">
          {initials}
        </span>
        {(user.user_metadata?.user_name as string | undefined) ?? "Player"}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-2xl backdrop-blur">
          <Link
            href="/register"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            My Registration
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-500 transition hover:bg-white/[0.06] hover:text-red-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
