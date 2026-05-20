import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildDraftState, updateDraftRoom } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  try {
    const state = await buildDraftState(id);
    if (!state) return NextResponse.json({ error: "Draft room not found." }, { status: 404 });
    if (state.room.status !== "pending") return NextResponse.json({ error: `Cannot start a draft with status "${state.room.status}".` }, { status: 400 });
    if (state.room.baseOrder.length === 0) return NextResponse.json({ error: "Set the pick order before starting the draft." }, { status: 400 });
    const now = new Date().toISOString();
    const room = await updateDraftRoom(id, { status: "active", startedAt: now, pickStartedAt: now, currentPickIndex: 0 });
    await writeAuditLog("draft_started", "draft_room", id, { divisionId: state.room.divisionId });
    return NextResponse.json({ room });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
