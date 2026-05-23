import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { saveSeason } from "@/lib/league-data";

const seasonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  status: z.enum(["pre-season", "active", "post-season", "offseason"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  currentWeek: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const result = seasonSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (result.data.status === "active") {
      const { getAllSeasons } = await import("@/lib/league-data");
      const allSeasons = await getAllSeasons();
      const alreadyActive = allSeasons.find((s) => s.status === "active");
      if (alreadyActive) {
        return NextResponse.json(
          { error: `Season "${alreadyActive.name}" is already active. Deactivate it before creating another active season.` },
          { status: 409 },
        );
      }
    }

    await saveSeason(result.data);
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error saving season.";
    console.error("POST /api/admin/seasons error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
