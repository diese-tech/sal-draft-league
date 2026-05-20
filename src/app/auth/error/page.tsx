import Link from "next/link";

export const metadata = { title: "Auth Error — SAL" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 grid h-16 w-16 mx-auto place-items-center rounded-2xl border border-red-300/30 bg-red-300/10">
          <span className="text-2xl font-black text-red-300">!</span>
        </div>
        <h1 className="mb-2 text-xl font-black text-white">Sign-in failed</h1>
        <p className="mb-6 text-sm text-slate-400">
          {message ? decodeURIComponent(message) : "An unexpected error occurred."}
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-5 py-2.5 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/22"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
