import { NextRequest, NextResponse } from "next/server";
import { adminCookie, verifyAdminPassword } from "@/lib/admin-auth";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, remaining, resetAt } = checkRateLimit(`login:${ip}`);

  if (!allowed) {
    const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSecs) } },
    );
  }

  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json(
      { error: "Invalid admin password.", attemptsRemaining: remaining },
      { status: 401 },
    );
  }

  // Successful login — clear the rate limit bucket for this IP
  clearRateLimit(`login:${ip}`);

  const response = NextResponse.json({ ok: true });
  const cookie = adminCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
