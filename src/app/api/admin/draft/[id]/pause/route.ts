import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildDraftState, updateDraftRoom } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const state = await buildDraftState(id);
  if (!state) return NextResponse.json({ error: "Draft room not found." }, { status: 404 });
  if (state.room.status !== "active") return NextResponse.json({ error: "Draft is not active." }, { status: 400 });
  const room = await updateDraftRoom(id, { status: "paused", pickStartedAt: null });
  await writeAuditLog("draft_paused", "draft_room", id, { currentPickIndex: state.room.currentPickIndex });
  return NextResponse.json({ room });
}
