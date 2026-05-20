"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Invalid admin password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Link href="/" className="absolute left-4 top-12 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200 sm:left-6">
        ← Back to Site
      </Link>
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/88 shadow-2xl shadow-cyan-950/25 backdrop-blur"
      >
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-black uppercase text-emerald-200">SAL Admin</p>
            <h1 className="mt-2 text-2xl font-black text-white">League control login</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Enter the admin password to edit schedule, rosters, and score-driven standings.
            </p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-slate-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10"
              autoComplete="current-password"
            />
          </label>
          {message && <p className="text-sm font-semibold text-orange-200">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl border border-emerald-300/35 bg-emerald-300/15 px-4 py-3 text-sm font-black uppercase text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Checking..." : "Enter admin"}
          </button>
        </div>
      </form>
    </main>
  );
}
