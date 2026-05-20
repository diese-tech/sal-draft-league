import { NextRequest, NextResponse } from "next/server";
import {
  buildDraftState,
  getDraftPicks,
  getShortlist,
  getTopShortlistPick,
  recordPick,
  removePlayerFromAllShortlists,
  updateDraftRoom,
} from "@/lib/draft-data";
import { buildPickSequence } from "@/types/draft";
import { getCaptainSessionFromRequest } from "@/lib/captain-auth";
import { writeAuditLog } from "@/lib/league-data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await buildDraftState(id);
  if (!state) return NextResponse.json({ error: "Draft not found." }, { status: 404 });

  const session = getCaptainSessionFromRequest(request);
  const isCaptain = session?.draftRoomId === id;
  const captainOrgId = isCaptain ? session?.orgId : null;

  if (state.room.status === "active" && state.room.pickStartedAt && state.room.pickTimerSeconds > 0) {
    const elapsed = (Date.now() - new Date(state.room.pickStartedAt).getTime()) / 1000;
    if (elapsed >= state.room.pickTimerSeconds) {
      const sequence = buildPickSequence(state.room.baseOrder, state.room.rounds);
      const currentOrgId = sequence[state.room.currentPickIndex];
      const nextIndex = state.room.currentPickIndex + 1;
      const isComplete = nextIndex >= sequence.length;
      const now = new Date().toISOString();

      // Try auto-pick from shortlist before skipping
      if (currentOrgId) {
        const topPick = await getTopShortlistPick(id, currentOrgId);
        if (topPick) {
          // Verify not already picked (race condition guard)
          const existingPicks = await getDraftPicks(id);
          if (!existingPicks.some((p) => p.playerId === topPick)) {
            const pickNumber = state.room.currentPickIndex + 1;
            await recordPick(id, pickNumber, currentOrgId, topPick);
            await removePlayerFromAllShortlists(id, topPick);
            await updateDraftRoom(id, {
              currentPickIndex: nextIndex,
              status: isComplete ? "complete" : "active",
              pickStartedAt: isComplete ? null : now,
              completedAt: isComplete ? now : null,
            });
            await writeAuditLog("draft_auto_pick", "draft_pick", `${id}-${pickNumber}`, {
              draftRoomId: id,
              pickNumber,
              orgId: currentOrgId,
              playerId: topPick,
              reason: "shortlist_auto_pick",
              isComplete,
            });
            const updatedState = await buildDraftState(id);
            const shortlist = captainOrgId ? await getShortlist(id, captainOrgId) : undefined;
            return NextResponse.json({ state: updatedState, captainOrgId, shortlist });
          }
        }
      }

      // No shortlist pick available — skip
      await updateDraftRoom(id, {
        currentPickIndex: nextIndex,
        status: isComplete ? "complete" : "active",
        pickStartedAt: isComplete ? null : now,
        completedAt: isComplete ? now : null,
      });
      await writeAuditLog("draft_auto_skip", "draft_room", id, {
        draftRoomId: id,
        skippedPickIndex: state.room.currentPickIndex,
        reason: "timer_expired_no_shortlist",
      });
      const updatedState = await buildDraftState(id);
      const shortlist = captainOrgId ? await getShortlist(id, captainOrgId) : undefined;
      return NextResponse.json({ state: updatedState, captainOrgId, shortlist });
    }
  }

  const shortlist = captainOrgId ? await getShortlist(id, captainOrgId) : undefined;
  return NextResponse.json({ state, captainOrgId, shortlist });
}
