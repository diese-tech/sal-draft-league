import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest, getAdminRequestSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getAdminLeagueData } from "@/lib/league-data";
import type { MatchReportWithMatch } from "@/types/match-report";
import type { DivisionId } from "@/types/league";

const createSchema = z.object({
  matchId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ reports: [] });

  const { data, error } = await supabase
    .from("match_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leagueData = await getAdminLeagueData();
  const orgMap = new Map(leagueData.orgs.map((o) => [o.id, o]));
  const matchMap = new Map(leagueData.matches.map((m) => [m.id, m]));

  const reports: MatchReportWithMatch[] = (data ?? []).map((row) => {
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
      homeOrgName: homeOrg?.name ?? match?.homeOrgId ?? "",
      homeOrgTag: homeOrg?.tag ?? "",
      awayOrgId: match?.awayOrgId ?? "",
      awayOrgName: awayOrg?.name ?? match?.awayOrgId ?? "",
      awayOrgTag: awayOrg?.tag ?? "",
      matchDate: match?.scheduledDate ?? "",
      week: match?.week ?? 0,
    };
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const session = getAdminRequestSession(request);

  const body = await request.json().catch(() => null);
  const result = createSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });

  const { matchId } = result.data;

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });

  // Check for existing report
  const { data: existing } = await supabase
    .from("match_reports")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle();
  if (existing) return NextResponse.json({ id: (existing as { id: string }).id, existing: true });

  // Fetch the match to get season/division
  const { data: matchRow, error: matchErr } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (matchErr || !matchRow) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const m = matchRow as { division_id: string; season_id: string };

  const { data: report, error } = await supabase
    .from("match_reports")
    .insert({
      match_id: matchId,
      season_id: m.season_id ?? "",
      division_id: m.division_id,
      status: "pending",
      submitted_by: session?.discordId ?? "admin",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (report as { id: string }).id });
}
