import { AnnouncementCard } from "@/components/league/AnnouncementCard";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

export const metadata = { title: "Announcements — SAL Admin" };

export default function AdminAnnouncementsPage() {
  const { announcements } = MOCK_LEAGUE_DATA;

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/35">Admin</p>
          <h1 className="text-2xl font-black text-white">Announcements</h1>
          <p className="mt-1 text-sm text-white/40">{announcements.length} active announcements</p>
        </div>
        {/* TODO: wire to backend */}
        <button className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 opacity-50 cursor-not-allowed" disabled>
          + New Announcement
        </button>
      </div>

      <div className="space-y-4 mb-8">
        {announcements
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
          .map((a) => (
            <div key={a.id} className="relative">
              <AnnouncementCard announcement={a} />
              {/* Edit/delete controls overlay */}
              <div className="absolute right-3 bottom-3 flex gap-1">
                {/* TODO: wire to backend */}
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-white/25 hover:text-white/55 transition-colors" disabled>Edit</button>
                <button className="rounded px-2 py-1 text-[0.65rem] font-semibold text-red-400/25 hover:text-red-400/55 transition-colors" disabled>Delete</button>
              </div>
            </div>
          ))}
      </div>

      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-xs font-semibold text-orange-300/80">
          {/* TODO: wire to backend */}
          Announcement creation, editing, and deletion require backend integration.
        </p>
      </div>
    </main>
  );
}
