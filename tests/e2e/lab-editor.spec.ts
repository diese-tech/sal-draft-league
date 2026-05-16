import { expect, test, type Locator, type Page } from "@playwright/test";

type ConfigValue = string | number | boolean;

type ControlCase = {
  section: string;
  label: string;
  path: string;
  value?: ConfigValue;
};

const sliderCases: Array<ControlCase & { value: number }> = [
  { section: "player-card-controls", label: "Card scale", path: "playerCard.cardScale", value: 1.25 },
  { section: "player-card-controls", label: "Card width", path: "playerCard.cardWidth", value: 420 },
  { section: "player-card-controls", label: "Card radius", path: "playerCard.cardRadius", value: 34 },
  { section: "player-card-controls", label: "Card padding", path: "playerCard.cardPadding", value: 30 },
  { section: "player-card-controls", label: "Banner height", path: "playerCard.bannerHeight", value: 160 },
  { section: "player-card-controls", label: "Avatar size", path: "playerCard.avatarSize", value: 92 },
  { section: "player-card-controls", label: "Tag size", path: "playerCard.tagSize", value: 17 },
  { section: "roster-slot-controls", label: "Slot height", path: "rosterSlot.slotHeight", value: 102 },
  { section: "roster-slot-controls", label: "Slot radius", path: "rosterSlot.slotRadius", value: 24 },
  { section: "roster-slot-controls", label: "Slot padding", path: "rosterSlot.slotPadding", value: 22 },
  { section: "roster-slot-controls", label: "Pick number size", path: "rosterSlot.pickNumberSize", value: 22 },
  { section: "roster-slot-controls", label: "Ghost opacity", path: "rosterSlot.ghostOpacity", value: 28 },
  { section: "roster-slot-controls", label: "Selected pulse strength", path: "rosterSlot.selectedPulseStrength", value: 92 },
  { section: "org-card-controls", label: "Org card scale", path: "orgCard.orgCardScale", value: 1.18 },
  { section: "org-card-controls", label: "Org card width", path: "orgCard.orgCardWidth", value: 500 },
  { section: "org-card-controls", label: "Org card radius", path: "orgCard.orgCardRadius", value: 38 },
  { section: "org-card-controls", label: "Org card padding", path: "orgCard.orgCardPadding", value: 32 },
  { section: "org-card-controls", label: "Org logo size", path: "orgCard.orgLogoSize", value: 88 },
  { section: "org-card-controls", label: "Header height", path: "orgCard.headerHeight", value: 160 },
  { section: "org-card-controls", label: "Active glow intensity", path: "orgCard.activeGlowIntensity", value: 86 },
  { section: "board-controls", label: "Active team index", path: "board.activeTeamIndex", value: 5 },
  { section: "board-controls", label: "Board max width", path: "board.boardMaxWidth", value: 1680 },
  { section: "board-controls", label: "Board gap", path: "board.boardGap", value: 34 },
  { section: "board-controls", label: "Row gap", path: "board.rowGap", value: 42 },
  { section: "board-controls", label: "Board scale", path: "board.boardScale", value: 1.12 },
  { section: "board-controls", label: "Inactive card opacity", path: "board.inactiveCardOpacity", value: 52 },
  { section: "board-controls", label: "Active card scale", path: "board.activeCardScale", value: 1.16 },
  { section: "theme-controls", label: "Global glow opacity", path: "theme.globalGlowOpacity", value: 88 },
  { section: "theme-controls", label: "Global glow blur", path: "theme.globalGlowBlur", value: 70 },
  { section: "theme-controls", label: "Border opacity", path: "theme.borderOpacity", value: 74 },
  { section: "theme-controls", label: "Background grid opacity", path: "theme.backgroundGridOpacity", value: 18 },
  { section: "theme-controls", label: "Background vignette strength", path: "theme.backgroundVignetteStrength", value: 88 },
  { section: "theme-controls", label: "Motion duration", path: "theme.motionDuration", value: 980 },
  { section: "theme-controls", label: "Hover lift", path: "theme.hoverLift", value: 15 },
  { section: "button-controls", label: "Button height", path: "button.buttonHeight", value: 60 },
  { section: "button-controls", label: "Button radius", path: "button.buttonRadius", value: 28 },
  { section: "button-controls", label: "Button padding-x", path: "button.buttonPaddingX", value: 30 },
  { section: "button-controls", label: "Button text size", path: "button.buttonTextSize", value: 17 },
  { section: "button-controls", label: "Button border opacity", path: "button.buttonBorderOpacity", value: 86 },
  { section: "button-controls", label: "Button glow opacity", path: "button.buttonGlowOpacity", value: 84 },
  { section: "button-controls", label: "Button glow blur", path: "button.buttonGlowBlur", value: 54 },
  { section: "button-controls", label: "Gradient blend intensity", path: "button.gradientBlendIntensity", value: 92 },
  { section: "button-controls", label: "Hover lift", path: "button.hoverLift", value: 10 },
  { section: "button-controls", label: "Press scale", path: "button.pressScale", value: 0.94 },
  { section: "button-controls", label: "Disabled opacity", path: "button.disabledOpacity", value: 72 },
];

const toggleCases: ControlCase[] = [
  { section: "player-card-controls", label: "Banner", path: "playerCard.showBanner" },
  { section: "player-card-controls", label: "Timezone", path: "playerCard.showTimezone" },
  { section: "player-card-controls", label: "Tags", path: "playerCard.showTags" },
  { section: "player-card-controls", label: "Discord username", path: "playerCard.showDiscordUsername" },
  { section: "player-card-controls", label: "Org/free agent badge", path: "playerCard.showOrgBadge" },
  { section: "roster-slot-controls", label: "Pick numbers", path: "rosterSlot.showPickNumbers" },
  { section: "roster-slot-controls", label: "Empty slots", path: "rosterSlot.showEmptySlots" },
  { section: "roster-slot-controls", label: "Ghost queue", path: "rosterSlot.showGhostQueue" },
  { section: "org-card-controls", label: "Captain locked slot", path: "orgCard.showCaptainLockedSlot" },
  { section: "org-card-controls", label: "Active state", path: "orgCard.activeState" },
  { section: "board-controls", label: "Recent picks widget", path: "board.showRecentPicksWidget" },
  { section: "board-controls", label: "Top banner", path: "board.showTopBanner" },
];

const selectCases: Array<ControlCase & { value: string }> = [
  { section: "theme-controls", label: "Theme", path: "theme.theme", value: "solar ember" },
  { section: "theme-controls", label: "Glow strength", path: "theme.glowStrength", value: "nuclear" },
  { section: "theme-controls", label: "Border strength", path: "theme.borderStrength", value: "bright" },
  { section: "theme-controls", label: "Corner style", path: "theme.cornerStyle", value: "pillowy" },
  { section: "theme-controls", label: "Background style", path: "theme.backgroundStyle", value: "smoke" },
  { section: "theme-controls", label: "Animation intensity", path: "theme.animationIntensity", value: "flashy" },
  { section: "theme-controls", label: "Spacing", path: "theme.spacing", value: "cinematic" },
  { section: "button-controls", label: "Button style", path: "button.buttonStyle", value: "neon" },
  { section: "button-controls", label: "Button shape", path: "button.buttonShape", value: "pillowy" },
  { section: "button-controls", label: "Primary intent", path: "button.primaryIntent", value: "purple" },
  { section: "button-controls", label: "Draft button intent", path: "button.draftButtonIntent", value: "white hot" },
  { section: "button-controls", label: "Hover effect", path: "button.hoverEffect", value: "scanline" },
  { section: "button-controls", label: "Press effect", path: "button.pressEffect", value: "flash" },
  { section: "button-controls", label: "Disabled style", path: "button.disabledStyle", value: "locked" },
  { section: "player-card-controls", label: "Density", path: "playerCard.density", value: "full" },
  { section: "roster-slot-controls", label: "Slot density", path: "rosterSlot.slotDensity", value: "compact" },
  { section: "roster-slot-controls", label: "Selected pulse", path: "rosterSlot.selectedSlotPulse", value: "strong" },
  { section: "org-card-controls", label: "Roster size", path: "orgCard.rosterSize", value: "8" },
  { section: "org-card-controls", label: "Header intensity", path: "orgCard.headerIntensity", value: "high" },
  { section: "board-controls", label: "Team count", path: "board.teamCount", value: "10" },
  { section: "board-controls", label: "Layout preset", path: "board.layoutPreset", value: "5-4" },
  { section: "board-controls", label: "View mode", path: "board.viewMode", value: "caster" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/lab/editor");
  await expect(page.getByRole("heading", { name: "Edit each design segment beside its preview." })).toBeVisible();
});

test("every slider number input updates the intended config value", async ({ page }) => {
  for (const item of sliderCases) {
    const control = controlLabel(page, item.section, item.label, "slider");
    await expect(control).toHaveCount(1);

    const before = await currentConfig(page);
    await control.locator("input[type='number']").fill(String(item.value));

    await expect.poll(() => configValue(page, item.path), { message: `${item.label} updates ${item.path}` }).toBe(item.value);
    expect(await currentConfig(page)).not.toEqual(before);
  }
});

test("every toggle flips the intended config value", async ({ page }) => {
  for (const item of toggleCases) {
    const control = controlLabel(page, item.section, item.label, "toggle");
    await expect(control).toHaveCount(1);

    const before = getPath(await currentConfig(page), item.path);
    await control.locator("input[type='checkbox']").click();

    await expect.poll(() => configValue(page, item.path), { message: `${item.label} flips ${item.path}` }).toBe(!before);
  }
});

test("every select applies the intended config value", async ({ page }) => {
  for (const item of selectCases) {
    const control = controlLabel(page, item.section, item.label, "select");
    await expect(control).toHaveCount(1);

    await control.locator("select").selectOption(item.value);
    const expected: ConfigValue = /^\d+$/.test(item.value) ? Number(item.value) : item.value;

    await expect.poll(() => configValue(page, item.path), { message: `${item.label} selects ${item.path}` }).toBe(expected);
  }
});

test("reset restores config, localStorage, and preview dimensions", async ({ page }) => {
  await setNumber(page, "player-card-controls", "Card width", 420);
  await expect.poll(() => configValue(page, "playerCard.cardWidth")).toBe(420);
  await expect.poll(() => profileCardWidth(page)).toBeGreaterThan(400);

  await page.getByTestId("reset-config").click();

  await expect.poll(() => configValue(page, "playerCard.cardWidth")).toBe(320);
  await expect.poll(() => profileCardWidth(page)).toBe(320);
  await expect(page.getByText("Reset to SAL defaults.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem("sal-lab-editor-config") ?? "{}").playerCard?.cardWidth))
    .toBe(320);
});

test("saved localStorage config loads only after the deterministic default render", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sal-lab-editor-config",
      JSON.stringify({
        playerCard: {
          cardWidth: 420,
        },
      }),
    );
  });

  await page.goto("/lab/editor");

  await expect.poll(() => configValue(page, "playerCard.cardWidth")).toBe(420);
  await expect(page.getByText("Restored saved local config.")).toBeVisible();
  expect(consoleErrors.filter((message) => message.toLowerCase().includes("hydration"))).toEqual([]);
});

test("json buttons copy, reject invalid import, and apply valid import", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const currentJson = await page.getByTestId("config-json").inputValue();
  await page.getByTestId("copy-json").click();
  await expect(page.getByText("Copied current config JSON.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText().then((value) => value.replace(/\r\n/g, "\n"))))
    .toBe(currentJson.replace(/\r\n/g, "\n"));

  await page.getByTestId("json-import").fill("{not json");
  await page.getByTestId("apply-json").click();
  await expect(page.getByText("That JSON is not valid SAL editor config.")).toBeVisible();

  const nextConfig = JSON.parse(currentJson);
  nextConfig.playerCard.cardWidth = 410;
  nextConfig.button.buttonHeight = 58;
  await page.getByTestId("json-import").fill(JSON.stringify(nextConfig));
  await page.getByTestId("apply-json").click();

  await expect.poll(() => configValue(page, "playerCard.cardWidth")).toBe(410);
  await expect.poll(() => configValue(page, "button.buttonHeight")).toBe(58);
  await expect(page.getByText("Imported config.")).toBeVisible();
});

test("preview action buttons render enabled and disabled states correctly", async ({ page }) => {
  for (const name of ["Primary", "Queue", "Draft / Lock Pick", "Notes", "Admin Override"]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeEnabled();
    await expect(button).toHaveCSS("cursor", "pointer");
    await button.click();
    await expect(page.getByTestId("button-action-result")).toContainText(`${name} button clicked.`);
  }

  await expect(page.getByTestId("button-action-result")).toContainText("Admin Override button clicked.");
  await expect(page.getByRole("button", { name: "Disabled" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Disabled" })).toHaveCSS("cursor", "not-allowed");
  await expect(page.getByTestId("reset-config")).toHaveCSS("cursor", "pointer");
  await expect(page.getByTestId("copy-json")).toHaveCSS("cursor", "pointer");
  await expect(page.getByTestId("apply-json")).toHaveCSS("cursor", "pointer");
});

test("editor and preview buttons show distinct pressed visual states", async ({ page }) => {
  const primary = page.getByRole("button", { name: "Primary" });
  await primary.hover();
  const primaryHover = await buttonVisualState(primary);
  await page.mouse.down();
  await expect.poll(() => buttonVisualState(primary)).not.toEqual(primaryHover);
  await page.mouse.up();

  for (const testId of ["reset-config", "copy-json", "apply-json"]) {
    const button = page.getByTestId(testId);
    await button.hover();
    const hover = await buttonVisualState(button);
    await page.mouse.down();
    await expect.poll(() => buttonVisualState(button), { message: `${testId} has a pressed state` }).not.toEqual(hover);
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).boxShadow), { message: `${testId} uses inset press shadow` }).toContain("inset");
    await page.mouse.up();
  }
});

test("editor page and card lab load without page-level horizontal overflow", async ({ page }) => {
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
  await expect.poll(() => previewTargetsWithHorizontalOverflow(page)).toEqual([]);

  await page.goto("/lab/cards");
  await expect(page.getByRole("heading", { name: "Discord-native draft identity for SAL." })).toBeVisible();
  await expect.poll(() => hasHorizontalOverflow(page)).toBe(false);
});

test("editor previews do not create internal horizontal scrollbars across screen ratios", async ({ page }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1080 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/lab/editor");
    await applyStressConfig(page);

    await expect.poll(() => hasHorizontalOverflow(page), { message: `${viewport.width}x${viewport.height} page overflow` }).toBe(false);
    await expect
      .poll(() => previewTargetsWithHorizontalOverflow(page), { message: `${viewport.width}x${viewport.height} preview overflow` })
      .toEqual([]);
  }
});

async function setNumber(page: Page, section: string, label: string, value: number) {
  await controlLabel(page, section, label, "slider").locator("input[type='number']").fill(String(value));
}

function controlLabel(page: Page, section: string, label: string, kind: "slider" | "toggle" | "select") {
  return page
    .getByTestId(`controls-${section}`)
    .locator(`label[data-control-kind='${kind}'][data-control-label='${label}']`);
}

async function currentConfig(page: Page) {
  return JSON.parse(await page.getByTestId("config-json").inputValue()) as Record<string, unknown>;
}

async function configValue(page: Page, path: string) {
  return getPath(await currentConfig(page), path);
}

async function buttonVisualState(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      scale: style.scale,
      translate: style.translate,
      filter: style.filter,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
    };
  });
}

function getPath(value: unknown, path: string): ConfigValue {
  return path.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], value) as ConfigValue;
}

async function profileCardWidth(page: Page) {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll("h3")]
      .find((element) => element.textContent?.includes("VexByte"))
      ?.closest("div[class*='group']");

    return Math.round(card?.getBoundingClientRect().width ?? 0);
  });
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

async function previewTargetsWithHorizontalOverflow(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="preview-target"]')]
      .map((element, index) => ({
        index,
        label: element.querySelector("p")?.textContent ?? `Preview ${index}`,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }))
      .filter((entry) => entry.scrollWidth > entry.clientWidth + 1),
  );
}

async function applyStressConfig(page: Page) {
  const config = await currentConfig(page);

  const nextConfig = {
    ...config,
    playerCard: {
      ...(config.playerCard as Record<string, unknown>),
      density: "full",
      showBanner: true,
      showTimezone: true,
      showTags: true,
      showDiscordUsername: true,
      showOrgBadge: true,
      cardScale: 1.35,
      cardWidth: 420,
      cardRadius: 40,
      cardPadding: 32,
      bannerHeight: 180,
      avatarSize: 96,
      tagSize: 18,
    },
    rosterSlot: {
      ...(config.rosterSlot as Record<string, unknown>),
      showPickNumbers: true,
      showEmptySlots: true,
      showGhostQueue: true,
      slotDensity: "standard",
      selectedSlotPulse: "strong",
      slotHeight: 110,
      slotRadius: 28,
      slotPadding: 24,
      pickNumberSize: 24,
      ghostOpacity: 80,
      selectedPulseStrength: 100,
    },
    orgCard: {
      ...(config.orgCard as Record<string, unknown>),
      rosterSize: 8,
      showCaptainLockedSlot: true,
      activeState: true,
      headerIntensity: "high",
      orgCardScale: 1.25,
      orgCardWidth: 520,
      orgCardRadius: 44,
      orgCardPadding: 36,
      orgLogoSize: 96,
      headerHeight: 180,
      activeGlowIntensity: 100,
    },
    board: {
      ...(config.board as Record<string, unknown>),
      teamCount: 10,
      layoutPreset: "5-4",
      activeTeamIndex: 9,
      viewMode: "caster",
      showRecentPicksWidget: true,
      showTopBanner: true,
      boardMaxWidth: 1800,
      boardGap: 40,
      rowGap: 48,
      boardScale: 1,
      inactiveCardOpacity: 45,
      activeCardScale: 1,
    },
    theme: {
      ...(config.theme as Record<string, unknown>),
      theme: "solar ember",
      glowStrength: "nuclear",
      borderStrength: "bright",
      cornerStyle: "pillowy",
      backgroundStyle: "smoke",
      animationIntensity: "flashy",
      spacing: "cinematic",
      globalGlowOpacity: 100,
      globalGlowBlur: 80,
      borderOpacity: 100,
      backgroundGridOpacity: 100,
      backgroundVignetteStrength: 100,
      motionDuration: 1200,
      hoverLift: 18,
    },
    button: {
      ...(config.button as Record<string, unknown>),
      buttonStyle: "neon",
      buttonShape: "pillowy",
      primaryIntent: "purple",
      draftButtonIntent: "white hot",
      hoverEffect: "scanline",
      pressEffect: "flash",
      disabledStyle: "locked",
      buttonHeight: 64,
      buttonRadius: 32,
      buttonPaddingX: 32,
      buttonTextSize: 18,
      buttonBorderOpacity: 100,
      buttonGlowOpacity: 100,
      buttonGlowBlur: 60,
      gradientBlendIntensity: 100,
      hoverLift: 12,
      pressScale: 0.92,
      disabledOpacity: 80,
    },
  };

  await page.getByTestId("json-import").fill(JSON.stringify(nextConfig));
  await page.getByTestId("apply-json").click();
  await expect.poll(() => configValue(page, "playerCard.cardWidth")).toBe(420);
  await expect.poll(() => configValue(page, "board.teamCount")).toBe(10);
}
