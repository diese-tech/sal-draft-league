import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildDraftState, updateDraftRoom } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  try {
    const state = await buildDraftState(id);
    if (!state) return NextResponse.json({ error: "Draft room not found." }, { status: 404 });
    if (state.room.status !== "pending") return NextResponse.json({ error: `Cannot start a draft with status "${state.room.status}".` }, { status: 400 });
    if (state.room.baseOrder.length === 0) return NextResponse.json({ error: "Set the pick order before starting the draft." }, { status: 400 });
    // Validate each orgId in baseOrder is real and belongs to the correct division
    const supabase = getSupabaseServerClient();
    if (supabase && state.room.baseOrder.length > 0) {
      const { data: divOrgs } = await supabase
        .from("orgs")
        .select("id")
        .eq("division_id", state.room.divisionId);
      const validOrgIds = new Set((divOrgs ?? []).map((o: { id: string }) => o.id));
      const invalidIds = state.room.baseOrder.filter((orgId: string) => !validOrgIds.has(orgId));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `baseOrder contains org IDs not in division "${state.room.divisionId}": ${invalidIds.join(", ")}` },
          { status: 400 }
        );
      }
    }
    const now = new Date().toISOString();
    const room = await updateDraftRoom(id, { status: "active", startedAt: now, pickStartedAt: now, currentPickIndex: 0 });
    await writeAuditLog("draft_started", "draft_room", id, { divisionId: state.room.divisionId });
    return NextResponse.json({ room });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
