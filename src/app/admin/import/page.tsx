import { requireAdmin } from "@/lib/admin-auth";
import { AdminImportClient } from "@/components/admin/AdminImportClient";

export const metadata = { title: "Player Import - SAL Admin" };

export default async function AdminImportPage() {
  await requireAdmin();
  return <AdminImportClient />;
}
