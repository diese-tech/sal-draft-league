import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getCaptainSessionFromRequest } from "./captain-auth";

const COOKIE = "sal_captain_session";

function makeRequest(cookieValue?: string): NextRequest {
  const headers = new Headers();
  if (cookieValue !== undefined) {
    headers.set("cookie", `${COOKIE}=${cookieValue}`);
  }
  return new NextRequest("http://localhost/api/draft/test", { headers });
}

describe("getCaptainSessionFromRequest", () => {
  it("returns null when cookie is absent", () => {
    expect(getCaptainSessionFromRequest(makeRequest())).toBeNull();
  });

  it("returns null when cookie is empty string", () => {
    expect(getCaptainSessionFromRequest(makeRequest(""))).toBeNull();
  });

  it("returns null when cookie has no colon separator", () => {
    expect(getCaptainSessionFromRequest(makeRequest("nodraftroom"))).toBeNull();
  });

  it("returns null when draftRoomId is empty", () => {
    // ":orgId" — first segment is empty
    expect(getCaptainSessionFromRequest(makeRequest(":helix-reign"))).toBeNull();
  });

  it("returns null when orgId is empty", () => {
    // "draftRoomId:" — second segment is empty
    expect(getCaptainSessionFromRequest(makeRequest("draft-room-1:"))).toBeNull();
  });

  it("parses a valid draftRoomId:orgId cookie", () => {
    const session = getCaptainSessionFromRequest(makeRequest("draft-room-1:helix-reign"));
    expect(session).toEqual({ draftRoomId: "draft-room-1", orgId: "helix-reign" });
  });

  it("uses only the first two colon-separated segments", () => {
    // Extra colons in the value should not crash or be parsed
    const session = getCaptainSessionFromRequest(makeRequest("draft-room-1:helix-reign:extra"));
    expect(session).toEqual({ draftRoomId: "draft-room-1", orgId: "helix-reign" });
  });

  // Security note: the session is unsigned plain text (Bug #54).
  // Any client can craft an arbitrary draftRoomId:orgId cookie and impersonate a captain.
  // The tests below document this vulnerability — they pass because the current code
  // accepts forged values without validation.
  it("Bug #54: accepts a forged draftRoomId without signature verification", () => {
    const forged = getCaptainSessionFromRequest(makeRequest("any-room:any-org"));
    // This should ideally return null for an unsigned/unverified token,
    // but currently it returns the forged values as-is.
    expect(forged).toEqual({ draftRoomId: "any-room", orgId: "any-org" });
  });
});
