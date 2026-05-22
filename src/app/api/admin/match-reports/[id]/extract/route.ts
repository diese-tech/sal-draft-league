import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getAdminLeagueData } from "@/lib/league-data";
import type { ExtractedGame } from "@/types/match-report";

const SMITE_ROLES = ["Solo", "Jungle", "Mid", "Carry", "Support"] as const;

// Best-value vision model on OpenRouter for scoreboard OCR.
// Override via OPENROUTER_MODEL env var if needed.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";

const EXTRACTION_PROMPT = (
  homeOrgName: string,
  homeIgns: string[],
  awayOrgName: string,
  awayIgns: string[],
) => `
You are analyzing a SMITE 2 end-of-match DETAILS tab screenshot. Extract the scoreboard data.

Home team: ${homeOrgName}
Known home players: ${homeIgns.length > 0 ? homeIgns.join(", ") : "(unknown roster)"}

Away team: ${awayOrgName}
Known away players: ${awayIgns.length > 0 ? awayIgns.join(", ") : "(unknown roster)"}

Return ONLY valid JSON in this exact format, no other text:
{
  "winner": "home" | "away" | "unknown",
  "players": [
    {
      "ign": "string",
      "side": "home" | "away",
      "god": "string or null",
      "role": "Solo" | "Jungle" | "Mid" | "Carry" | "Support" | null,
      "kills": number,
      "deaths": number,
      "assists": number,
      "damageDealt": number or null,
      "damageMitigated": number or null
    }
  ]
}

Instructions:
- Match each player to home or away using the known rosters above
- If a player is not in either roster, assign based on which column they appear in (left vs right)
- Extract kills, deaths, assists exactly as shown (integers)
- Extract damage numbers without commas (integers)
- "winner" is "home" if the home team won, "away" if away team won
- Look for VICTORY/DEFEAT text or trophy icons to determine winner
- Include all 10 players (5 per side) if visible
`.trim();

interface OpenRouterMessage {
  role: "user" | "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
}

async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://sal.gg",
      "X-Title": "SAL Match Report",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error) throw new Error(data.error.message ?? "OpenRouter API error");
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI extraction not configured (OPENROUTER_API_KEY missing).", aiUnavailable: true },
      { status: 503 },
    );
  }

  // Load report + match context
  const { data: report, error: reportErr } = await supabase
    .from("match_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (reportErr || !report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const r = report as { screenshot_urls: string[]; match_id: string };
  if (!r.screenshot_urls?.length) return NextResponse.json({ error: "No screenshots uploaded yet." }, { status: 400 });

  // Mark as extracting
  await supabase.from("match_reports").update({ status: "extracting" }).eq("id", id);

  try {
    const leagueData = await getAdminLeagueData();
    const match = leagueData.matches.find((m) => m.id === r.match_id);
    const homeOrg = leagueData.orgs.find((o) => o.id === match?.homeOrgId);
    const awayOrg = leagueData.orgs.find((o) => o.id === match?.awayOrgId);
    const homePlayers = leagueData.players.filter((p) => p.orgId === match?.homeOrgId).map((p) => p.ign);
    const awayPlayers = leagueData.players.filter((p) => p.orgId === match?.awayOrgId).map((p) => p.ign);

    const games: ExtractedGame[] = [];

    for (let i = 0; i < r.screenshot_urls.length; i++) {
      const url = r.screenshot_urls[i];

      // Fetch screenshot and convert to base64 data URL
      let dataUrl: string;
      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
        const mimeType = ct.includes("png") ? "image/png" : ct.includes("webp") ? "image/webp" : "image/jpeg";
        dataUrl = `data:${mimeType};base64,${base64}`;
      } catch (err) {
        console.error(`Failed to fetch screenshot ${i + 1}:`, err);
        games.push({ gameNumber: i + 1, winningSide: "unknown", players: [] });
        continue;
      }

      try {
        const text = await callOpenRouter([
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text: EXTRACTION_PROMPT(
                  homeOrg?.name ?? "Home Team",
                  homePlayers,
                  awayOrg?.name ?? "Away Team",
                  awayPlayers,
                ),
              },
            ],
          },
        ]);

        // Strip markdown code fences if present
        const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(jsonText) as {
          winner?: string;
          players?: Array<{
            ign?: string;
            side?: string;
            god?: string | null;
            role?: string | null;
            kills?: number;
            deaths?: number;
            assists?: number;
            damageDealt?: number | null;
            damageMitigated?: number | null;
          }>;
        };

        games.push({
          gameNumber: i + 1,
          winningSide: parsed.winner === "home" ? "home" : parsed.winner === "away" ? "away" : "unknown",
          players: (parsed.players ?? []).map((p) => ({
            ign: p.ign ?? "",
            side: p.side === "away" ? "away" : "home",
            god: p.god ?? undefined,
            role: SMITE_ROLES.includes(p.role as (typeof SMITE_ROLES)[number]) ? (p.role as string) : undefined,
            kills: Number(p.kills ?? 0),
            deaths: Number(p.deaths ?? 0),
            assists: Number(p.assists ?? 0),
            damageDealt: p.damageDealt != null ? Number(p.damageDealt) : undefined,
            damageMitigated: p.damageMitigated != null ? Number(p.damageMitigated) : undefined,
          })),
        });
      } catch (err) {
        console.error(`AI extraction failed for game ${i + 1}:`, err);
        games.push({ gameNumber: i + 1, winningSide: "unknown", players: [] });
      }
    }

    // Store extracted data and mark as review
    await supabase
      .from("match_reports")
      .update({ status: "review", extracted_data: games })
      .eq("id", id);

    return NextResponse.json({ games });
  } catch (err) {
    // Reset to pending on failure so admin can retry
    await supabase.from("match_reports").update({ status: "pending" }).eq("id", id);
    const message = err instanceof Error ? err.message : "Extraction failed.";
    console.error("extract route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
