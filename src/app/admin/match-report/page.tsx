import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLeagueData } from "@/lib/league-data";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { MatchReportClient } from "@/components/admin/MatchReportClient";
import type { MatchReportWithMatch } from "@/types/match-report";
import type { DivisionId } from "@/types/league";

export const metadata = { title: "Match Report - SAL Admin" };

async function getReports(): Promise<MatchReportWithMatch[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const [{ data: rows }, leagueData] = await Promise.all([
    supabase.from("match_reports").select("*").order("created_at", { ascending: false }),
    getAdminLeagueData(),
  ]);

  const orgMap = new Map(leagueData.orgs.map((o) => [o.id, o]));
  const matchMap = new Map(leagueData.matches.map((m) => [m.id, m]));

  return (rows ?? []).map((row) => {
    const match = matchMap.get(row.match_id as string);
    const homeOrg = orgMap.get(match?.homeOrgId ?? "");
    const awayOrg = orgMap.get(match?.awayOrgId ?? "");
    return {
      id: row.id as string,
      matchId: row.match_id as string,
      seasonId: row.season_id as string,
      divisionId: row.division_id as DivisionId,
      status: row.status as MatchReportWithMatch["status"],
      submittedBy: row.submitted_by as string,
      homeScore: row.home_score as number | undefined,
      awayScore: row.away_score as number | undefined,
      totalGames: row.total_games as number | undefined,
      screenshotUrls: (row.screenshot_urls as string[]) ?? [],
      createdAt: row.created_at as string,
      reviewedAt: row.reviewed_at as string | undefined,
      reviewedBy: row.reviewed_by as string | undefined,
      homeOrgId: match?.homeOrgId ?? "",
      homeOrgName: homeOrg?.name ?? "",
      homeOrgTag: homeOrg?.tag ?? "",
      awayOrgId: match?.awayOrgId ?? "",
      awayOrgName: awayOrg?.name ?? "",
      awayOrgTag: awayOrg?.tag ?? "",
      matchDate: match?.scheduledDate ?? "",
      week: match?.week ?? 0,
    };
  });
}

export default async function MatchReportPage() {
  await requireAdmin();
  const [data, reports] = await Promise.all([getAdminLeagueData(), getReports()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Match Report</h1>
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Upload SMITE DETAILS screenshots → AI extracts stats → review → submit result
        </p>
      </div>
      <MatchReportClient data={data} initialReports={reports} />
    </main>
  );
}
