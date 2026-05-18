/**
 * Canvas clipping regression suite.
 *
 * Every test here verifies that org roster cards are not clipped by the
 * canvas container's overflow:hidden boundary in any combination of canvas
 * size, view mode, and editor config.
 *
 * Detection mechanism: getBoundingClientRect() reports the actual visual
 * position of an element in the viewport regardless of whether it is hidden
 * by a parent's overflow:hidden. If the last card's bottom > canvas bottom,
 * the card is being clipped.
 *
 * Tests intentionally fail before the DOM-measurement refactor of
 * BoardCanvas.tsx so that the suite acts as a regression guard.
 */

import { expect, test, type Page } from "@playwright/test";

// ─── Types ───────────────────────────────────────────────────────────────────

type CanvasSize = "1920x1080" | "1280x720";
type ViewMode = "spectator" | "captain" | "caster";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openEditor(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/lab/editor");
  await expect(
    page.getByRole("heading", { name: "Edit each design segment beside its preview." }),
  ).toBeVisible();
}

async function switchToCanvas(page: Page, size: CanvasSize) {
  await page.getByRole("button", { name: size }).click();
  await expect(page.getByTestId("sal-canvas")).toBeVisible();
  // Wait for scale to stabilise (ResizeObserver + state settle)
  await page.waitForTimeout(200);
}

async function setViewMode(page: Page, mode: ViewMode) {
  await page
    .locator('[data-testid="controls-board-controls"] label[data-control-label="View mode"] select')
    .selectOption(mode);
  await page.waitForTimeout(100);
}

async function applyConfig(page: Page, patch: Record<string, unknown>) {
  const raw = await page.getByTestId("config-json").inputValue();
  const config = JSON.parse(raw) as Record<string, Record<string, unknown>>;
  for (const [section, values] of Object.entries(patch)) {
    config[section] = { ...config[section], ...values };
  }
  await page.getByTestId("json-import").fill(JSON.stringify(config));
  await page.getByTestId("apply-json").click();
  await page.waitForTimeout(150);
}

/**
 * Returns the amount by which the last org card extends below the canvas
 * container. A positive value means the card is clipped; 0 or negative means
 * it fits. The 2px tolerance accounts for subpixel rounding.
 */
async function cardOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="sal-canvas"]');
    if (!canvas) return -1;

    const cards = canvas.querySelectorAll('[data-testid="org-roster-card"]');
    if (cards.length === 0) return -1;

    const canvasBottom = canvas.getBoundingClientRect().bottom;
    let maxCardBottom = -Infinity;
    for (const card of cards) {
      const b = card.getBoundingClientRect().bottom;
      if (b > maxCardBottom) maxCardBottom = b;
    }
    return maxCardBottom - canvasBottom;
  });
}

async function assertNoClipping(page: Page, context = "") {
  const overflow = await cardOverflow(page);
  expect(overflow, `Cards overflow canvas by ${overflow}px${context ? ` (${context})` : ""}`).toBeLessThanOrEqual(2);
}

/** Also check the active (highlighted) card's top edge doesn't clip. */
async function assertNoTopClipping(page: Page, context = "") {
  const topOverflow = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="sal-canvas"]');
    if (!canvas) return -1;
    const cards = canvas.querySelectorAll('[data-testid="org-roster-card"]');
    if (cards.length === 0) return -1;
    const canvasTop = canvas.getBoundingClientRect().top;
    let minCardTop = Infinity;
    for (const card of cards) {
      const t = card.getBoundingClientRect().top;
      if (t < minCardTop) minCardTop = t;
    }
    return canvasTop - minCardTop; // positive = clipped above
  });
  expect(topOverflow, `Cards overflow canvas top by ${topOverflow}px${context ? ` (${context})` : ""}`).toBeLessThanOrEqual(2);
}

async function assertNoHorizontalClipping(page: Page, context = "") {
  const overflow = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="sal-canvas"]');
    if (!canvas) return -1;
    const cards = canvas.querySelectorAll('[data-testid="org-roster-card"]');
    if (cards.length === 0) return -1;
    const canvasRight = canvas.getBoundingClientRect().right;
    let maxRight = -Infinity;
    for (const card of cards) {
      const r = card.getBoundingClientRect().right;
      if (r > maxRight) maxRight = r;
    }
    return maxRight - canvasRight;
  });
  expect(overflow, `Cards overflow canvas right edge by ${overflow}px${context ? ` (${context})` : ""}`).toBeLessThanOrEqual(2);
}

// ─── Config presets ───────────────────────────────────────────────────────────

const ROSTER_SIZE_8 = { orgCard: { rosterSize: 8 } };
const ROSTER_SIZE_7 = { orgCard: { rosterSize: 7 } };
const TOP_BANNER = { board: { showTopBanner: true } };
const NO_BANNER = { board: { showTopBanner: false } };
const CAPTAIN_SLOT = { orgCard: { showCaptainLockedSlot: true } };
const NO_CAPTAIN_SLOT = { orgCard: { showCaptainLockedSlot: false } };
const PICKS_OFF = { board: { showRecentPicksWidget: false } };
const PICKS_ON = { board: { showRecentPicksWidget: true } };
const ACTIVE_SCALE_110 = { board: { activeCardScale: 1.1 } };
const ACTIVE_SCALE_107 = { board: { activeCardScale: 1.07 } };
const TEN_TEAMS_5_4 = { board: { teamCount: 10, layoutPreset: "5-4" } };
const TEN_TEAMS_BALANCED = { board: { teamCount: 10, layoutPreset: "balanced" } };
const SIX_TEAMS = { board: { teamCount: 6, layoutPreset: "balanced" } };
const LARGE_HEADER = { orgCard: { headerHeight: 160 } };
const LARGE_PADDING = { orgCard: { orgCardPadding: 32 } };
const TALL_SLOTS = { rosterSlot: { slotHeight: 90, slotPadding: 14 } };

const COMBINED_STRESS = {
  orgCard: { rosterSize: 8, showCaptainLockedSlot: true, headerHeight: 120 },
  board: { showTopBanner: true, activeCardScale: 1.1 },
  rosterSlot: { slotHeight: 80 },
};

const FULL_STRESS = {
  orgCard: {
    rosterSize: 8,
    showCaptainLockedSlot: true,
    headerIntensity: "high",
    orgCardScale: 1.1,
    orgCardWidth: 480,
    orgCardPadding: 28,
    orgLogoSize: 80,
    headerHeight: 140,
    activeGlowIntensity: 100,
  },
  rosterSlot: {
    showPickNumbers: true,
    showEmptySlots: true,
    showGhostQueue: true,
    slotHeight: 80,
    slotPadding: 12,
  },
  board: {
    teamCount: 10,
    layoutPreset: "5-4",
    showTopBanner: true,
    showRecentPicksWidget: true,
    activeCardScale: 1.08,
    rowGap: 24,
    boardGap: 20,
  },
};

// ─── Canvas sizes and view modes to iterate ───────────────────────────────────

const CANVAS_SIZES: CanvasSize[] = ["1920x1080", "1280x720"];
const VIEW_MODES: ViewMode[] = ["spectator", "captain", "caster"];

// ─── Suite ────────────────────────────────────────────────────────────────────

// ── Group 1: Base regression — default config, all 6 combos ──────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] default config — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `default config`);
    });
  }
}

// ── Group 2: Top banner stress ────────────────────────────────────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] top banner on — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, TOP_BANNER);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `showTopBanner:true`);
    });
  }
}

// ── Group 3: Large roster (rosterSize: 8) ─────────────────────────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] rosterSize:8 — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, ROSTER_SIZE_8);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `rosterSize:8`);
    });
  }
}

// ── Group 4: Captain locked slot ──────────────────────────────────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] captainLockedSlot on — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, CAPTAIN_SLOT);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `showCaptainLockedSlot:true`);
    });
  }
}

// ── Group 5: Active card scale stress ─────────────────────────────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] activeCardScale:1.1 — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, ACTIVE_SCALE_110);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `activeCardScale:1.1`);
    });

    test(`[${size}][${mode}] activeCardScale:1.1 — no top clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, ACTIVE_SCALE_110);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoTopClipping(page, `activeCardScale:1.1`);
    });
  }
}

// ── Group 6: Multi-row layout (10 teams, 5-4 preset = 3 rows) ────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] 10 teams 5-4 layout — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, TEN_TEAMS_5_4);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `teamCount:10 layoutPreset:5-4`);
    });
  }
}

// ── Group 7: Combined stress (banner + rosterSize:8 + captain slot + scale) ───

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] combined stress — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, COMBINED_STRESS);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `combined stress`);
    });
  }
}

// ── Group 8: Full stress (maximum plausible config) ───────────────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] full stress config — no bottom clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, FULL_STRESS);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoClipping(page, `full stress`);
    });
  }
}

// ── Group 9: Width fitting — no horizontal overflow in canvas ─────────────────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] default config — no horizontal overflow`, async ({ page }) => {
      await openEditor(page);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);
      await assertNoHorizontalClipping(page, `default`);
    });
  }
}

for (const size of CANVAS_SIZES) {
  test(`[${size}] orgCardScale:1.25 — no horizontal overflow`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, { orgCard: { orgCardScale: 1.25, orgCardWidth: 520 } });
    await switchToCanvas(page, size);
    await assertNoHorizontalClipping(page, `orgCardScale:1.25`);
  });

  test(`[${size}] 10 teams balanced — no horizontal overflow`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, TEN_TEAMS_BALANCED);
    await switchToCanvas(page, size);
    await assertNoHorizontalClipping(page, `10 teams balanced`);
  });
}

// ── Group 10: Top clipping — active card doesn't clip above canvas ────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] activeCardScale:1.04 default — no top clipping`, async ({ page }) => {
    await openEditor(page);
    await switchToCanvas(page, size);
    await assertNoTopClipping(page, `activeCardScale:1.04`);
  });

  test(`[${size}] activeCardScale:1.07 — no top clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, ACTIVE_SCALE_107);
    await switchToCanvas(page, size);
    await assertNoTopClipping(page, `activeCardScale:1.07`);
  });
}

// ── Group 11: Live toggle — banner on/off while already in canvas ─────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] toggling banner on updates height — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, NO_BANNER);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `banner off`);

    // Now turn it on while still in canvas mode
    // Re-apply via JSON to avoid control interaction with canvas visible
    await applyConfig(page, TOP_BANNER);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `banner toggled on`);
  });

  test(`[${size}] toggling banner off updates height — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, TOP_BANNER);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `banner on`);

    await applyConfig(page, NO_BANNER);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `banner toggled off`);
  });
}

// ── Group 12: Live toggle — picks widget on/off ───────────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] toggling picks widget on — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, PICKS_OFF);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `picks off`);

    await applyConfig(page, PICKS_ON);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `picks toggled on`);
  });

  test(`[${size}] toggling picks widget off — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, PICKS_ON);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `picks on`);

    await applyConfig(page, PICKS_OFF);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `picks toggled off`);
  });
}

// ── Group 13: Live view mode switches while in canvas ─────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] switching spectator → captain → caster — no clipping`, async ({ page }) => {
    await openEditor(page);
    await setViewMode(page, "spectator");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `spectator`);

    await applyConfig(page, { board: { viewMode: "captain" } });
    await page.waitForTimeout(200);
    await assertNoClipping(page, `captain (after switch)`);

    await applyConfig(page, { board: { viewMode: "caster" } });
    await page.waitForTimeout(200);
    await assertNoClipping(page, `caster (after switch)`);
  });

  test(`[${size}] switching caster → spectator — no clipping`, async ({ page }) => {
    await openEditor(page);
    await setViewMode(page, "caster");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `caster`);

    await applyConfig(page, { board: { viewMode: "spectator" } });
    await page.waitForTimeout(200);
    await assertNoClipping(page, `spectator (after switch)`);
  });
}

// ── Group 14: Live rosterSize change in canvas ────────────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] rosterSize 6 → 8 while in canvas — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, { orgCard: { rosterSize: 6 } });
    await switchToCanvas(page, size);
    await assertNoClipping(page, `rosterSize:6`);

    await applyConfig(page, ROSTER_SIZE_8);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `rosterSize:8 (after change)`);
  });

  test(`[${size}] rosterSize 8 → 6 while in canvas — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, ROSTER_SIZE_8);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `rosterSize:8`);

    await applyConfig(page, { orgCard: { rosterSize: 6 } });
    await page.waitForTimeout(200);
    await assertNoClipping(page, `rosterSize:6 (after change)`);
  });
}

// ── Group 15: Live teamCount change in canvas ─────────────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] teamCount 8 → 10 while in canvas — no clipping`, async ({ page }) => {
    await openEditor(page);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `teamCount:8 default`);

    await applyConfig(page, TEN_TEAMS_5_4);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `teamCount:10 (after change)`);
  });

  test(`[${size}] teamCount 10 → 6 while in canvas — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, TEN_TEAMS_5_4);
    await switchToCanvas(page, size);
    await assertNoClipping(page, `teamCount:10`);

    await applyConfig(page, SIX_TEAMS);
    await page.waitForTimeout(200);
    await assertNoClipping(page, `teamCount:6 (after change)`);
  });
}

// ── Group 16: rosterSize × teamCount matrix (spectator, both sizes) ───────────

const ROSTER_SIZES = [6, 7, 8] as const;
const TEAM_COUNTS = [6, 8, 10] as const;

for (const rosterSize of ROSTER_SIZES) {
  for (const teamCount of TEAM_COUNTS) {
    for (const size of CANVAS_SIZES) {
      test(`[${size}][spectator] rosterSize:${rosterSize} × teamCount:${teamCount} — no clipping`, async ({ page }) => {
        await openEditor(page);
        await applyConfig(page, {
          orgCard: { rosterSize },
          board: { teamCount, layoutPreset: "balanced" },
        });
        await setViewMode(page, "spectator");
        await switchToCanvas(page, size);
        await assertNoClipping(page, `rosterSize:${rosterSize} teamCount:${teamCount}`);
      });
    }
  }
}

// ── Group 17: rosterSize × banner on/off (1920x1080 spectator) ───────────────

for (const rosterSize of ROSTER_SIZES) {
  for (const showTopBanner of [true, false]) {
    test(`[1920x1080][spectator] rosterSize:${rosterSize} banner:${showTopBanner} — no clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, {
        orgCard: { rosterSize },
        board: { showTopBanner },
      });
      await setViewMode(page, "spectator");
      await switchToCanvas(page, "1920x1080");
      await assertNoClipping(page, `rosterSize:${rosterSize} banner:${showTopBanner}`);
    });
  }
}

// ── Group 18: Slot height variations ─────────────────────────────────────────

const SLOT_HEIGHTS = [56, 72, 90, 110] as const;

for (const slotHeight of SLOT_HEIGHTS) {
  for (const size of CANVAS_SIZES) {
    test(`[${size}][spectator] slotHeight:${slotHeight} rosterSize:8 — no clipping`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, {
        orgCard: { rosterSize: 8 },
        rosterSlot: { slotHeight },
      });
      await setViewMode(page, "spectator");
      await switchToCanvas(page, size);
      await assertNoClipping(page, `slotHeight:${slotHeight} rosterSize:8`);
    });
  }
}

// ── Group 19: Header height variations ───────────────────────────────────────

const HEADER_HEIGHTS = [72, 92, 120, 160] as const;

for (const headerHeight of HEADER_HEIGHTS) {
  test(`[1920x1080][spectator] headerHeight:${headerHeight} rosterSize:8 — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, {
      orgCard: { rosterSize: 8, headerHeight },
    });
    await setViewMode(page, "spectator");
    await switchToCanvas(page, "1920x1080");
    await assertNoClipping(page, `headerHeight:${headerHeight}`);
  });
}

// ── Group 20: Canvas card count (all cards present after switching modes) ─────

for (const size of CANVAS_SIZES) {
  for (const mode of VIEW_MODES) {
    test(`[${size}][${mode}] default config — all ${mode === "spectator" || mode === "caster" ? 8 : 8} team cards render`, async ({ page }) => {
      await openEditor(page);
      await setViewMode(page, mode);
      await switchToCanvas(page, size);

      const cardCount = await page
        .locator('[data-testid="sal-canvas"] [data-testid="org-roster-card"]')
        .count();
      // Default is 8 teams — all should be rendered
      expect(cardCount).toBe(8);
    });
  }
}

// ── Group 21: Large padding variations ────────────────────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}][spectator] large orgCardPadding — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, {
      ...ROSTER_SIZE_8,
      ...LARGE_PADDING,
    });
    await setViewMode(page, "spectator");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `orgCardPadding:32 rosterSize:8`);
  });

  test(`[${size}][spectator] large header + large padding — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, {
      ...ROSTER_SIZE_8,
      ...LARGE_HEADER,
      ...LARGE_PADDING,
    });
    await setViewMode(page, "spectator");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `headerHeight:160 orgCardPadding:32 rosterSize:8`);
  });
}

// ── Group 22: Tall slots with large roster ────────────────────────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}][spectator] tall slots rosterSize:8 — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, { ...ROSTER_SIZE_8, ...TALL_SLOTS });
    await setViewMode(page, "spectator");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `slotHeight:90 slotPadding:14 rosterSize:8`);
  });

  test(`[${size}][spectator] tall slots + banner + rosterSize:8 — no clipping`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, { ...ROSTER_SIZE_8, ...TALL_SLOTS, ...TOP_BANNER });
    await setViewMode(page, "spectator");
    await switchToCanvas(page, size);
    await assertNoClipping(page, `slotHeight:90 rosterSize:8 banner:true`);
  });
}

// ── Group 23: Canvas scale readout is non-zero after switch ───────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}] canvas scale label shows non-zero percentage`, async ({ page }) => {
    await openEditor(page);
    await switchToCanvas(page, size);

    const scaleLabel = page.locator(`text=/Scale \\d+%/`).first();
    await expect(scaleLabel).toBeVisible();

    const text = await scaleLabel.textContent();
    const match = text?.match(/Scale (\d+)%/);
    expect(match).not.toBeNull();
    const pct = parseInt(match![1], 10);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });
}

// ── Group 24: Switching back to editor preview doesn't break anything ─────────

test("editor preview renders correctly after returning from 1920x1080 canvas", async ({ page }) => {
  await openEditor(page);
  await switchToCanvas(page, "1920x1080");
  await expect(page.getByTestId("sal-canvas")).toBeVisible();

  await page.getByRole("button", { name: "Editor" }).click();
  await expect(page.getByTestId("sal-canvas")).not.toBeVisible();
  // Board preview should still render org cards
  await expect(page.locator('[data-testid="org-roster-card"]').first()).toBeVisible();
});

test("editor preview renders correctly after returning from 1280x720 canvas", async ({ page }) => {
  await openEditor(page);
  await switchToCanvas(page, "1280x720");

  await page.getByRole("button", { name: "Editor" }).click();
  await expect(page.locator('[data-testid="org-roster-card"]').first()).toBeVisible();
});

// ── Group 25: Ghost queue cards visible in captain canvas mode ────────────────

for (const size of CANVAS_SIZES) {
  test(`[${size}][captain] ghost queue cards are visible in canvas`, async ({ page }) => {
    await openEditor(page);
    await applyConfig(page, { board: { viewMode: "captain" } });
    await switchToCanvas(page, size);

    // Ghost queue container is inside the canvas
    const ghostContainer = page.locator('[data-testid="sal-canvas"] .grid.grid-cols-2').first();
    await expect(ghostContainer).toBeVisible();
  });
}

// ── Group 26: Recent picks widget visible in spectator/caster canvas ──────────

for (const size of CANVAS_SIZES) {
  for (const mode of ["spectator", "caster"] as ViewMode[]) {
    test(`[${size}][${mode}] recent picks widget visible when enabled`, async ({ page }) => {
      await openEditor(page);
      await applyConfig(page, { board: { viewMode: mode, showRecentPicksWidget: true } });
      await switchToCanvas(page, size);

      // Recent picks: grid inside canvas below the board
      const canvas = page.getByTestId("sal-canvas");
      await expect(canvas).toBeVisible();

      // The picks widget contains "Recent pick" text labels
      const pickLabel = canvas.locator('text=/Recent pick/').first();
      await expect(pickLabel).toBeVisible();
    });
  }
}
