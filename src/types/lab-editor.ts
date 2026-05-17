export type PlayerCardDensity = "compact" | "standard" | "full";
export type SlotDensity = "compact" | "standard";
export type PulsePreset = "off" | "subtle" | "strong";
export type HeaderIntensity = "low" | "medium" | "high";
export type LayoutPreset = "balanced" | "4-4" | "5-4" | "4-5";
export type ViewMode = "spectator" | "captain" | "caster";
export type ThemeName = "cyan serpent" | "purple plasma" | "solar ember" | "dark temple";
export type GlowStrength = "none" | "low" | "medium" | "high" | "nuclear";
export type BorderStrength = "none" | "subtle" | "clear" | "bright";
export type CornerStyle = "sharp" | "soft" | "pillowy";
export type BackgroundStyle = "grid" | "smoke" | "clean";
export type AnimationIntensity = "none" | "subtle" | "medium" | "flashy";
export type SpacingPreset = "compact" | "balanced" | "cinematic";
export type ButtonStylePreset = "solid" | "gradient" | "glass" | "outline" | "neon";
export type ButtonIntent = "cyan" | "purple" | "ember" | "serpent";
export type DraftButtonIntent = "ember" | "red alert" | "solar" | "white hot";
export type ButtonHoverEffect = "none" | "lift" | "brighten" | "glow flare" | "scanline";
export type ButtonPressEffect = "none" | "compress" | "flash" | "ripple";
export type ButtonDisabledStyle = "dim" | "locked" | "ghosted";

export type PlayerCardEditorConfig = {
  density: PlayerCardDensity;
  showBanner: boolean;
  showTimezone: boolean;
  showTags: boolean;
  showDiscordUsername: boolean;
  showOrgBadge: boolean;
  cardScale: number;
  cardWidth: number;
  cardRadius: number;
  cardPadding: number;
  bannerHeight: number;
  avatarSize: number;
  tagSize: number;
};

export type RosterSlotEditorConfig = {
  showPickNumbers: boolean;
  showEmptySlots: boolean;
  showGhostQueue: boolean;
  slotDensity: SlotDensity;
  selectedSlotPulse: PulsePreset;
  slotHeight: number;
  slotRadius: number;
  slotPadding: number;
  pickNumberSize: number;
  ghostOpacity: number;
  selectedPulseStrength: number;
};

export type OrgCardEditorConfig = {
  rosterSize: 6 | 7 | 8;
  showCaptainLockedSlot: boolean;
  activeState: boolean;
  headerIntensity: HeaderIntensity;
  orgCardScale: number;
  orgCardWidth: number;
  orgCardRadius: number;
  orgCardPadding: number;
  orgLogoSize: number;
  headerHeight: number;
  activeGlowIntensity: number;
};

export type BoardEditorConfig = {
  teamCount: 6 | 7 | 8 | 9 | 10;
  layoutPreset: LayoutPreset;
  activeTeamIndex: number;
  viewMode: ViewMode;
  showRecentPicksWidget: boolean;
  showTopBanner: boolean;
  boardMaxWidth: number;
  boardGap: number;
  rowGap: number;
  boardScale: number;
  inactiveCardOpacity: number;
  activeCardScale: number;
};

export type ThemeEditorConfig = {
  theme: ThemeName;
  glowStrength: GlowStrength;
  borderStrength: BorderStrength;
  cornerStyle: CornerStyle;
  backgroundStyle: BackgroundStyle;
  animationIntensity: AnimationIntensity;
  spacing: SpacingPreset;
  globalGlowOpacity: number;
  globalGlowBlur: number;
  borderOpacity: number;
  backgroundGridOpacity: number;
  backgroundVignetteStrength: number;
  motionDuration: number;
  hoverLift: number;
};

export type ButtonEditorConfig = {
  buttonStyle: ButtonStylePreset;
  buttonShape: CornerStyle;
  primaryIntent: ButtonIntent;
  draftButtonIntent: DraftButtonIntent;
  hoverEffect: ButtonHoverEffect;
  pressEffect: ButtonPressEffect;
  disabledStyle: ButtonDisabledStyle;
  buttonHeight: number;
  buttonRadius: number;
  buttonPaddingX: number;
  buttonTextSize: number;
  buttonBorderOpacity: number;
  buttonGlowOpacity: number;
  buttonGlowBlur: number;
  gradientBlendIntensity: number;
  hoverLift: number;
  pressScale: number;
  disabledOpacity: number;
};

export type GhostBorderStyle = "dashed" | "solid" | "none";

export type GhostQueueEditorConfig = {
  cardOpacity: number;
  hoverOpacity: number;
  showPosition: boolean;
  showRoles: boolean;
  showSubtext: boolean;
  avatarSize: number;
  cardRadius: number;
  cardPadding: number;
  borderStyle: GhostBorderStyle;
};

export type LabEditorConfig = {
  playerCard: PlayerCardEditorConfig;
  rosterSlot: RosterSlotEditorConfig;
  orgCard: OrgCardEditorConfig;
  board: BoardEditorConfig;
  theme: ThemeEditorConfig;
  button: ButtonEditorConfig;
  ghostQueue: GhostQueueEditorConfig;
};

export type UpdateSection = <
  Section extends keyof LabEditorConfig,
  Key extends keyof LabEditorConfig[Section],
>(
  section: Section,
  key: Key,
  value: LabEditorConfig[Section][Key],
) => void;
