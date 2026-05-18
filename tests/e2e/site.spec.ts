import { expect, test, type Page } from "@playwright/test";

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
  for (const label of ["Division", "Home", "Away", "Status", "Date", "Time", "Week", "Score", "Stream URL", "VOD URL"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
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
  await expect(page.getByText("Save failed. Check Supabase env and admin session.")).toBeVisible();
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

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("test-admin-password");
  await page.getByRole("button", { name: "Enter admin" }).click();
  await expect(page).toHaveURL("/admin");
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
