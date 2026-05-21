import { requireAdmin } from "@/lib/admin-auth";
import { getPendingDeletes } from "@/lib/league-data";
import { AdminAuditClient } from "@/components/admin/AdminAuditClient";
import { redirect } from "next/navigation";

export const metadata = { title: "Pending Deletions - SAL Admin" };

export default async function AdminAuditPage() {
  const session = await requireAdmin();
  if (session.role !== "super_admin") redirect("/admin");

  const pending = await getPendingDeletes();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-red-400/70">Admin · Superadmin · Destructive</p>
        <h1 className="text-2xl font-black text-white">Pending Deletions</h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Records queued for hard delete. Confirm to permanently remove from the database, or cancel to restore to archived state.
        </p>
      </div>
      <AdminAuditClient pending={pending} />
    </main>
  );
}
