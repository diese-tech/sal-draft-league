import { SchedulePageClient } from "@/components/league/SchedulePageClient";
import { getLeagueData } from "@/lib/league-data";

export const revalidate = 30;

export default async function SchedulePage() {
  const data = await getLeagueData();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/84 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />
        <div className="p-5">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Match Schedule</p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white">{data.season.name} · All Matches</h1>
          <p className="mt-1.5 text-sm font-semibold text-slate-400">
            Filter by division, week, or status. Live matches broadcast on the SAL Twitch channel.
          </p>
        </div>
      </div>
      <SchedulePageClient data={data} />
    </main>
  );
}
