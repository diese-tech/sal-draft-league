import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isSuperAdminRequest } from "@/lib/admin-auth";
import { cancelScheduledDelete } from "@/lib/league-data";

const VALID_TABLES = ["players", "orgs", "matches"] as const;
type ValidTable = (typeof VALID_TABLES)[number];

function isValidTable(t: string): t is ValidTable {
  return VALID_TABLES.includes(t as ValidTable);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ entityType: string; id: string }> }) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized. Superadmin required." }, { status: 403 });
  }

  const { entityType, id } = await params;

  if (!isValidTable(entityType)) {
    return NextResponse.json({ error: `Invalid entityType: ${entityType}. Must be one of: ${VALID_TABLES.join(", ")}.` }, { status: 400 });
  }

  try {
    await cancelScheduledDelete(entityType, id);
    revalidateTag("league-data", {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error cancelling scheduled delete.";
    console.error(`POST /api/admin/pending-deletes/${entityType}/${id}/cancel error:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
