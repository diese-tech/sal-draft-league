import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminRequestSession } from "@/lib/admin-auth";
import { buildDraftState, getDraftPicks, undoLastPick } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const state = await buildDraftState(id);
  if (!state) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (state.room.status !== "active") {
    return NextResponse.json({ error: "Draft is not active." }, { status: 400 });
  }
  if (state.room.currentPickIndex === 0 || state.picks.length === 0) {
    return NextResponse.json({ error: "No picks to undo." }, { status: 400 });
  }

  // Capture last pick details for the audit log
  const picks = await getDraftPicks(id);
  const lastPick = picks[picks.length - 1];

  try {
    await undoLastPick(id);

    const session = getAdminRequestSession(request);
    await writeAuditLog("draft_pick_undone", "draft_pick", `${id}-${lastPick?.pickNumber ?? "?"}`, {
      draftRoomId: id,
      undonePickNumber: lastPick?.pickNumber,
      undonePlayerId: lastPick?.playerId,
      undoneOrgId: lastPick?.orgId,
      adminDiscordId: session?.discordId,
    });

    const updatedState = await buildDraftState(id);
    return NextResponse.json({ ok: true, state: updatedState });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to undo pick.";
    console.error("POST /api/admin/draft/[id]/undo:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
