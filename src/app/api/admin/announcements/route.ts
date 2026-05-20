import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { saveAnnouncement } from "@/lib/league-data";

const announcementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  category: z.enum(["general", "rules", "draft", "results", "admin"]),
  pinned: z.boolean(),
  createdAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const result = announcementSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }

  const { createdAt, ...rest } = result.data;
  try {
    await saveAnnouncement({ ...rest, createdAt: createdAt ?? new Date().toISOString() });
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/announcements error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}
