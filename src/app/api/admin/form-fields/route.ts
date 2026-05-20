import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { saveFormField, deleteFormField } from "@/lib/league-data";

const fieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores"),
  label: z.string().min(1).max(100),
  fieldType: z.enum(["text", "url", "select", "multiselect", "checkbox", "textarea"]),
  required: z.boolean(),
  fieldOrder: z.number().int().min(0),
  options: z.array(z.string()).optional(),
  locked: z.boolean(),
  hidden: z.boolean(),
  placeholder: z.string().max(200).optional(),
  validationHint: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = fieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await saveFormField(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  await deleteFormField(id);
  return NextResponse.json({ ok: true });
}
