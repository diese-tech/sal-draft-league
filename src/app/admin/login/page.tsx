import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Login — SAL" };

const ERROR_MESSAGES: Record<string, string> = {
  no_access:
    "You don't have access to this area. If you think this is a mistake, reach out to the league commissioner or bot admin.",
  config: "Discord OAuth is not configured. Contact the site administrator.",
  invalid_state: "Authentication failed. Please try again.",
  token_exchange: "Authentication failed. Please try again.",
  user_fetch: "Authentication failed. Please try again.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errorKey = typeof sp.error === "string" ? sp.error : null;
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? "Authentication failed. Please try again.") : null;
  const oauthConfigured = Boolean(process.env.DISCORD_ADMIN_CLIENT_ID);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Link
        href="/"
        className="absolute left-4 top-12 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200 sm:left-6"
      >
        ← Back to Site
      </Link>

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/88 shadow-2xl shadow-cyan-950/25 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-black uppercase text-emerald-200">SAL Admin</p>
            <h1 className="mt-2 text-2xl font-black text-white">League Control</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Sign in with your Discord account to access league management.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-orange-300/30 bg-orange-300/10 px-4 py-3">
              <p className="text-sm font-semibold text-orange-200">{errorMessage}</p>
            </div>
          )}

          {oauthConfigured ? (
            <a
              href="/api/admin/discord/authorize"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-indigo-400/40 bg-indigo-400/15 px-4 py-3 text-sm font-black uppercase text-indigo-100 transition hover:bg-indigo-400/25 active:translate-y-0.5 active:scale-[0.98]"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.053a19.906 19.906 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.97 13.97 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Sign in with Discord
            </a>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-sm text-slate-500">Discord OAuth is not configured.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
