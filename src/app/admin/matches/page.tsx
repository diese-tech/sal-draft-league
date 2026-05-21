import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLeagueData } from "@/lib/league-data";
import { AdminMatchesClient } from "@/components/admin/AdminMatchesClient";

export const metadata = { title: "Manage Schedule - SAL Admin" };

export default async function AdminMatchesPage() {
  const session = await requireAdmin();
  const data = await getAdminLeagueData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Edit Schedule</h1>
      </div>
      <AdminMatchesClient data={data} isSuperAdmin={session.role === "super_admin"} />
    </main>
  );
}
