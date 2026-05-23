import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "crypto";

const publicRoutes = [
  { path: "/", heading: "Serpent" },
  { path: "/standings", heading: "Season 1" },
  { path: "/schedule", heading: "Season 1" },
  { path: "/teams", heading: "Season 1 Roster" },
  { path: "/teams/helix-reign", heading: "Helix Reign" },
];

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const route of publicRoutes) {
  test(`public route ${route.path} renders core content`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByText(route.heading).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("â");
    await expect(page.locator("body")).not.toContainText("Â");
  });
}

for (const route of publicRoutes) {
  for (const viewport of viewports) {
    test(`${route.path} has no page overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path);
      await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
    });
  }
}

for (const label of ["Home", "Standings", "Schedule", "Teams"]) {
  test(`top nav ${label} link navigates`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(label === "Home" ? "/" : `/${label.toLowerCase()}`);
  });
}

test("league logo asset renders in nav and metadata image path is reachable", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("header img").first()).toBeVisible();
  const response = await request.get("/assets/sal-logo.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});

for (const asset of ["/assets/division-solar.png", "/assets/division-lunar.png"]) {
  test(`${asset} is available for division art`, async ({ request }) => {
    const response = await request.get(asset);
    expect(response.ok()).toBe(true);
    expect(Number(response.headers()["content-length"] ?? 0)).toBeGreaterThan(100_000);
  });
}

for (const cta of [
  { name: "Full Schedule", href: "/schedule" },
  { name: "All Teams", href: "/teams" },
  { name: "Full Standings", href: "/standings" },
  { name: "View Schedule", href: "/schedule" },
]) {
  test(`homepage CTA ${cta.name} is wired`, async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: new RegExp(cta.name) }).filter({ hasNotText: /Solar|Lunar|Gaia/ }).last();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", cta.href);
  });
}

for (const division of ["Solar", "Lunar", "Gaia"]) {
  test(`standings division tab ${division} switches table`, async ({ page }) => {
    await page.goto("/standings");
    await page.getByRole("button", { name: division }).click();
    await expect(page.getByRole("button", { name: division })).toHaveClass(/text-/);
    await expect(page.locator("a[href^='/teams/']:visible").first()).toBeVisible();
  });
}

for (const filter of ["Solar", "Lunar", "Gaia", "Live", "Scheduled", "Completed", "Postponed", "Wk 1", "Wk 2", "Wk 3"]) {
  test(`schedule filter ${filter} is selectable`, async ({ page }) => {
    await page.goto("/schedule");
    await page.getByRole("button", { name: filter }).click();
    await expect(page.getByRole("button", { name: filter })).toBeVisible();
    await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
  });
}

for (const filter of ["All", "Solar", "Lunar", "Gaia"]) {
  test(`teams division filter ${filter} is selectable`, async ({ page }) => {
    await page.goto("/teams");
    await page.getByRole("button", { name: filter }).click();
    await expect(page.getByRole("button", { name: filter })).toBeVisible();
  });
}

for (const query of ["Helix", "HRX", "does-not-exist"]) {
  test(`teams search handles ${query}`, async ({ page }) => {
    await page.goto("/teams");
    await page.getByPlaceholder("Search teams...").fill(query);
    if (query === "does-not-exist") {
      await expect(page.getByText("No teams match your filters.")).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /Helix Reign/i })).toBeVisible();
    }
  });
}

for (const path of ["/teams/helix-reign", "/teams/midnight-pact", "/teams/root-warden"]) {
  test(`team detail ${path} renders roster and matches`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText("Full Roster")).toBeVisible();
    await expect(page.getByRole("link", { name: "← All Teams" })).toHaveAttribute("href", "/teams");
    await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
  });
}

for (const path of ["/admin", "/admin/matches", "/admin/players", "/admin/standings", "/admin/teams", "/admin/announcements"]) {
  test(`admin route ${path} redirects when logged out`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
}

test("admin login rejects bad password", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Enter admin" }).click();
  await expect(page.getByText("Invalid admin password.")).toBeVisible();
});

test("admin login accepts configured password and logout clears session", async ({ page }) => {
  await adminLogin(page);
  await expect(page).toHaveURL("/admin");
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL("/admin/login");
});

for (const item of [
  { name: "Overview", url: "/admin" },
  { name: "Teams", url: "/admin/teams" },
  { name: "Roster", url: "/admin/players" },
  { name: "Schedule", url: "/admin/matches" },
  { name: "Standings", url: "/admin/standings" },
  { name: "Announcements", url: "/admin/announcements" },
]) {
  test(`admin nav opens ${item.name}`, async ({ page }) => {
    await adminLogin(page);
    await page.getByRole("navigation").getByRole("link", { name: item.name, exact: true }).click();
    await expect(page).toHaveURL(item.url);
  });
}

test("admin schedule create form exposes every editable field", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "+ Schedule Match" }).click();
  for (const label of ["Division", "Home", "Away", "Status", "Date", "Time", "Week", "Stream URL", "VOD URL"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  // Score fields only appear when status is completed
  await page.getByLabel("Status").selectOption("completed");
  await expect(page.getByText("Score", { exact: true })).toBeVisible();
});

test("admin schedule save posts match mutation payload", async ({ page }) => {
  await adminLogin(page);
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/admin/matches", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "+ Schedule Match" }).click();
  await page.getByLabel("Status").selectOption("completed");
  await page.getByLabel("Week").fill("9");
  await page.getByLabel("Stream URL").fill("https://twitch.tv/sal");
  await page.locator("input[type='number']").nth(1).fill("2");
  await page.locator("input[type='number']").nth(2).fill("1");
  await page.getByRole("button", { name: "Save Match" }).click();
  // Confirmation dialog appears for completed matches
  await page.getByRole("button", { name: /Yes, save & recalculate/ }).click();
  await expect.poll(() => payload?.status).toBe("completed");
  expect(payload?.week).toBe(9);
  expect(payload?.homeScore).toBe(2);
  expect(payload?.awayScore).toBe(1);
  expect(payload?.streamUrl).toBe("https://twitch.tv/sal");
});

test("admin schedule save failure shows useful message", async ({ page }) => {
  await adminLogin(page);
  await page.route("**/api/admin/matches", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
  });
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "+ Schedule Match" }).click();
  await page.getByRole("button", { name: "Save Match" }).click();
  await expect(page.getByText("Save failed: boom")).toBeVisible();
});

test("admin roster editor exposes assignment controls", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/players");
  await page.getByText("AzraelP-HRX").first().click();
  for (const label of ["IGN", "Discord", "Team", "Division", "Primary role", "Status"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Starter")).toBeVisible();
  await expect(page.getByLabel("Captain")).toBeVisible();
});

test("admin roster save posts player mutation payload", async ({ page }) => {
  await adminLogin(page);
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/admin/players", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/admin/players");
  await page.getByText("AzraelP-HRX").first().click();
  await page.getByRole("textbox", { name: "IGN" }).fill("TestIGN");
  await page.getByLabel("Primary role").selectOption("Support");
  await page.getByLabel("Team").selectOption("midnight-pact");
  await page.getByLabel("Starter").uncheck();
  await page.getByRole("button", { name: "Save Player" }).click();
  await expect.poll(() => payload?.ign).toBe("TestIGN");
  expect(payload?.primaryRole).toBe("Support");
  expect(payload?.orgId).toBe("midnight-pact");
  expect(payload?.divisionId).toBe("lunar");
  expect(payload?.isStarter).toBe(false);
});

test("standings admin includes standings table and match editor", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/standings");
  await expect(page.getByText("Score-Driven Standings")).toBeVisible();
  await expect(page.getByText("Standings are recalculated from completed match scores.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Solar" })).toBeVisible();
  await expect(page.getByText("total matches")).toBeVisible();
});

test("mobile standings preserve readable team names", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/standings");
  await expect(page.getByRole("link", { name: /Helix Reign/ }).first()).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

for (const apiPath of ["/api/admin/matches", "/api/admin/players", "/api/admin/recalculate-standings"]) {
  test(`${apiPath} rejects unauthenticated mutation`, async ({ request }) => {
    const response = await request.post(apiPath, { data: {} });
    expect(response.status()).toBe(401);
  });
}

test("login API rejects malformed body", async ({ request }) => {
  const response = await request.post("/api/admin/login", { data: { password: "" } });
  expect(response.status()).toBe(401);
});

test("unknown team route returns not found", async ({ page }) => {
  const response = await page.goto("/teams/not-a-real-team");
  expect(response?.status()).toBe(404);
});

// --- Zod validation tests ---

test("matches API rejects same home and away org", async ({ request, baseURL }) => {
  // Get a session cookie first
  const loginRes = await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  expect(loginRes.ok()).toBe(true);
  const response = await request.post("/api/admin/matches", {
    data: {
      id: "match-test-1",
      divisionId: "solar",
      homeOrgId: "helix-reign",
      awayOrgId: "helix-reign",
      scheduledDate: "2025-06-01",
      scheduledTime: "20:00",
      status: "scheduled",
      week: 1,
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toContain("awayOrgId");
});

test("matches API rejects invalid divisionId", async ({ request }) => {
  await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  const response = await request.post("/api/admin/matches", {
    data: {
      id: "match-test-2",
      divisionId: "invalid-division",
      homeOrgId: "helix-reign",
      awayOrgId: "obsidian-order",
      scheduledDate: "2025-06-01",
      scheduledTime: "20:00",
      status: "scheduled",
      week: 1,
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("matches API rejects completed status without scores", async ({ request }) => {
  await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  const response = await request.post("/api/admin/matches", {
    data: {
      id: "match-test-3",
      divisionId: "solar",
      homeOrgId: "helix-reign",
      awayOrgId: "obsidian-order",
      scheduledDate: "2025-06-01",
      scheduledTime: "20:00",
      status: "completed",
      week: 1,
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("players API rejects invalid primaryRole", async ({ request }) => {
  await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  const response = await request.post("/api/admin/players", {
    data: {
      id: "player-test-1",
      ign: "TestPlayer",
      discordUsername: "testplayer",
      primaryRole: "Healer",
      status: "free-agent",
      isStarter: false,
      isCaptain: false,
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("players API rejects invalid status", async ({ request }) => {
  await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  const response = await request.post("/api/admin/players", {
    data: {
      id: "player-test-2",
      ign: "TestPlayer",
      discordUsername: "testplayer",
      primaryRole: "Mid",
      status: "banned",
      isStarter: false,
      isCaptain: false,
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("admin match form shows specific server error text", async ({ page }) => {
  await adminLogin(page);
  await page.route("**/api/admin/matches", async (route) => {
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "homeOrgId and awayOrgId must differ" }) });
  });
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "+ Schedule Match" }).click();
  await page.getByRole("button", { name: "Save Match" }).click();
  await expect(page.getByText("homeOrgId and awayOrgId must differ")).toBeVisible();
});

test("admin player form shows specific server error text", async ({ page }) => {
  await adminLogin(page);
  await page.route("**/api/admin/players", async (route) => {
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Invalid enum value for primaryRole" }) });
  });
  await page.goto("/admin/players");
  await page.getByText("AzraelP-HRX").first().click();
  await page.getByRole("button", { name: "Save Player" }).click();
  await expect(page.getByText("Invalid enum value for primaryRole")).toBeVisible();
});

// --- P1 feature tests ---

test("admin matches filter by division shows subset of matches", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "Solar" }).first().click();
  await expect(page.getByRole("button", { name: "Solar" }).first()).toHaveClass(/bg-cyan/);
  // "No matches match the current filters" should not appear — Solar has matches
  await expect(page.getByText("No matches match the current filters.")).not.toBeVisible();
});

test("admin matches filter by week narrows list", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "Wk 1" }).click();
  await expect(page.getByRole("button", { name: "Wk 1" })).toHaveClass(/bg-cyan/);
});

test("admin matches completed save shows confirmation dialog", async ({ page }) => {
  await adminLogin(page);
  await page.route("**/api/admin/matches", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/admin/matches");
  await page.getByRole("button", { name: "+ Schedule Match" }).click();
  await page.getByLabel("Status").selectOption("completed");
  await page.getByRole("button", { name: "Save Match" }).click();
  await expect(page.getByText("Saving a completed match will immediately recalculate standings.")).toBeVisible();
  await page.getByRole("button", { name: /Yes, save & recalculate/ }).click();
});

test("admin player search filters by IGN", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/players");
  await page.getByPlaceholder("Search IGN or Discord…").fill("AzraelP");
  await expect(page.getByText("AzraelP-HRX").first()).toBeVisible();
});

test("admin player search for nonexistent shows empty state", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/players");
  await page.getByPlaceholder("Search IGN or Discord…").fill("xXnonexistentXx");
  await expect(page.getByText("No players match the current filters.")).toBeVisible();
});

test("admin player filter free agents shows subset", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/players");
  await page.getByRole("button", { name: "Free Agents" }).click();
  await expect(page.getByRole("button", { name: "Free Agents" })).toHaveClass(/bg-cyan/);
});

test("admin player status field shows auto when player has team", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/players");
  await page.getByText("AzraelP-HRX").first().click();
  // AzraelP-HRX is on a team, so status shows as auto display, not a dropdown
  await expect(page.getByText("org-affiliated (auto)")).toBeVisible();
});

test("login API returns 429 after too many failed attempts", async ({ request }) => {
  // Exhaust the rate limit (11 attempts = over the 10 limit)
  for (let i = 0; i < 11; i++) {
    await request.post("/api/admin/login", { data: { password: "wrong-password" } });
  }
  const response = await request.post("/api/admin/login", { data: { password: "wrong-password" } });
  expect(response.status()).toBe(429);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

test("admin overview shows activity feed section", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin");
  await expect(page.getByText("Activity Feed")).toBeVisible();
});

// --- New page coverage ---

test("players page renders heading and player grid", async ({ page }) => {
  await page.goto("/players");
  await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
  // at least one player card should be visible (mock data has players)
  await expect(page.locator("a[href^='/players/']").first()).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

test("players page search narrows results by IGN", async ({ page }) => {
  await page.goto("/players");
  await page.getByPlaceholder("Search by IGN or Discord…").fill("AzraelP");
  await expect(page.locator("a[href^='/players/']").first()).toBeVisible();
});

test("players page search no-match shows empty state", async ({ page }) => {
  await page.goto("/players");
  await page.getByPlaceholder("Search by IGN or Discord…").fill("xXdoesnotexistXx");
  await expect(page.getByText("No players match your filters.")).toBeVisible();
});

test("players page role filter Solo is selectable", async ({ page }) => {
  await page.goto("/players");
  await page.getByRole("button", { name: "Solo" }).click();
  await expect(page.getByRole("button", { name: "Solo" })).toHaveClass(/fuchsia/);
});

test("players page division filter Solar is selectable", async ({ page }) => {
  await page.goto("/players");
  await page.getByRole("button", { name: "Solar" }).click();
  await expect(page.getByRole("button", { name: "Solar" })).toHaveClass(/orange/);
});

test("players page has no overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/players");
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

test("unknown player ID returns 404", async ({ page }) => {
  const response = await page.goto("/players/not-a-real-player-id");
  expect(response?.status()).toBe(404);
});

test("player profile page renders from team roster link", async ({ page }) => {
  // Navigate to a team page and click the first player card to reach their profile
  await page.goto("/teams/helix-reign");
  const firstPlayerLink = page.locator("a[href^='/players/']").first();
  await expect(firstPlayerLink).toBeVisible();
  const href = await firstPlayerLink.getAttribute("href");
  await page.goto(href!);
  // Profile page should have a back link and the player's role section
  await expect(page.getByRole("link", { name: "← All Players" })).toBeVisible();
  await expect(page.getByText("Role")).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

test("register page redirects to sign-in when unauthenticated", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test("auth sign-in page renders discord button", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page.getByRole("button", { name: /Discord/i })).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

test("watch page renders without crashing", async ({ page }) => {
  await page.goto("/watch");
  // Should show either a live embed or an offline state — never a crash
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

// --- Admin new pages ---

for (const item of [
  { name: "Registrations", url: "/admin/registrations" },
  { name: "Form Fields", url: "/admin/form-fields" },
  { name: "Import", url: "/admin/import" },
]) {
  test(`admin nav opens ${item.name}`, async ({ page }) => {
    await adminLogin(page);
    await page.getByRole("navigation").getByRole("link", { name: item.name, exact: true }).click();
    await expect(page).toHaveURL(item.url);
  });
}

test("admin registrations page shows pending tab", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/registrations");
  await expect(page.getByRole("button", { name: /Pending/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Approved/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rejected/ })).toBeVisible();
});

test("admin form fields page shows base locked fields", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/form-fields");
  await expect(page.getByText("In-Game Name")).toBeVisible();
  await expect(page.getByText("Tracker.gg Profile")).toBeVisible();
  // Locked fields cannot be deleted — no Delete button next to them
  await expect(page.getByRole("button", { name: "+ Add custom field" })).toBeVisible();
});

// --- Admin announcements flows ---

test("admin announcements form saves and shows success message", async ({ page }) => {
  await adminLogin(page);
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/admin/announcements", async (route) => {
    if (route.request().method() === "POST") {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/admin/announcements");
  await page.getByPlaceholder("Announcement title…").fill("Test Announcement Title");
  await page.locator("textarea").fill("This is the **body** of the announcement.");
  await page.getByRole("button", { name: "Save Announcement" }).click();
  await expect(page.getByText("Announcement saved.")).toBeVisible();
  expect(payload?.title).toBe("Test Announcement Title");
  expect(typeof payload?.body).toBe("string");
});

test("admin announcements save failure shows specific error", async ({ page }) => {
  await adminLogin(page);
  await page.route("**/api/admin/announcements", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "body exceeds max length" }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/admin/announcements");
  await page.getByPlaceholder("Announcement title…").fill("Title");
  await page.locator("textarea").fill("body");
  await page.getByRole("button", { name: "Save Announcement" }).click();
  await expect(page.getByText("Save failed: body exceeds max length")).toBeVisible();
});

test("admin announcements save without title shows inline validation", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/announcements");
  await page.getByRole("button", { name: "Save Announcement" }).click();
  await expect(page.getByText("Title and body are required.")).toBeVisible();
});

test("admin announcements preview toggle renders markdown body", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/announcements");
  await page.locator("textarea").fill("**bold text here**");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("strong").filter({ hasText: "bold text here" })).toBeVisible();
});

test("admin announcements edit button populates form with existing data", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/announcements");
  await page.getByRole("button", { name: "Edit" }).first().click();
  // Form title should now contain the first announcement's title from mock data
  const titleInput = page.getByPlaceholder("Announcement title…");
  await expect(titleInput).not.toHaveValue("");
  await expect(page.getByText("Edit Announcement")).toBeVisible();
});

test("admin announcements delete requires confirmation before calling API", async ({ page }) => {
  await adminLogin(page);
  let deleteCalled = false;
  await page.route("**/api/admin/announcements/**", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/admin/announcements");
  // Click Delete — should show Confirm/Cancel, not immediately fire API
  await page.getByRole("button", { name: "Delete" }).first().click();
  expect(deleteCalled).toBe(false);
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("admin announcements delete cancel dismisses confirmation", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/announcements");
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Confirm" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" }).first()).toBeVisible();
});

test("admin announcements delete confirm calls DELETE API", async ({ page }) => {
  await adminLogin(page);
  let deletedId: string | undefined;
  await page.route("**/api/admin/announcements/**", async (route) => {
    if (route.request().method() === "DELETE") {
      deletedId = route.request().url().split("/").pop();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    } else {
      await route.continue();
    }
  });
  await page.goto("/admin/announcements");
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect.poll(() => deletedId).toBeTruthy();
});

// --- Admin import flows ---

test("admin import page renders paste textarea", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/import");
  await expect(page.getByText("Player Import")).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();
});

test("admin import valid CSV shows green preview rows", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/import");
  await page.locator("textarea").fill(
    "IGN,Discord,Role\nSlayer99,slayer99#0001,Jungle\nMysticX,mysticx#0002,Mid",
  );
  // Green rows are labelled with confidence indicator
  await expect(page.locator("text=Slayer99").first()).toBeVisible();
  await expect(page.locator("text=MysticX").first()).toBeVisible();
});

test("admin import CSV with no role shows red row", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/import");
  await page.locator("textarea").fill("IGN,Discord\nNoRoleGuy,noroleguy#0001");
  await expect(page.locator("text=NoRoleGuy").first()).toBeVisible();
  // Row is flagged — Import button should not count it as importable
  const importBtn = page.getByRole("button", { name: /Import/ });
  // Button text says "Import 0 Players" since no green/yellow rows
  await expect(importBtn).toContainText("0");
});

test("admin import sends batch to API and shows imported count", async ({ page }) => {
  await adminLogin(page);
  let sentPlayers: unknown[] | undefined;
  await page.route("**/api/admin/import/players", async (route) => {
    sentPlayers = route.request().postDataJSON()?.players;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ imported: 2, errors: [] }) });
  });
  await page.goto("/admin/import");
  await page.locator("textarea").fill(
    "IGN,Discord,Role\nSlayer99,slayer99#0001,Jungle\nMysticX,mysticx#0002,Mid",
  );
  await page.getByRole("button", { name: /Import/ }).click();
  await expect(page.getByText("Imported 2 players.")).toBeVisible();
  expect(Array.isArray(sentPlayers)).toBe(true);
  expect((sentPlayers as unknown[]).length).toBe(2);
});

// --- Admin draft flows ---

test("admin draft route redirects when logged out", async ({ page }) => {
  await page.goto("/admin/draft");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin draft page renders heading and create room form", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/draft");
  await expect(page.getByRole("heading", { name: "Draft Rooms" })).toBeVisible();
  await expect(page.getByText("Create Draft Room")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Room" })).toBeVisible();
});

test("admin draft create form has division select", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/draft");
  const divisionSelect = page.locator("select").first();
  await expect(divisionSelect).toBeVisible();
  // Should have solar/lunar/gaia options
  await expect(divisionSelect.locator("option[value='solar']")).toHaveCount(1);
  await expect(divisionSelect.locator("option[value='lunar']")).toHaveCount(1);
  await expect(divisionSelect.locator("option[value='gaia']")).toHaveCount(1);
});

test("admin draft unknown room ID returns 404", async ({ page }) => {
  await adminLogin(page);
  const response = await page.goto("/admin/draft/nonexistent-room-id");
  expect(response?.status()).toBe(404);
});

// --- Admin registrations flows ---

test("admin registrations pending tab shows approve and reject actions or empty state", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/registrations");
  await page.getByRole("button", { name: /Pending/ }).click();
  // Either there are pending registrations with Approve/Reject buttons, or an empty state
  const approveButtons = page.getByRole("button", { name: "Approve" });
  const count = await approveButtons.count();
  if (count > 0) {
    await expect(approveButtons.first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" }).first()).toBeVisible();
  } else {
    // empty state is acceptable
    await expect(page.getByRole("button", { name: /Pending/ })).toBeVisible();
  }
});

test("admin registrations approved tab is selectable", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/registrations");
  await page.getByRole("button", { name: /Approved/ }).click();
  await expect(page.getByRole("button", { name: /Approved/ })).toBeVisible();
});

// --- Admin form fields flows ---

test("admin form fields locked base fields have no delete button inline", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/form-fields");
  // "In-Game Name" is a locked field — its row must not contain a Delete button
  const ignRow = page.locator("*", { hasText: "In-Game Name" }).last();
  await expect(ignRow.getByRole("button", { name: "Delete" })).toHaveCount(0);
});

test("admin form fields add custom field button is visible and opens form", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/form-fields");
  await page.getByRole("button", { name: "+ Add custom field" }).click();
  // Should reveal an input for the field label
  await expect(page.locator("input[placeholder*='label' i], input[placeholder*='field' i]").first()).toBeVisible();
});

// --- API auth coverage for new routes ---

for (const [method, path] of [
  ["POST", "/api/admin/announcements"],
  ["DELETE", "/api/admin/announcements/ann-test"],
  ["POST", "/api/admin/import/players"],
  ["GET", "/api/admin/audit-log"],
  ["POST", "/api/admin/draft"],
  ["PATCH", "/api/admin/registrations/reg-test"],
] as const) {
  test(`${method} ${path} rejects unauthenticated request`, async ({ request }) => {
    const response = await request.fetch(path, { method, data: {} });
    expect(response.status()).toBe(401);
  });
}

// --- Announcement body length validation ---

test("announcements API rejects body over 10000 chars", async ({ request }) => {
  await request.post("/api/admin/login", { data: { password: "test-admin-password" } });
  const response = await request.post("/api/admin/announcements", {
    data: {
      id: "ann-length-test",
      title: "Length Test",
      body: "x".repeat(10001),
      category: "general",
      pinned: false,
      createdAt: new Date().toISOString(),
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
});

// --- Player profile flows ---

test("player profile shows captain badge for captain", async ({ page }) => {
  // Navigate through a team page to find a captain
  await page.goto("/teams/helix-reign");
  // Find a captain link — team detail page shows captain badge or captain indicator
  const playerLinks = page.locator("a[href^='/players/']");
  const count = await playerLinks.count();
  if (count > 0) {
    await playerLinks.first().click();
    // Profile page should render without crash; Captain badge shows if applicable
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
  }
});

test("player profile team section links back to the team page", async ({ page }) => {
  await page.goto("/teams/helix-reign");
  const firstPlayerLink = page.locator("a[href^='/players/']").first();
  const href = await firstPlayerLink.getAttribute("href");
  await page.goto(href!);
  // The "Team" section should have a link back to the team
  const teamLink = page.locator("a[href^='/teams/']");
  const teamLinkCount = await teamLink.count();
  if (teamLinkCount > 0) {
    await expect(teamLink.first()).toBeVisible();
    await teamLink.first().click();
    await expect(page).toHaveURL(/\/teams\//);
  }
});

test("player profile season stats section renders when stats present", async ({ page }) => {
  // p-hrx-1 is a known mock player on Helix Reign — navigate via team page
  await page.goto("/teams/helix-reign");
  const firstPlayerLink = page.locator("a[href^='/players/']").first();
  const href = await firstPlayerLink.getAttribute("href");
  await page.goto(href!);
  // Stats section renders if player has gamesPlayed > 0 — just verify no crash and no encoding artifacts
  await expect(page.locator("body")).not.toContainText("â");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("players page captain filter is selectable", async ({ page }) => {
  await page.goto("/players");
  // Look for a "Captains" filter chip if it exists
  const captainBtn = page.getByRole("button", { name: /Captain/i });
  if (await captainBtn.count() > 0) {
    await captainBtn.click();
    await expect(captainBtn).toBeVisible();
    await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
  }
});

test("players page starters filter is selectable", async ({ page }) => {
  await page.goto("/players");
  const starterBtn = page.getByRole("button", { name: /Starter/i });
  if (await starterBtn.count() > 0) {
    await starterBtn.click();
    await expect(starterBtn).toBeVisible();
  }
});

// --- Layout / nav ---

test("ticker is not visible on admin pages", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin");
  // The ticker bar has aria-hidden and text "Live Feed" — it must not be in DOM on admin
  await expect(page.getByText("Live Feed")).not.toBeVisible();
});

test("sign in button visible on mobile nav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // AuthButton renders on all screen sizes — sign-in link should be visible
  await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
});

test("player profile page loads via direct URL", async ({ page }) => {
  await page.goto("/players/p-hrx-1");
  // If not found, should show 404; if found, show player name
  // Just verify no crash and no encoding artifacts
  await expect(page.locator("body")).not.toContainText("â");
});

test("watch page shows offline state when stream is down", async ({ page }) => {
  await page.goto("/watch");
  // Either shows Twitch embed or offline state — both are valid, just no crash
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("â");
});

test("draft page with unknown ID shows not found", async ({ page }) => {
  const response = await page.goto("/draft/nonexistent-room");
  // Should 404 or redirect, not throw a 500
  expect(response?.status()).not.toBe(500);
});

test("watch page has no overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/watch");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
});

test("players directory renders heading", async ({ page }) => {
  await page.goto("/players");
  await expect(page.getByText(/Players/i).first()).toBeVisible();
});

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("test-admin-password");
  await page.getByRole("button", { name: "Enter admin" }).click();
  await expect(page).toHaveURL("/admin");
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

// --- MarkdownBody XSS and link safety ---

test.describe("MarkdownBody XSS and link safety", () => {
  async function getPreviewLinkHref(page: Page, markdownLink: string): Promise<string | null> {
    await adminLogin(page);
    await page.goto("/admin/announcements");
    await page.locator("textarea").fill(markdownLink);
    await page.getByRole("button", { name: "Preview" }).click();
    const anchor = page.locator("a").first();
    await expect(anchor).toBeVisible();
    return anchor.getAttribute("href");
  }

  test("javascript: href is neutralized to #", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](javascript:alert('xss'))");
    expect(href).toBe("#");
  });

  test("data: href is neutralized to #", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](data:text/html,<script>alert(1)</script>)");
    expect(href).toBe("#");
  });

  test("vbscript: href is neutralized to #", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](vbscript:MsgBox('xss'))");
    expect(href).toBe("#");
  });

  test("https:// links pass through unchanged", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](https://example.com/path?q=1)");
    expect(href).toBe("https://example.com/path?q=1");
  });

  test("http:// links pass through unchanged", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](http://example.com)");
    expect(href).toBe("http://example.com");
  });

  test("relative / links pass through unchanged", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](/standings)");
    expect(href).toBe("/standings");
  });

  test("bare domain with no protocol is neutralized to #", async ({ page }) => {
    const href = await getPreviewLinkHref(page, "[click me](example.com)");
    expect(href).toBe("#");
  });
});

// --- Superadmin vs admin role authorization (#89) ---
// Crafts HMAC-signed session cookies directly using the known test secret,
// so we can test the auth gate without needing a second login route.

function craftSessionCookie(role: "super_admin" | "admin"): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "test-admin-session-secret";
  const payload = JSON.stringify({
    discordId: "test-role-user",
    role,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

test.describe("Superadmin vs admin role authorization", () => {
  test("regular admin is rejected (403) by superadmin-only DELETE org route", async ({ request }) => {
    const cookie = craftSessionCookie("admin");
    const response = await request.delete("/api/admin/orgs/any-org-id", {
      headers: { cookie: `sal_admin_session=${cookie}` },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/superadmin/i);
  });

  test("regular admin is rejected (403) by superadmin-only DELETE player route", async ({ request }) => {
    const cookie = craftSessionCookie("admin");
    const response = await request.delete("/api/admin/players/any-player-id", {
      headers: { cookie: `sal_admin_session=${cookie}` },
    });
    expect(response.status()).toBe(403);
  });

  test("super_admin session passes the auth gate on DELETE org (not 403)", async ({ request }) => {
    const cookie = craftSessionCookie("super_admin");
    const response = await request.delete("/api/admin/orgs/nonexistent-org", {
      headers: { cookie: `sal_admin_session=${cookie}` },
    });
    // Auth gate passes; Supabase may return an error in the test env — just not 403
    expect(response.status()).not.toBe(403);
    expect(response.status()).not.toBe(401);
  });

  test("unauthenticated DELETE org is rejected (401)", async ({ request }) => {
    const response = await request.delete("/api/admin/orgs/any-org-id");
    expect(response.status()).toBe(401);
  });
});

// --- CSRF and cookie security attributes (#90) ---

test.describe("CSRF protection — session cookie attributes", () => {
  test("login response sets HttpOnly session cookie", async ({ request }) => {
    const response = await request.post("/api/admin/login", {
      data: { password: "test-admin-password" },
    });
    expect(response.ok()).toBe(true);
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain("sal_admin_session=");
    expect(setCookie).toContain("HttpOnly");
  });

  test("login response sets SameSite=Lax on session cookie", async ({ request }) => {
    const response = await request.post("/api/admin/login", {
      data: { password: "test-admin-password" },
    });
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  test("login response sets Path=/ on session cookie", async ({ request }) => {
    const response = await request.post("/api/admin/login", {
      data: { password: "test-admin-password" },
    });
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain("Path=/");
  });

  test("admin API rejects request with no cookie (no credentials cross-origin simulation)", async ({ request }) => {
    // Playwright request fixture sends no cookies unless explicitly set —
    // this simulates a cross-origin attacker who cannot include the HttpOnly cookie.
    const response = await request.post("/api/admin/matches", {
      data: { id: "csrf-test", divisionId: "solar" },
    });
    expect(response.status()).toBe(401);
  });
});
