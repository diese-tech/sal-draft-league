import { labEditorDefaults } from "@/data/lab-editor-defaults";
import { orgRosters } from "@/data/mock-card-lab";
import type {
  AnimationIntensity,
  BorderStrength,
  CornerStyle,
  GlowStrength,
  LabEditorConfig,
  LayoutPreset,
} from "@/types/lab-editor";
import type { OrgRoster } from "@/types/card-lab";

const storageKey = "sal-lab-editor-config";

// ─── Preset → fine-grain mappers ─────────────────────────────────────────────

export function getGlowPreset(strength: GlowStrength) {
  const map: Record<GlowStrength, { globalGlowOpacity: number; globalGlowBlur: number }> = {
    none:    { globalGlowOpacity: 0,  globalGlowBlur: 0  },
    low:     { globalGlowOpacity: 20, globalGlowBlur: 18 },
    medium:  { globalGlowOpacity: 45, globalGlowBlur: 36 },
    high:    { globalGlowOpacity: 70, globalGlowBlur: 56 },
    nuclear: { globalGlowOpacity: 90, globalGlowBlur: 72 },
  };
  return map[strength];
}

export function getBorderPreset(strength: BorderStrength) {
  const map: Record<BorderStrength, { borderOpacity: number }> = {
    none:   { borderOpacity: 0  },
    subtle: { borderOpacity: 10 },
    clear:  { borderOpacity: 22 },
    bright: { borderOpacity: 55 },
  };
  return map[strength];
}

export function getMotionPreset(intensity: AnimationIntensity) {
  const map: Record<AnimationIntensity, { motionDuration: number; hoverLift: number }> = {
    none:   { motionDuration: 0,   hoverLift: 0  },
    subtle: { motionDuration: 200, hoverLift: 2  },
    medium: { motionDuration: 300, hoverLift: 4  },
    flashy: { motionDuration: 600, hoverLift: 10 },
  };
  return map[intensity];
}

export function getCornerStylePresets(style: CornerStyle) {
  if (style === "sharp")   return { cardRadius: 6, orgCardRadius: 8, slotRadius: 4, buttonRadius: 6 };
  if (style === "pillowy") return { cardRadius: 32, orgCardRadius: 32, slotRadius: 20, buttonRadius: 28 };
  return { cardRadius: 20, orgCardRadius: 20, slotRadius: 12, buttonRadius: 14 };
}

// ─── Board layout ─────────────────────────────────────────────────────────────

export function getBoardRows(teamCount: number, layoutPreset: LayoutPreset): number[] {
  if (layoutPreset === "4-4") {
    const rows: number[] = [];
    let rem = teamCount;
    while (rem > 0) { rows.push(Math.min(4, rem)); rem -= 4; }
    return rows;
  }
  if (layoutPreset === "5-4") {
    if (teamCount <= 5) return [teamCount];
    if (teamCount <= 9) return [5, teamCount - 5];
    return [5, 5];
  }
  if (layoutPreset === "4-5") {
    if (teamCount <= 4) return [teamCount];
    if (teamCount <= 9) return [4, teamCount - 4];
    return [5, 5];
  }
  // balanced
  if (teamCount <= 5) return [teamCount];
  if (teamCount === 6) return [3, 3];
  if (teamCount === 7) return [4, 3];
  if (teamCount === 8) return [4, 4];
  if (teamCount === 9) return [5, 4];
  return [5, 5];
}

export function sliceBoardRows(
  orgs: OrgRoster[],
  teamCount: number,
  layoutPreset: LayoutPreset,
): Array<{ orgs: OrgRoster[]; startIndex: number }> {
  const rows = getBoardRows(teamCount, layoutPreset);
  const result: Array<{ orgs: OrgRoster[]; startIndex: number }> = [];
  let offset = 0;
  for (const count of rows) {
    result.push({ orgs: orgs.slice(offset, offset + count), startIndex: offset });
    offset += count;
  }
  return result;
}

export function buildBoardOrgs(config: LabEditorConfig): OrgRoster[] {
  return Array.from({ length: config.board.teamCount }, (_, index) => {
    const base = orgRosters[index % orgRosters.length];
    return {
      ...base,
      id: `${base.id}-${index}`,
      name: index < orgRosters.length ? base.name : `${base.name} ${index + 1}`,
      draftPosition: index + 1,
      state: index === config.board.activeTeamIndex ? "active" : "inactive",
    };
  });
}

// ─── Theme helpers ────────────────────────────────────────────────────────────

export function getThemeRadius(config: LabEditorConfig) {
  if (config.theme.cornerStyle === "sharp")   return 8;
  if (config.theme.cornerStyle === "pillowy") return 28;
  return 18;
}

export function getThemeClass(config: LabEditorConfig) {
  if (config.theme.theme === "purple plasma")
    return "bg-[radial-gradient(circle_at_20%_0%,rgba(217,70,239,0.2),transparent_30rem),linear-gradient(135deg,#05030a,#111027_55%,#05030a)]";
  if (config.theme.theme === "solar ember")
    return "bg-[radial-gradient(circle_at_25%_0%,rgba(251,146,60,0.2),transparent_30rem),linear-gradient(135deg,#080604,#17100b_55%,#050505)]";
  if (config.theme.theme === "dark temple")
    return "bg-[linear-gradient(135deg,#020305,#090d14_55%,#020305)]";
  return "bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.16),transparent_30rem),linear-gradient(135deg,#05070d,#08111f_55%,#05070d)]";
}

export function getPreviewPanelGapClass(config: LabEditorConfig) {
  if (config.theme.spacing === "compact")   return "gap-3";
  if (config.theme.spacing === "cinematic") return "gap-8";
  return "gap-5";
}

// ─── Config merge with numeric clamping ──────────────────────────────────────

function clamp(v: unknown, min: number, max: number): number {
  return typeof v === "number" ? Math.min(max, Math.max(min, v)) : min;
}

function clampNumericFields<T extends Record<string, unknown>>(
  section: T,
  bounds: Partial<Record<keyof T, [number, number]>>,
): T {
  const result = { ...section };
  for (const key in bounds) {
    const range = bounds[key];
    if (range && typeof result[key] === "number") {
      (result as Record<string, unknown>)[key] = clamp(result[key], range[0], range[1]);
    }
  }
  return result;
}

export function mergeConfig(value: unknown): LabEditorConfig {
  const next = value as Partial<LabEditorConfig>;
  const merged = {
    playerCard: { ...labEditorDefaults.playerCard, ...(next.playerCard ?? {}) },
    rosterSlot: { ...labEditorDefaults.rosterSlot, ...(next.rosterSlot ?? {}) },
    orgCard:    { ...labEditorDefaults.orgCard,    ...(next.orgCard ?? {})    },
    board:      { ...labEditorDefaults.board,      ...(next.board ?? {})      },
    theme:      { ...labEditorDefaults.theme,      ...(next.theme ?? {})      },
    button:     { ...labEditorDefaults.button,     ...(next.button ?? {})     },
    ghostQueue: { ...labEditorDefaults.ghostQueue, ...(next.ghostQueue ?? {}) },
  };

  merged.playerCard = clampNumericFields(merged.playerCard, {
    cardScale: [0.75, 1.35], cardWidth: [220, 420], cardRadius: [4, 40],
    cardPadding: [8, 32], bannerHeight: [40, 180], avatarSize: [32, 96], tagSize: [10, 18],
  });
  merged.rosterSlot = clampNumericFields(merged.rosterSlot, {
    slotHeight: [38, 110], slotRadius: [4, 28], slotPadding: [6, 24],
    pickNumberSize: [10, 24], ghostOpacity: [10, 80], selectedPulseStrength: [0, 100],
  });
  merged.orgCard = clampNumericFields(merged.orgCard, {
    orgCardScale: [0.75, 1.25], orgCardWidth: [260, 520], orgCardRadius: [8, 44],
    orgCardPadding: [10, 36], orgLogoSize: [32, 96], headerHeight: [70, 180],
    activeGlowIntensity: [0, 100],
  });
  merged.board = clampNumericFields(merged.board, {
    boardMaxWidth: [900, 1800], boardGap: [8, 40], rowGap: [8, 48],
    boardScale: [0.7, 1.2], inactiveCardOpacity: [45, 100], activeCardScale: [1, 1.2],
  });
  merged.theme = clampNumericFields(merged.theme, {
    globalGlowOpacity: [0, 100], globalGlowBlur: [0, 80], borderOpacity: [0, 100],
    backgroundGridOpacity: [0, 100], backgroundVignetteStrength: [0, 100],
    motionDuration: [80, 1200], hoverLift: [0, 18],
  });
  merged.button = clampNumericFields(merged.button, {
    buttonHeight: [28, 64], buttonRadius: [4, 32], buttonPaddingX: [10, 32],
    buttonTextSize: [11, 18], buttonBorderOpacity: [0, 100], buttonGlowOpacity: [0, 100],
    buttonGlowBlur: [0, 60], gradientBlendIntensity: [0, 100],
    hoverLift: [0, 12], pressScale: [0.92, 1], disabledOpacity: [20, 80],
  });
  merged.ghostQueue = clampNumericFields(merged.ghostQueue, {
    cardOpacity: [10, 100], hoverOpacity: [10, 100], avatarSize: [32, 80],
    cardRadius: [4, 32], cardPadding: [8, 28],
  });

  // Clamp teamCount to valid range then ensure activeTeamIndex is within bounds
  const tc = Math.round(clamp(merged.board.teamCount, 6, 10)) as 6 | 7 | 8 | 9 | 10;
  merged.board.teamCount = tc;
  merged.board.activeTeamIndex = Math.min(
    Math.max(0, Math.round(merged.board.activeTeamIndex)),
    tc - 1,
  );

  return merged as LabEditorConfig;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

export function readStoredConfig(): LabEditorConfig {
  if (typeof window === "undefined") return labEditorDefaults;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) return mergeConfig(JSON.parse(stored));
  } catch {}
  return labEditorDefaults;
}

export function readStoredMessage(): string {
  if (typeof window === "undefined") return "Local changes autosave in this browser.";
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      JSON.parse(stored);
      return "Restored saved local config.";
    }
  } catch {
    return "Saved config could not be read, using defaults.";
  }
  return "Local changes autosave in this browser.";
}
