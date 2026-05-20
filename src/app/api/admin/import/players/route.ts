import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { savePlayer } from "@/lib/league-data";

const playerSchema = z.object({
  id: z.string().min(1),
  ign: z.string().min(1).max(64),
  discordUsername: z.string().min(1).max(64),
  primaryRole: z.enum(["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"]),
  secondaryRoles: z.array(z.enum(["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"])).default([]),
  orgId: z.string().optional(),
  divisionId: z.enum(["solar", "lunar", "gaia"]).optional(),
  avatarInitials: z.string().min(1).max(4),
  avatarGradient: z.string().min(1),
  isStarter: z.boolean().default(false),
  isCaptain: z.boolean().default(false),
  status: z.enum(["free-agent", "org-affiliated", "drafted", "queued-ghost", "active"]).default("free-agent"),
  stats: z.object({
    kills: z.number().int().min(0),
    deaths: z.number().int().min(0),
    assists: z.number().int().min(0),
    gamesPlayed: z.number().int().min(0),
    wins: z.number().int().min(0),
  }).optional(),
});

const bodySchema = z.object({
  players: z.array(playerSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  let imported = 0;
  const errors: Array<{ ign: string; error: string }> = [];

  for (const player of parsed.data.players) {
    try {
      await savePlayer(player);
      imported++;
    } catch (err) {
      errors.push({ ign: player.ign, error: err instanceof Error ? err.message : "Unknown error." });
    }
  }

  if (imported > 0) revalidateTag("league-data", {});
  return NextResponse.json({ imported, errors });
}
