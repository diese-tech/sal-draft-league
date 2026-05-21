import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { hardDelete } from "@/lib/league-data";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await hardDelete("matches", id);
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error deleting match.";
    console.error(`DELETE /api/admin/matches/${id} error:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
