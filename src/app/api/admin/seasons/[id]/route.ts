import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { advanceWeek, getAllSeasons, saveSeason } from "@/lib/league-data";

const patchSchema = z.object({
  action: z.enum(["advanceWeek", "update"]).optional(),
  currentWeek: z.number().int().min(0).optional(),
  status: z.enum(["pre-season", "active", "post-season", "offseason"]).optional(),
  name: z.string().min(1).max(64).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const result = patchSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const patch = result.data;

  try {
    if (patch.action === "advanceWeek") {
      await advanceWeek(id);
    } else {
      // Fetch the current season, merge the patch fields, then upsert
      const seasons = await getAllSeasons();
      const existing = seasons.find((s) => s.id === id);
      if (!existing) return NextResponse.json({ error: "Season not found." }, { status: 404 });

      if (patch.status !== undefined && patch.status !== existing.status) {
        const VALID_TRANSITIONS: Record<string, string[]> = {
          "pre-season": ["active"],
          "active": ["post-season", "offseason"],
          "post-season": ["offseason"],
          "offseason": ["pre-season"],
        };
        const allowed = VALID_TRANSITIONS[existing.status] ?? [];
        if (!allowed.includes(patch.status)) {
          return NextResponse.json(
            { error: `Cannot transition season from "${existing.status}" to "${patch.status}". Allowed: ${allowed.join(", ") || "none"}.` },
            { status: 400 },
          );
        }
      }

      if (patch.status === "active") {
        const alreadyActive = seasons.find((s) => s.status === "active" && s.id !== id);
        if (alreadyActive) {
          return NextResponse.json(
            { error: `Season "${alreadyActive.name}" is already active. Deactivate it before activating another.` },
            { status: 409 },
          );
        }
      }

      await saveSeason({
        ...existing,
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.currentWeek !== undefined && { currentWeek: patch.currentWeek }),
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.startDate !== undefined && { startDate: patch.startDate }),
        ...(patch.endDate !== undefined && { endDate: patch.endDate }),
      });
    }
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error updating season.";
    console.error(`PATCH /api/admin/seasons/${id} error:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
