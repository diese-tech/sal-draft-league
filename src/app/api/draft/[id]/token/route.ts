import { NextRequest, NextResponse } from "next/server";
import { exchangeToken, setCaptainCookie } from "@/lib/captain-auth";

// Exchange a one-time captain token for a session cookie.
// Called by the draft board page when ?token= is present in the URL.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { token?: string } | null;
  if (!body?.token) return NextResponse.json({ error: "Token required." }, { status: 400 });

  const session = await exchangeToken(body.token);
  if (!session || session.draftRoomId !== id) {
    return NextResponse.json({ error: "Invalid or expired captain token." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, orgId: session.orgId });
  setCaptainCookie(response, session);
  return response;
}
