import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDraftState, getDraftPicks, recordPick, removePlayerFromAllShortlists, updateDraftRoom } from "@/lib/draft-data";
import { getCaptainSessionFromRequest } from "@/lib/captain-auth";
import { buildPickSequence } from "@/types/draft";
import { getLeagueData, writeAuditLog } from "@/lib/league-data";

const DIVISION_TIER: Record<string, number> = { solar: 1, lunar: 2, gaia: 3 };

const pickSchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Verify captain session
  const session = getCaptainSessionFromRequest(request);
  if (!session || session.draftRoomId !== id) {
    return NextResponse.json({ error: "Captain session required for this draft." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = pickSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
  const { playerId } = result.data;

  const state = await buildDraftState(id);
  if (!state) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const { room } = state;

  if (room.status !== "active") {
    return NextResponse.json({ error: `Draft is ${room.status}, picks are not allowed.` }, { status: 400 });
  }

  const sequence = buildPickSequence(room.baseOrder, room.rounds);
  const expectedOrgId = sequence[room.currentPickIndex];
  if (session.orgId !== expectedOrgId) {
    return NextResponse.json({ error: "It is not your turn to pick." }, { status: 403 });
  }

  // Division eligibility: captain cannot draft from a higher-tier division
  const roomTier = DIVISION_TIER[room.divisionId] ?? 999;
  const leagueData = await getLeagueData();
  const playerData = leagueData.players.find((p) => p.id === playerId);
  if (playerData?.divisionId) {
    const playerTier = DIVISION_TIER[playerData.divisionId] ?? 999;
    if (playerTier < roomTier) {
      return NextResponse.json(
        { error: `Cannot draft a ${playerData.divisionId} division player in a ${room.divisionId} draft.` },
        { status: 400 },
      );
    }
  }

  // Verify player hasn't already been picked
  const existingPicks = await getDraftPicks(id);
  if (existingPicks.some((p) => p.playerId === playerId)) {
    return NextResponse.json({ error: "Player has already been drafted." }, { status: 400 });
  }

  const pickNumber = room.currentPickIndex + 1;
  await recordPick(id, pickNumber, session.orgId, playerId);
  await removePlayerFromAllShortlists(id, playerId);

  const nextIndex = room.currentPickIndex + 1;
  const isComplete = nextIndex >= sequence.length;
  const now = new Date().toISOString();
  await updateDraftRoom(id, {
    currentPickIndex: nextIndex,
    status: isComplete ? "complete" : "active",
    pickStartedAt: isComplete ? null : now,
    completedAt: isComplete ? now : null,
  });

  await writeAuditLog("draft_pick", "draft_pick", `${id}-${pickNumber}`, {
    draftRoomId: id,
    pickNumber,
    orgId: session.orgId,
    playerId,
    isComplete,
  });

  return NextResponse.json({ ok: true, pickNumber, complete: isComplete });
}
