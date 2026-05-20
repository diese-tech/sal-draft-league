import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  claimPlayerProfile,
  getPlayerByDiscordId,
  getRegistrationByDiscordId,
} from "@/lib/league-data";
import { getAuthUser, getDiscordId } from "@/lib/supabase-auth-server";

const schema = z.object({ playerId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const discordId = getDiscordId(user);
  if (!discordId) return NextResponse.json({ error: "Discord ID not found in session." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Prevent double-claiming
  const alreadyClaimed = await getPlayerByDiscordId(discordId);
  if (alreadyClaimed) {
    return NextResponse.json({ error: "This Discord account is already linked to a player profile." }, { status: 409 });
  }

  await claimPlayerProfile(discordId, parsed.data.playerId);

  // If a Flow B registration exists for this discord, mark it approved/linked
  const reg = await getRegistrationByDiscordId(discordId);
  if (reg && reg.status === "pending") {
    const { updateRegistrationStatus } = await import("@/lib/league-data");
    await updateRegistrationStatus(reg.id, "approved", "Auto-approved via profile claim");
  }

  return NextResponse.json({ ok: true });
}
