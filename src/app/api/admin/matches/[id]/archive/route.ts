import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { archiveRecord, unarchiveRecord } from "@/lib/league-data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { unarchive?: boolean };

  try {
    if (body.unarchive) {
      await unarchiveRecord("matches", id);
    } else {
      await archiveRecord("matches", id);
    }
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error archiving match.";
    console.error(`POST /api/admin/matches/${id}/archive error:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
