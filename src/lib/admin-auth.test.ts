import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeAdminSession, verifyAdminSession } from "./admin-auth";

const TEST_SECRET = "test-hmac-secret-for-unit-tests";

// Helper: sign a base64url-encoded payload using the Node crypto module
import { createHmac } from "crypto";

function signPayload(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(encoded).digest("hex");
}

function encodePayload(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

describe("admin-auth", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  // 1. Round-trip: make then verify returns original payload fields
  it("round-trip: verifyAdminSession returns the original payload after makeAdminSession", () => {
    const token = makeAdminSession("123456789", "super_admin");
    const result = verifyAdminSession(token);
    expect(result).not.toBeNull();
    expect(result?.discordId).toBe("123456789");
    expect(result?.role).toBe("super_admin");
    expect(typeof result?.exp).toBe("number");
    expect(result!.exp).toBeGreaterThan(Date.now());
  });

  // 2. Expiry: session is invalid after 8 hours
  it("expiry: returns null when session has expired", () => {
    const token = makeAdminSession("123456789", "admin");
    // Advance time past 8 hours (8 * 60 * 60 * 1000 ms + 1ms)
    vi.useFakeTimers();
    vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1);
    const result = verifyAdminSession(token);
    expect(result).toBeNull();
  });

  // 3. Tampered payload: modified payload with original signature → null
  it("tampered payload: returns null when payload is modified but signature is unchanged", () => {
    const token = makeAdminSession("123456789", "admin");
    const [encoded, signature] = token.split(".");

    // Decode, modify, re-encode
    const original = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    original.role = "super_admin"; // change the role
    const tamperedEncoded = encodePayload(original);

    const tamperedToken = `${tamperedEncoded}.${signature}`;
    const result = verifyAdminSession(tamperedToken);
    expect(result).toBeNull();
  });

  // 4. Tampered signature: append character to signature → null
  it("tampered signature: returns null when signature is modified", () => {
    const token = makeAdminSession("123456789", "admin");
    const tamperedToken = token + "x";
    const result = verifyAdminSession(tamperedToken);
    expect(result).toBeNull();
  });

  // 5. Malformed — no dot separator
  it("malformed: returns null when token has no dot separator", () => {
    const result = verifyAdminSession("nodotinthisstring");
    expect(result).toBeNull();
  });

  // 6. Malformed — empty string
  it("malformed: returns null for empty string", () => {
    const result = verifyAdminSession("");
    expect(result).toBeNull();
  });

  // 7. Malformed — undefined
  it("malformed: returns null for undefined", () => {
    const result = verifyAdminSession(undefined);
    expect(result).toBeNull();
  });

  // 8. Wrong secret: token created with secret-A is rejected when env changes to secret-B
  it("wrong secret: returns null when session was signed with a different secret", () => {
    // Token created with TEST_SECRET (already stubbed in beforeEach)
    const token = makeAdminSession("123456789", "admin");

    // Change the secret
    vi.stubEnv("ADMIN_SESSION_SECRET", "completely-different-secret");

    const result = verifyAdminSession(token);
    expect(result).toBeNull();
  });

  // 9. Role validation: a forged payload with an invalid role returns null
  it("role validation: returns null for a correctly-signed token with an invalid role", () => {
    const payload = {
      discordId: "123456789",
      role: "owner", // not a valid role
      exp: Date.now() + 8 * 60 * 60 * 1000,
    };
    const encoded = encodePayload(payload);
    const signature = signPayload(encoded, TEST_SECRET);
    const forgedToken = `${encoded}.${signature}`;
    const result = verifyAdminSession(forgedToken);
    expect(result).toBeNull();
  });

  // 10. Both role values: "super_admin" and "admin" are both accepted
  it("role validation: accepts super_admin role", () => {
    const token = makeAdminSession("111111111", "super_admin");
    const result = verifyAdminSession(token);
    expect(result).not.toBeNull();
    expect(result?.role).toBe("super_admin");
  });

  it("role validation: accepts admin role", () => {
    const token = makeAdminSession("222222222", "admin");
    const result = verifyAdminSession(token);
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  // 11. Secret fallback: ADMIN_PASSWORD is used when ADMIN_SESSION_SECRET is unset
  it("secret fallback: uses ADMIN_PASSWORD when ADMIN_SESSION_SECRET is not set", () => {
    const fallbackSecret = "fallback-admin-password";

    // Use ADMIN_PASSWORD as the secret for creating the token
    vi.stubEnv("ADMIN_SESSION_SECRET", fallbackSecret);
    const token = makeAdminSession("333333333", "admin");

    // Now unset ADMIN_SESSION_SECRET and set ADMIN_PASSWORD instead
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("ADMIN_PASSWORD", fallbackSecret);

    // The token should still verify because the same secret is used via ADMIN_PASSWORD
    const result = verifyAdminSession(token);
    expect(result).not.toBeNull();
    expect(result?.discordId).toBe("333333333");
    expect(result?.role).toBe("admin");
  });
});
