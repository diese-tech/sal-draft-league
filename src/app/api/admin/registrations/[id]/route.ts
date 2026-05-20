import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { updateRegistrationStatus } from "@/lib/league-data";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  reviewerNote: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await updateRegistrationStatus(id, parsed.data.status, parsed.data.reviewerNote);
  return NextResponse.json({ ok: true });
}
