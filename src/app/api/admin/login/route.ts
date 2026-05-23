import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminCookie } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  let body: { password?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    // empty or non-JSON body — fall through to password check which will fail
  }

  const { password } = body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Password login not configured." }, { status: 503 });
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  const expectedBuf = Buffer.from(adminPassword, "utf8");
  const actualBuf = Buffer.from(password, "utf8");
  const valid =
    expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);

  if (!valid) {
    return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  }

  const cookie = adminCookie("password-admin", "super_admin");
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
