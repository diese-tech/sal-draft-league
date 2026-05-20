import { requireAdmin } from "@/lib/admin-auth";
import { getRegistrations, getLeagueData } from "@/lib/league-data";
import { AdminRegistrationsClient } from "@/components/admin/AdminRegistrationsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registrations — SAL Admin" };

export default async function AdminRegistrationsPage() {
  await requireAdmin();
  const [registrations, { players, orgs }] = await Promise.all([
    getRegistrations(),
    getLeagueData(),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Registrations</h1>
      </div>
      <AdminRegistrationsClient registrations={registrations} players={players} orgs={orgs} />
    </div>
  );
}
