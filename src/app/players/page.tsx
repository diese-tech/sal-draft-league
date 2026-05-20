import { getLeagueData } from "@/lib/league-data";
import { PlayersPageClient } from "@/components/league/PlayersPageClient";

export const revalidate = 30;
export const metadata = { title: "Players — SAL" };

export default async function PlayersPage() {
  const data = await getLeagueData();
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Season 1</p>
        <h1 className="text-2xl font-black text-white">Players</h1>
      </div>
      <PlayersPageClient data={data} />
    </main>
  );
}
