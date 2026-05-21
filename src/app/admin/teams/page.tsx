import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLeagueData } from "@/lib/league-data";
import { AdminTeamsClient } from "@/components/admin/AdminTeamsClient";

export const metadata = { title: "Manage Teams - SAL Admin" };

export default async function AdminTeamsPage() {
  const session = await requireAdmin();
  const data = await getAdminLeagueData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Teams</h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Create and edit team profiles. Roster assignment is handled from the Roster screen.
        </p>
      </div>
      <AdminTeamsClient data={data} isSuperAdmin={session.role === "super_admin"} />
    </main>
  );
}
