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

function makeSessionValue() {
  const payload = JSON.stringify({ role: "admin", exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionValue(value?: string) {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminSession() {
  const store = await cookies();
  return verifySessionValue(store.get(COOKIE_NAME)?.value);
}

export async function requireAdmin() {
  if (!(await isAdminSession())) redirect("/admin/login");
}

export function isAdminRequest(request: NextRequest) {
  return verifySessionValue(request.cookies.get(COOKIE_NAME)?.value);
}

export function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  const configuredBuffer = Buffer.from(configured);
  const actualBuffer = Buffer.from(password);
  return configuredBuffer.length === actualBuffer.length && timingSafeEqual(configuredBuffer, actualBuffer);
}

export function adminCookie() {
  return {
    name: COOKIE_NAME,
    value: makeSessionValue(),
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
