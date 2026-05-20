import { requireAdmin } from "@/lib/admin-auth";
import { getLeagueData } from "@/lib/league-data";
import { AdminAnnouncementsClient } from "@/components/admin/AdminAnnouncementsClient";

export const metadata = { title: "Announcements - SAL Admin" };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const { announcements } = await getLeagueData();
  return <AdminAnnouncementsClient announcements={announcements} />;
}
