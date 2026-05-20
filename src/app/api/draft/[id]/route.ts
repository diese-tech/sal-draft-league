import { NextRequest, NextResponse } from "next/server";
import { buildDraftState, updateDraftRoom } from "@/lib/draft-data";
import { buildPickSequence } from "@/types/draft";
import { getCaptainSessionFromRequest } from "@/lib/captain-auth";
import { writeAuditLog } from "@/lib/league-data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await buildDraftState(id);
  if (!state) return NextResponse.json({ error: "Draft not found." }, { status: 404 });

  if (state.room.status === "active" && state.room.pickStartedAt && state.room.pickTimerSeconds > 0) {
    const elapsed = (Date.now() - new Date(state.room.pickStartedAt).getTime()) / 1000;
    if (elapsed >= state.room.pickTimerSeconds) {
      // Timer expired — auto-advance the pick
      const sequence = buildPickSequence(state.room.baseOrder, state.room.rounds);
      const nextIndex = state.room.currentPickIndex + 1;
      const isComplete = nextIndex >= sequence.length;
      const now = new Date().toISOString();
      await updateDraftRoom(id, {
        currentPickIndex: nextIndex,
        status: isComplete ? "complete" : "active",
        pickStartedAt: isComplete ? null : now,
        completedAt: isComplete ? now : null,
      });
      // Also log to audit
      await writeAuditLog("draft_auto_skip", "draft_room", id, {
        draftRoomId: id,
        skippedPickIndex: state.room.currentPickIndex,
        reason: "timer_expired",
      });
      // Re-fetch updated state
      const updatedState = await buildDraftState(id);
      const session = getCaptainSessionFromRequest(request);
      const isCaptain = session?.draftRoomId === id;
      const captainOrgId = isCaptain ? session?.orgId : null;
      return NextResponse.json({ state: updatedState, captainOrgId });
    }
  }

  // Include whether the requester is a captain for this draft
  const session = getCaptainSessionFromRequest(request);
  const isCaptain = session?.draftRoomId === id;
  const captainOrgId = isCaptain ? session?.orgId : null;

  return NextResponse.json({ state, captainOrgId });
}
