import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "sal_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be set.");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export interface AdminSessionPayload {
  discordId: string;
  role: "super_admin" | "admin";
  exp: number;
}

export function makeAdminSession(discordId: string, role: "super_admin" | "admin") {
  if (!process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === "production") {
    console.warn(
      "[admin-auth] WARNING: ADMIN_SESSION_SECRET is not set. Sessions are signed with ADMIN_PASSWORD which may have low entropy. Set ADMIN_SESSION_SECRET to a long random string.",
    );
  }
  const payload = JSON.stringify({ discordId, role, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSession(value?: string): AdminSessionPayload | null {
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      discordId?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    if (typeof payload.discordId !== "string") return null;
    if (payload.role !== "super_admin" && payload.role !== "admin") return null;
    return { discordId: payload.discordId, role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  return verifyAdminSession(store.get(COOKIE_NAME)?.value);
}

export async function isAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export function getAdminRequestSession(request: NextRequest): AdminSessionPayload | null {
  return verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value);
}

export function isAdminRequest(request: NextRequest): boolean {
  return getAdminRequestSession(request) !== null;
}

export function isSuperAdminRequest(request: NextRequest): boolean {
  const session = getAdminRequestSession(request);
  return session?.role === "super_admin";
}

export function adminCookie(discordId: string, role: "super_admin" | "admin") {
  return {
    name: COOKIE_NAME,
    value: makeAdminSession(discordId, role),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  };
}

export function expiredAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}
