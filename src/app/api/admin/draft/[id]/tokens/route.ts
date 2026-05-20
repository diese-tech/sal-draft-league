import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { generateCaptainToken, getDraftRoom } from "@/lib/draft-data";
import { writeAuditLog } from "@/lib/league-data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const room = await getDraftRoom(id);
  if (!room) return NextResponse.json({ error: "Draft room not found." }, { status: 404 });
  if (room.baseOrder.length === 0) return NextResponse.json({ error: "Set pick order before generating tokens." }, { status: 400 });

  const tokens: Record<string, string> = {};
  for (const orgId of room.baseOrder) {
    const token = await generateCaptainToken(id, orgId);
    tokens[orgId] = token;
  }
  await writeAuditLog("draft_tokens_generated", "draft_room", id, { orgCount: Object.keys(tokens).length });
  return NextResponse.json({ tokens });
}
