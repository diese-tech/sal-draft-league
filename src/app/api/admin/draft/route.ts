import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { createDraftRoom, getDraftRooms } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";

const createSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "id must be lowercase alphanumeric with hyphens"),
  seasonId: z.string().min(1),
  divisionId: z.enum(["solar", "lunar", "gaia"]),
  rounds: z.number().int().min(1).max(10).optional(),
  pickTimerSeconds: z.number().int().min(30).max(600).optional(),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const rooms = await getDraftRooms();
  return NextResponse.json({ rooms });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const result = createSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  // Guard: prevent two active/pending rooms for the same division
  const existingRooms = await getDraftRooms(result.data.seasonId);
  const conflict = existingRooms.find(
    (r) => r.divisionId === result.data.divisionId && (r.status === "active" || r.status === "pending")
  );
  if (conflict) {
    return NextResponse.json(
      { error: `A draft room for division "${result.data.divisionId}" is already ${conflict.status}. Complete or cancel it before creating another.` },
      { status: 409 }
    );
  }
  try {
    const room = await createDraftRoom(result.data);
    await writeAuditLog("draft_room_created", "draft_room", result.data.id, { divisionId: result.data.divisionId, rounds: result.data.rounds });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create draft room.";
    console.error("POST /api/admin/draft:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
