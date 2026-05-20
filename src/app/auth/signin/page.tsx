import { redirect } from "next/navigation";
import { SignInClient } from "@/components/auth/SignInClient";
import { getAuthUser } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign In — SAL" };

export default async function SignInPage() {
  const user = await getAuthUser();
  if (user) redirect("/register");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">
            Serpent Ascension League
          </p>
          <h1 className="text-2xl font-black text-white">Player Sign In</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with Discord to register for the draft or claim your player profile.
          </p>
        </div>
        <SignInClient />
      </div>
    </main>
  );
}
