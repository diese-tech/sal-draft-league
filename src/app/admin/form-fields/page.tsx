import { requireAdmin } from "@/lib/admin-auth";
import { getFormFields } from "@/lib/league-data";
import { AdminFormFieldsClient } from "@/components/admin/AdminFormFieldsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Form Fields — SAL Admin" };

export default async function AdminFormFieldsPage() {
  await requireAdmin();
  const fields = await getFormFields();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Registration Form Fields</h1>
        <p className="mt-1 text-sm text-slate-500">
          Locked fields are part of the base form and cannot be deleted. You can hide them or add custom fields.
        </p>
      </div>
      <AdminFormFieldsClient fields={fields} />
    </div>
  );
}
