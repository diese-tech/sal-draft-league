import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { saveOrg } from "@/lib/league-data";

const orgSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  tag: z.string().min(1).max(8),
  divisionId: z.enum(["solar", "lunar", "gaia"]),
  logoInitials: z.string().max(4).optional().default(""),
  logoGradient: z.string().optional().default(""),
  primaryColor: z.string().optional().default(""),
  accentGradient: z.string().optional().default(""),
  captainId: z.string().optional(),
  founded: z.string().optional(),
  socialLinks: z.object({
    discord: z.string().optional(),
    twitch: z.string().optional(),
    twitter: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const result = orgSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = result.data;

  try {
    await saveOrg({
      id: data.id,
      name: data.name,
      tag: data.tag.toUpperCase(),
      divisionId: data.divisionId,
      logoInitials: data.logoInitials ?? "",
      logoGradient: data.logoGradient ?? "",
      primaryColor: data.primaryColor ?? "",
      accentGradient: data.accentGradient ?? "",
      captainId: data.captainId,
      founded: data.founded,
      socialLinks: data.socialLinks,
    });
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error saving org.";
    console.error("POST /api/admin/orgs error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
