import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { recalculateAndPersistStandings } from "@/lib/league-data";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const standings = await recalculateAndPersistStandings();
    return NextResponse.json({ ok: true, standings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error recalculating standings.";
    console.error("POST /api/admin/recalculate-standings error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
