import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isAdminRequest, getAdminRequestSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { saveMatch, recalculateAndPersistStandings, writeAuditLog, getAdminLeagueData } from "@/lib/league-data";

const playerStatSchema = z.object({
  playerIgn: z.string().min(1),
  playerId: z.string().optional(),
  orgId: z.string().optional(),
  side: z.enum(["home", "away"]),
  won: z.boolean(),
  kills: z.number().int().min(0),
  deaths: z.number().int().min(0),
  assists: z.number().int().min(0),
  godPlayed: z.string().optional(),
  role: z.string().optional(),
  damageDealt: z.number().int().min(0).optional(),
  damageMitigated: z.number().int().min(0).optional(),
});

const gameSchema = z.object({
  gameNumber: z.number().int().min(1),
  winningSide: z.enum(["home", "away"]),
  players: z.array(playerStatSchema),
});

const submitSchema = z.object({
  games: z.array(gameSchema).min(1).max(5),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const session = getAdminRequestSession(request);

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const result = submitSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const { games } = result.data;

  // Load report
  const { data: report, error: reportErr } = await supabase
    .from("match_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (reportErr || !report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const r = report as {
    match_id: string;
    season_id: string;
    division_id: string;
    status: string;
  };

  // Calculate scores from game winners
  const homeWins = games.filter((g) => g.winningSide === "home").length;
  const awayWins = games.filter((g) => g.winningSide === "away").length;
  const totalGames = games.length;

  // Load match to update it
  const leagueData = await getAdminLeagueData();
  const match = leagueData.matches.find((m) => m.id === r.match_id);
  if (!match) return NextResponse.json({ error: "Match not found in league data." }, { status: 404 });

  const homeOrg = leagueData.orgs.find((o) => o.id === match.homeOrgId);
  const awayOrg = leagueData.orgs.find((o) => o.id === match.awayOrgId);

  try {
    // Insert player_match_stats
    const statsRows = games.flatMap((game) =>
      game.players.map((p) => {
        const orgId = p.side === "home" ? match.homeOrgId : match.awayOrgId;
        return {
          match_report_id: id,
          match_id: r.match_id,
          player_id: p.playerId ?? null,
          player_ign: p.playerIgn,
          game_number: game.gameNumber,
          org_id: orgId,
          won: p.won,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          god_played: p.godPlayed ?? null,
          role: p.role ?? null,
          damage_dealt: p.damageDealt ?? null,
          damage_mitigated: p.damageMitigated ?? null,
          season_id: r.season_id,
          division_id: r.division_id,
        };
      }),
    );

    if (statsRows.length > 0) {
      // Delete existing stats for this report (in case of re-submission)
      await supabase.from("player_match_stats").delete().eq("match_report_id", id);
      const { error: statsErr } = await supabase.from("player_match_stats").insert(statsRows);
      if (statsErr) throw statsErr;
    }

    // Update match to completed with scores
    const updatedMatch = {
      ...match,
      status: "completed" as const,
      homeScore: homeWins,
      awayScore: awayWins,
    };
    await saveMatch(updatedMatch);

    // Update report to done
    const now = new Date().toISOString();
    await supabase
      .from("match_reports")
      .update({
        status: "done",
        home_score: homeWins,
        away_score: awayWins,
        total_games: totalGames,
        reviewed_at: now,
        reviewed_by: session?.discordId ?? "admin",
      })
      .eq("id", id);

    await writeAuditLog("match_report_submitted", "match_report", id, {
      matchId: r.match_id,
      homeOrg: homeOrg?.name,
      awayOrg: awayOrg?.name,
      homeScore: homeWins,
      awayScore: awayWins,
      totalGames,
      playerCount: statsRows.length,
    });

    revalidateTag("league-data", {});

    return NextResponse.json({ ok: true, homeScore: homeWins, awayScore: awayWins, totalGames });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed.";
    console.error("match-report submit error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
