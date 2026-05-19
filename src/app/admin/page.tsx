import { AdminStatCard } from "@/components/league/AdminStatCard";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuditLog, getLeagueData } from "@/lib/league-data";
import Link from "next/link";

export const metadata = { title: "Admin - SAL" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [{ orgs, players, matches, standings, season }, auditLog] = await Promise.all([
    getLeagueData(),
    getAuditLog(30),
  ]);

  const totalPlayers = players.length;
  const scheduledMatches = matches.filter((m) => m.status === "scheduled").length;
  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const liveMatches = matches.filter((m) => m.status === "live").length;

  const divisionBreakdown = ["solar", "lunar", "gaia"].map((id) => ({
    id,
    orgs: orgs.filter((o) => o.divisionId === id).length,
    players: players.filter((p) => p.divisionId === id).length,
    topOrg: (() => {
      const divStandings = standings.filter((s) => s.divisionId === id).sort((a, b) => b.wins - a.wins);
      if (!divStandings[0]) return "—";
      return orgs.find((o) => o.id === divStandings[0].orgId)?.name ?? "—";
    })(),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/84 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="p-5">
          <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
          <h1 className="text-2xl font-black text-white">League Control</h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            {season.name} · Week {season.currentWeek} · Status: <span className="text-emerald-300">{season.status}</span>
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Total Orgs" value={orgs.length} accent="cyan" />
        <AdminStatCard label="Total Players" value={totalPlayers} accent="violet" />
        <AdminStatCard label="Completed Matches" value={completedMatches} accent="emerald" />
        <AdminStatCard label="Scheduled Matches" value={scheduledMatches} sub={liveMatches > 0 ? `${liveMatches} live now` : undefined} accent="orange" />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { href: "/admin/matches", title: "Edit Schedule", body: "Create matches, change dates, set live status, and enter scores." },
          { href: "/admin/players", title: "Edit Roster", body: "Assign players to orgs and update starter, captain, role, and status." },
          { href: "/admin/standings", title: "Edit Standings", body: "Use completed match scores to recalculate division tables." },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-emerald-300/15 bg-slate-950/72 p-5 shadow-xl shadow-emerald-950/10 transition hover:border-emerald-300/35 hover:bg-white/[0.04]">
            <p className="text-lg font-black text-white">{item.title}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400">{item.body}</p>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300/70">Division Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {divisionBreakdown.map(({ id, orgs: orgCount, players: playerCount, topOrg }) => (
            <div key={id} className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-white/35">{id} Division</p>
              <div className="space-y-2 text-sm">
                <Row label="Orgs" value={orgCount} />
                <Row label="Players" value={playerCount} />
                <Row label="Leader" value={topOrg} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300/70">Activity Feed</h2>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/60">
          {auditLog.length === 0 && (
            <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">No activity recorded yet.</p>
          )}
          {auditLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0">
              <span className="mt-0.5 shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[0.6rem] font-black uppercase text-cyan-200">
                {entry.action.replace(/_/g, " ")}
              </span>
              <div className="min-w-0 flex-1">
                {entry.entityId && <span className="text-xs font-semibold text-white/60">{entry.entityId}</span>}
                <span className="ml-2 text-[0.65rem] text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="truncate text-right font-bold text-white/90">{value}</span>
    </div>
  );
}
