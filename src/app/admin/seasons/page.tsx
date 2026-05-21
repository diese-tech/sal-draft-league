import { requireAdmin } from "@/lib/admin-auth";
import { getAllSeasons } from "@/lib/league-data";
import { AdminSeasonsClient } from "@/components/admin/AdminSeasonsClient";
import { redirect } from "next/navigation";

export const metadata = { title: "Manage Seasons - SAL Admin" };

export default async function AdminSeasonsPage() {
  const session = await requireAdmin();
  if (session.role !== "super_admin") redirect("/admin");

  const seasons = await getAllSeasons();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin · Superadmin</p>
        <h1 className="text-2xl font-black text-white">Seasons</h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Create and manage league seasons. Use "Advance Week" to increment the current week counter.
        </p>
      </div>
      <AdminSeasonsClient seasons={seasons} />
    </main>
  );
}
