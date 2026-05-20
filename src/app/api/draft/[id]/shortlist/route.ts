import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addToShortlist,
  getDraftPicks,
  getDraftRoom,
  getShortlist,
  removeFromShortlist,
  reorderShortlist,
} from "@/lib/draft-data";
import { getCaptainSessionFromRequest } from "@/lib/captain-auth";

function unauthorized() {
  return NextResponse.json({ error: "Captain session required." }, { status: 401 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCaptainSessionFromRequest(request);
  if (!session || session.draftRoomId !== id) return unauthorized();
  const shortlist = await getShortlist(id, session.orgId);
  return NextResponse.json({ shortlist });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCaptainSessionFromRequest(request);
  if (!session || session.draftRoomId !== id) return unauthorized();

  const body = await request.json().catch(() => null);
  const result = z.object({ playerId: z.string().min(1) }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: "playerId required." }, { status: 400 });

  const { playerId } = result.data;

  // Verify player isn't already drafted
  const picks = await getDraftPicks(id);
  if (picks.some((p) => p.playerId === playerId)) {
    return NextResponse.json({ error: "Player has already been drafted." }, { status: 400 });
  }

  // Verify draft room exists
  const room = await getDraftRoom(id);
  if (!room) return NextResponse.json({ error: "Draft not found." }, { status: 404 });

  try {
    await addToShortlist(id, session.orgId, playerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add to shortlist.";
    // Unique constraint = already in shortlist
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Player is already on your shortlist." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCaptainSessionFromRequest(request);
  if (!session || session.draftRoomId !== id) return unauthorized();

  const body = await request.json().catch(() => null);
  const result = z.object({ playerId: z.string().min(1) }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: "playerId required." }, { status: 400 });

  await removeFromShortlist(id, session.orgId, result.data.playerId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCaptainSessionFromRequest(request);
  if (!session || session.draftRoomId !== id) return unauthorized();

  const body = await request.json().catch(() => null);
  const result = z.object({ order: z.array(z.string()).min(1) }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: "order array required." }, { status: 400 });

  await reorderShortlist(id, session.orgId, result.data.order);
  return NextResponse.json({ ok: true });
}
