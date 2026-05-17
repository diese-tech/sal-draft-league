"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DraftPlayerCard } from "@/components/card-lab/DraftPlayerCard";
import { GhostQueueCard } from "@/components/card-lab/GhostQueueCard";
import { OrgRosterCard } from "@/components/card-lab/OrgRosterCard";
import { PlayerProfileCard } from "@/components/card-lab/PlayerProfileCard";
import { RosterSlotCard } from "@/components/card-lab/RosterSlotCard";
import { SalButton } from "@/components/sal-ui/SalButton";
import { labEditorDefaults } from "@/data/lab-editor-defaults";
import { players, rosterSlotStates } from "@/data/mock-card-lab";
import type {
  AnimationIntensity,
  BorderStrength,
  CornerStyle,
  GlowStrength,
  LabEditorConfig,
  UpdateSection,
} from "@/types/lab-editor";
import { cn } from "@/lib/utils";
import {
  buildBoardOrgs,
  getBoardRows,
  getBorderPreset,
  getCornerStylePresets,
  getGlowPreset,
  getMotionPreset,
  getPreviewPanelGapClass,
  getThemeClass,
  getThemeRadius,
  mergeConfig,
  readStoredConfig,
  readStoredMessage,
  sliceBoardRows,
} from "@/lib/lab-utils";
import {
  PreviewPanel,
  PreviewTarget,
  InlineControls,
} from "@/components/lab-editor/primitives";
import { BoardCanvas } from "@/components/lab-editor/BoardCanvas";
import { PlayerCardControls } from "@/components/lab-editor/controls/PlayerCardControls";
import { RosterSlotControls } from "@/components/lab-editor/controls/RosterSlotControls";
import { OrgCardControls } from "@/components/lab-editor/controls/OrgCardControls";
import { GhostQueueControls } from "@/components/lab-editor/controls/GhostQueueControls";
import { BoardControls } from "@/components/lab-editor/controls/BoardControls";
import { ThemeControls } from "@/components/lab-editor/controls/ThemeControls";
import { ButtonControls } from "@/components/lab-editor/controls/ButtonControls";

const storageKey = "sal-lab-editor-config";
const utilityButtonClass =
  "cursor-pointer rounded-xl border px-3 py-2 text-xs font-black uppercase transition hover:brightness-110 active:translate-y-0.5 active:scale-95 active:brightness-125 active:saturate-150 active:[box-shadow:inset_0_2px_14px_rgba(0,0,0,0.5)]";

type CanvasSize = "preview" | "1920x1080" | "1280x720";

export function LabEditor() {
  const [config, setConfig] = useState<LabEditorConfig>(readStoredConfig);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonMessage, setJsonMessage] = useState(readStoredMessage);
  const [buttonMessage, setButtonMessage] = useState("No preview action clicked yet.");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>("preview");
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [previewZoom, setPreviewZoom] = useState<number | "fit">("fit");
  const boardPreviewRef = useRef<HTMLDivElement>(null);
  const boardContentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [boardNaturalHeight, setBoardNaturalHeight] = useState(600);
  const prevConfigRef = useRef<LabEditorConfig | null>(null);
  const [, forceRender] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const stored = window.localStorage.getItem("sal-lab-editor-collapsed");
      if (stored) return new Set<string>(JSON.parse(stored) as string[]);
    } catch {}
    return new Set<string>();
  });
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (canvasSize === "preview") return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const targetW = canvasSize === "1920x1080" ? 1920 : 1280;
    const targetH = canvasSize === "1920x1080" ? 1080 : 720;
    const maxPreviewH = 620;
    const update = () => {
      const scaleByW = el.getBoundingClientRect().width / targetW;
      const scaleByH = maxPreviewH / targetH;
      setCanvasScale(Math.min(scaleByW, scaleByH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasSize]);

  useEffect(() => {
    if (previewZoom !== "fit" || canvasSize !== "preview") return;
    const el = boardPreviewRef.current;
    if (!el) return;
    const update = () => setFitScale(Math.min(1, el.getBoundingClientRect().width / config.board.boardMaxWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewZoom, canvasSize, config.board.boardMaxWidth]);

  useEffect(() => {
    const el = boardContentRef.current;
    if (!el) return;
    const update = () => setBoardNaturalHeight(el.scrollHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const boardOrgs = useMemo(() => buildBoardOrgs(config), [config]);
  const themeClass = getThemeClass(config);
  const previewPanelGapClass = getPreviewPanelGapClass(config);
  const effectivePreviewScale = previewZoom === "fit" ? fitScale : (previewZoom as number);

  const updateSection: UpdateSection = (section, key, value) => {
    setConfig((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };

  function handleCornerStyleChange(value: CornerStyle) {
    const presets = getCornerStylePresets(value);
    setConfig((current) => ({
      ...current,
      theme:      { ...current.theme,      cornerStyle:    value               },
      playerCard: { ...current.playerCard, cardRadius:     presets.cardRadius   },
      orgCard:    { ...current.orgCard,    orgCardRadius:  presets.orgCardRadius },
      rosterSlot: { ...current.rosterSlot, slotRadius:    presets.slotRadius    },
      button:     { ...current.button,     buttonRadius:   presets.buttonRadius  },
    }));
  }

  function handleGlowStrengthChange(value: GlowStrength) {
    const presets = getGlowPreset(value);
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, glowStrength: value, ...presets },
    }));
  }

  function handleBorderStrengthChange(value: BorderStrength) {
    const presets = getBorderPreset(value);
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, borderStrength: value, ...presets },
    }));
  }

  function handleMotionPresetChange(value: AnimationIntensity) {
    const presets = getMotionPreset(value);
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, animationIntensity: value, ...presets },
    }));
  }

  function handleTeamCountChange(value: 6 | 7 | 8 | 9 | 10) {
    setConfig((current) => ({
      ...current,
      board: {
        ...current.board,
        teamCount: value,
        activeTeamIndex: Math.min(current.board.activeTeamIndex, value - 1),
      },
    }));
  }

  function toggleSectionCollapse(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      window.localStorage.setItem("sal-lab-editor-collapsed", JSON.stringify([...next]));
      return next;
    });
  }

  async function copyJson() {
    await navigator.clipboard.writeText(configJson);
    setJsonMessage("Copied current config JSON.");
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonDraft);
      const next = mergeConfig(parsed);
      setConfig(next);
      setJsonMessage("Imported config.");
    } catch {
      setJsonMessage("That JSON is not valid SAL editor config.");
    }
  }

  function resetConfig() {
    prevConfigRef.current = config;
    setConfig(labEditorDefaults);
    setJsonDraft("");
    setJsonMessage("Reset to SAL defaults.");
    forceRender((n) => n + 1);
  }

  function undoReset() {
    if (!prevConfigRef.current) return;
    setConfig(prevConfigRef.current);
    prevConfigRef.current = null;
    setJsonMessage("Restored pre-reset config.");
    forceRender((n) => n + 1);
  }

  return (
    <main className={cn("relative min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8", themeClass)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          config.theme.backgroundStyle === "grid" && "sal-grid",
          config.theme.backgroundStyle === "smoke" &&
            "bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_28rem),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_30rem)]",
        )}
        style={{ opacity: config.theme.backgroundGridOpacity / 100 }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.72)_100%)]"
        style={{ opacity: config.theme.backgroundVignetteStrength / 100 }}
      />

      <div className="relative mx-auto grid max-w-[1800px] gap-5">
        <header className="rounded-2xl border border-white/10 bg-slate-950/84 p-4 shadow-2xl shadow-black/35 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-cyan-200">SAL Design Editor</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-white">Edit each design segment beside its preview.</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-400">
                Controls now live next to the thing they change, so card sliders sit with cards, org sliders sit with org cards, and board sliders sit with the board.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDebugMode((v) => !v)}
                className={cn(
                  utilityButtonClass,
                  debugMode
                    ? "border-fuchsia-300/35 bg-fuchsia-300/15 text-fuchsia-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]",
                )}
              >
                {debugMode ? "Debug On" : "Debug"}
              </button>
              {prevConfigRef.current && (
                <button
                  onClick={undoReset}
                  className={cn(utilityButtonClass, "border-orange-300/30 bg-orange-300/10 text-orange-100 hover:bg-orange-300/20")}
                >
                  Undo Reset
                </button>
              )}
              <button
                data-testid="reset-config"
                onClick={resetConfig}
                className={cn(utilityButtonClass, "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] active:bg-white/[0.16]")}
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <section className="min-w-0">
          <div className={cn("grid", previewPanelGapClass)}>
            <PreviewPanel
              eyebrow="Theme"
              title="Page theme, card chrome, and motion"
              tunedBy={["Theme"]}
              collapsed={collapsedSections.has("Theme")}
              onToggle={() => toggleSectionCollapse("Theme")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Theme controls">
                  <ThemeControls
                    config={config}
                    updateSection={updateSection}
                    onCornerStyleChange={handleCornerStyleChange}
                    onGlowStrengthChange={handleGlowStrengthChange}
                    onBorderStrengthChange={handleBorderStrengthChange}
                    onMotionPresetChange={handleMotionPresetChange}
                  />
                </InlineControls>
                <PreviewTarget label="Theme surface samples" affectedBy="Theme controls affect the page backdrop, card borders/glow/corners, and transition speed. Button shape/style lives in the Button section.">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div
                      className={cn(
                        "min-h-40 overflow-hidden border p-5 transition",
                        config.theme.backgroundStyle === "grid" && "sal-grid",
                        config.theme.backgroundStyle === "smoke" &&
                          "bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_9rem),radial-gradient(circle_at_80%_30%,rgba(251,146,60,0.18),transparent_10rem)]",
                        config.theme.backgroundStyle === "clean" && "bg-slate-950",
                      )}
                      style={{
                        borderRadius: getThemeRadius(config),
                        borderColor: `rgba(255,255,255,${config.theme.borderOpacity / 100})`,
                        transitionDuration: `${config.theme.motionDuration}ms`,
                      }}
                    >
                      <p className="text-xs font-black uppercase text-cyan-100">Page Backdrop</p>
                      <p className="mt-2 text-lg font-black text-white">{config.theme.backgroundStyle}</p>
                      <p className="mt-6 text-sm font-semibold text-slate-300">Grid opacity {config.theme.backgroundGridOpacity}%</p>
                    </div>

                    <div
                      className="min-h-40 border bg-slate-950/80 p-5 shadow-2xl transition"
                      style={{
                        borderRadius: getThemeRadius(config),
                        borderColor: `rgba(255,255,255,${config.theme.borderOpacity / 100})`,
                        boxShadow: `0 0 ${config.theme.globalGlowBlur}px rgba(34,211,238,${config.theme.globalGlowOpacity / 140})`,
                        transitionDuration: `${config.theme.motionDuration}ms`,
                      }}
                    >
                      <p className="text-xs font-black uppercase text-cyan-100">Card Chrome</p>
                      <p className="mt-2 text-lg font-black text-white">{config.theme.glowStrength} glow</p>
                      <div className="mt-5 h-2 rounded-full bg-gradient-to-r from-cyan-300 via-white to-orange-300" />
                      <p className="mt-4 text-sm font-semibold text-slate-300">{config.theme.cornerStyle} corners</p>
                    </div>

                    <div className="group min-h-40 rounded-2xl border border-orange-200/20 bg-orange-300/10 p-5">
                      <p className="text-xs font-black uppercase text-orange-100">Motion Sample</p>
                      <div
                        className="mt-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-black/35 font-black text-white transition group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-orange-400/30"
                        style={{
                          borderRadius: getThemeRadius(config),
                          transitionDuration: `${config.theme.motionDuration}ms`,
                        }}
                      >
                        Lift
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-300">{config.theme.motionDuration}ms duration</p>
                    </div>
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Button Preview"
              title="Reusable SAL action buttons"
              tunedBy={["Buttons", "Theme"]}
              collapsed={collapsedSections.has("Button Preview")}
              onToggle={() => toggleSectionCollapse("Button Preview")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Button controls">
                  <ButtonControls config={config} updateSection={updateSection} />
                </InlineControls>
                <PreviewTarget label="Action button set" affectedBy="Button controls: style, shape, intent, hover, press, disabled treatment">
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-3">
                      <SalButton config={config.button} onClick={() => setButtonMessage("Primary button clicked.")}>Primary</SalButton>
                      <SalButton config={config.button} variant="queue" onClick={() => setButtonMessage("Queue button clicked.")}>Queue</SalButton>
                      <SalButton config={config.button} variant="draft" onClick={() => setButtonMessage("Draft / Lock Pick button clicked.")}>Draft / Lock Pick</SalButton>
                      <SalButton config={config.button} variant="notes" onClick={() => setButtonMessage("Notes button clicked.")}>Notes</SalButton>
                      <SalButton config={config.button} disabled onClick={() => setButtonMessage("Disabled button should not click.")}>Disabled</SalButton>
                      <SalButton config={config.button} variant="admin" onClick={() => setButtonMessage("Admin Override button clicked.")}>Admin Override</SalButton>
                    </div>
                    <div data-testid="button-action-result" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-slate-200">
                      {buttonMessage}
                    </div>
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Cards"
              title="Profile and draft pool tuning"
              tunedBy={["Player Cards", "Theme"]}
              collapsed={collapsedSections.has("Cards")}
              onToggle={() => toggleSectionCollapse("Cards")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Player card controls">
                  <PlayerCardControls config={config} updateSection={updateSection} />
                </InlineControls>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)]">
                  <PreviewTarget label="Player profile card" affectedBy="Player Cards controls: banner, avatar, width, scale, tags, username, badge">
                    <PlayerProfileCard player={players[0]} editorConfig={config} />
                  </PreviewTarget>
                  <PreviewTarget label="Draft player cards" affectedBy="Player Cards controls: compact card size, banner, avatar, identity rows">
                    <div className="flex flex-wrap gap-3">
                      {players.slice(0, 3).map((player) => (
                        <DraftPlayerCard key={player.id} player={player} editorConfig={config} />
                      ))}
                    </div>
                  </PreviewTarget>
                </div>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Roster Slots"
              title="Drafted, active, ghost, and empty states"
              tunedBy={["Roster Slots", "Theme"]}
              collapsed={collapsedSections.has("Roster Slots")}
              onToggle={() => toggleSectionCollapse("Roster Slots")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Roster slot controls">
                  <RosterSlotControls config={config} updateSection={updateSection} />
                </InlineControls>
                <PreviewTarget label="Roster slot states" affectedBy="Roster Slots controls: height, padding, pick numbers, ghost opacity, active pulse">
                  <div className="grid gap-3 lg:grid-cols-2">
                    {rosterSlotStates
                      .filter((slot) => (slot.state === "empty" ? config.rosterSlot.showEmptySlots : true))
                      .filter((slot) => (slot.state === "queued-ghost" ? config.rosterSlot.showGhostQueue : true))
                      .map((slot) => (
                        <RosterSlotCard key={slot.slotNumber} slot={slot} editorConfig={config} />
                      ))}
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Ghost Queue"
              title="Private queue preview cards"
              tunedBy={["Ghost Queue", "Theme"]}
              collapsed={collapsedSections.has("Ghost Queue")}
              onToggle={() => toggleSectionCollapse("Ghost Queue")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Ghost queue controls">
                  <GhostQueueControls config={config} updateSection={updateSection} />
                </InlineControls>
                <PreviewTarget label="Ghost queue cards" affectedBy="Ghost Queue controls: opacity, hover opacity, position badge, roles, subtext, avatar size, radius, padding, border style">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <GhostQueueCard player={players[4]} queuePosition={1} editorConfig={config} />
                    <GhostQueueCard player={players[0]} queuePosition={2} editorConfig={config} />
                    <GhostQueueCard player={players[2]} queuePosition={3} editorConfig={config} />
                    <GhostQueueCard player={players[1]} queuePosition={4} editorConfig={config} />
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Org Roster"
              title="Captain card and roster construction"
              tunedBy={["Org Cards", "Roster Slots", "Theme"]}
              collapsed={collapsedSections.has("Org Roster")}
              onToggle={() => toggleSectionCollapse("Org Roster")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Org card controls">
                  <OrgCardControls config={config} updateSection={updateSection} />
                </InlineControls>
                <PreviewTarget label="Org roster card" affectedBy="Org Card controls tune the shell/header; Roster Slot controls tune each roster row">
                  <div className="max-w-full">
                    <OrgRosterCard
                      org={{ ...boardOrgs[0], state: config.orgCard.activeState ? "active" : "inactive" }}
                      editorConfig={config}
                    />
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="Mini Board"
              title="Mock draft board composition"
              tunedBy={["Board", "Org Cards", "Roster Slots", "Theme"]}
              collapsed={collapsedSections.has("Mini Board")}
              onToggle={() => toggleSectionCollapse("Mini Board")}
            >
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Board controls">
                  <BoardControls
                    config={config}
                    updateSection={updateSection}
                    onTeamCountChange={handleTeamCountChange}
                  />
                </InlineControls>
                <div className="min-w-0">
                  <div className="mb-4 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-400">Preview mode</span>
                      {(["preview", "1920x1080", "1280x720"] as CanvasSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setCanvasSize(size)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-black uppercase transition",
                            canvasSize === size
                              ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                              : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200",
                          )}
                        >
                          {size === "preview" ? "Editor" : size}
                        </button>
                      ))}
                      {canvasSize !== "preview" && (
                        <span className="ml-1 text-[0.65rem] font-bold text-slate-500">
                          Scale {(canvasScale * 100).toFixed(0)}% — full canvas visible · {canvasSize}
                        </span>
                      )}
                    </div>
                    {canvasSize === "preview" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase text-slate-400">Zoom</span>
                        {(["fit", 0.5, 0.75, 1] as const).map((z) => (
                          <button
                            key={String(z)}
                            onClick={() => setPreviewZoom(z)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-black uppercase transition",
                              previewZoom === z
                                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                                : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200",
                            )}
                          >
                            {z === "fit" ? "Fit" : `${Math.round((z as number) * 100)}%`}
                          </button>
                        ))}
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={Math.round(effectivePreviewScale * 100)}
                          onInput={(e) => setPreviewZoom(Number((e.target as HTMLInputElement).value) / 100)}
                          className="w-24 accent-cyan-300"
                        />
                        <span className="text-[0.65rem] font-bold text-slate-500">
                          {Math.round(effectivePreviewScale * 100)}%{previewZoom === "fit" ? " (fit)" : ""}
                          {config.board.boardScale !== 1 && (
                            <> · board scale {config.board.boardScale}× = effective {Math.round(effectivePreviewScale * config.board.boardScale * 100)}%</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {canvasSize === "preview" ? (
                    <>
                      {config.board.showTopBanner && (
                        <PreviewTarget label="Draft top banner" affectedBy="Board controls: top banner toggle and active team index">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3">
                            <div>
                              <p className="text-xs font-black uppercase text-orange-100">Round 2 Pick 9</p>
                              <p className="text-xl font-black text-white">
                                {boardOrgs[config.board.activeTeamIndex]?.name ?? "Active org"} is on the clock
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-lg font-black text-white">01:24</div>
                          </div>
                        </PreviewTarget>
                      )}

                      <PreviewTarget
                        label="Board team grid"
                        affectedBy="Board controls: team count, layout preset, gaps, active team, inactive opacity, board scale. Layout presets render as centered flex rows."
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <p className="text-xs font-bold text-slate-400">View: <span className="text-slate-200">{config.board.viewMode}</span></p>
                          <p className="text-xs font-bold text-slate-400">
                            Layout: <span className="text-slate-200">{config.board.layoutPreset} → [{getBoardRows(config.board.teamCount, config.board.layoutPreset).join(", ")}]</span>
                          </p>
                        </div>
                        <div
                          ref={boardPreviewRef}
                          className="w-full overflow-hidden"
                          style={{ height: `${Math.round(boardNaturalHeight * effectivePreviewScale)}px` }}
                        >
                          <div
                            ref={boardContentRef}
                            style={{
                              transform: `scale(${effectivePreviewScale})`,
                              transformOrigin: "top left",
                              width: `${config.board.boardMaxWidth}px`,
                            }}
                          >
                            <div
                              style={{
                                transform: config.board.boardScale !== 1 ? `scale(${config.board.boardScale})` : undefined,
                                transformOrigin: "top center",
                              }}
                            >
                              <div className="flex flex-col" style={{ gap: `${config.board.rowGap}px` }}>
                                {sliceBoardRows(boardOrgs, config.board.teamCount, config.board.layoutPreset).map(({ orgs, startIndex }, rowIndex) => (
                                  <div key={rowIndex} className="flex justify-center" style={{ gap: `${config.board.boardGap}px` }}>
                                    {orgs.map((org, i) => {
                                      const gi = startIndex + i;
                                      return (
                                        <div
                                          key={`${org.id}-${gi}`}
                                          style={{
                                            opacity: gi === config.board.activeTeamIndex ? 1 : config.board.inactiveCardOpacity / 100,
                                            transform: gi === config.board.activeTeamIndex ? `scale(${config.board.activeCardScale})` : undefined,
                                          }}
                                        >
                                          <OrgRosterCard org={org} editorConfig={config} />
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </PreviewTarget>

                      {config.board.viewMode === "captain" && (
                        <PreviewTarget label="Captain ghost queue" affectedBy="Captain view only — private pick queue, hidden from spectators and caster">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <GhostQueueCard player={players[4]} queuePosition={1} editorConfig={config} />
                            <GhostQueueCard player={players[0]} queuePosition={2} editorConfig={config} />
                          </div>
                        </PreviewTarget>
                      )}

                      {config.board.viewMode === "caster" && (
                        <PreviewTarget label="Caster overlay" affectedBy="Caster mode — all elements visible including picks and stats">
                          <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] px-3 py-2">
                            <p className="text-xs font-black uppercase text-fuchsia-200">Caster mode active — recent picks + full board always visible regardless of captain queue</p>
                          </div>
                        </PreviewTarget>
                      )}

                      {config.board.showRecentPicksWidget && config.board.viewMode !== "captain" && (
                        <PreviewTarget label="Recent picks widget" affectedBy="Board controls: recent picks toggle; hidden in captain view; Theme controls affect surface">
                          <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-3">
                            {players.slice(0, 3).map((player, index) => (
                              <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                                <p className="text-[0.65rem] font-black uppercase text-slate-500">Recent pick {index + 1}</p>
                                <p className="mt-1 truncate text-sm font-black text-white">{player.ign}</p>
                              </div>
                            ))}
                          </div>
                        </PreviewTarget>
                      )}
                    </>
                  ) : (
                    <BoardCanvas
                      config={config}
                      boardOrgs={boardOrgs}
                      canvasSize={canvasSize}
                      canvasScale={canvasScale}
                      containerRef={canvasContainerRef}
                      themeClass={themeClass}
                    />
                  )}
                </div>
              </div>
            </PreviewPanel>

            <PreviewPanel
              eyebrow="JSON"
              title="Copy or import the current design config"
              collapsed={collapsedSections.has("JSON")}
              onToggle={() => toggleSectionCollapse("JSON")}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-300">{jsonMessage}</p>
                    <button
                      data-testid="copy-json"
                      onClick={copyJson}
                      className={cn(utilityButtonClass, "border-cyan-200/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 active:bg-cyan-100/30")}
                    >
                      Copy JSON
                    </button>
                  </div>
                  <textarea
                    data-testid="config-json"
                    readOnly
                    value={configJson}
                    className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-xs leading-5 text-cyan-50 outline-none"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-300">Paste edited JSON here.</p>
                    <button
                      data-testid="apply-json"
                      onClick={importJson}
                      className={cn(utilityButtonClass, "border-orange-200/20 bg-orange-300/10 text-orange-100 hover:bg-orange-300/15 active:bg-orange-100/30")}
                    >
                      Apply JSON
                    </button>
                  </div>
                  <textarea
                    data-testid="json-import"
                    value={jsonDraft}
                    onChange={(event) => setJsonDraft(event.target.value)}
                    className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-xs leading-5 text-slate-100 outline-none"
                    placeholder="Paste SAL editor JSON..."
                  />
                </div>
              </div>
              {debugMode && (
                <div className="mt-4 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/[0.04] p-3">
                  <p className="mb-2 text-xs font-black uppercase text-fuchsia-300">Debug — live config snapshot</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(Object.keys(config) as (keyof LabEditorConfig)[]).map((section) => (
                      <div key={section} className="rounded-xl border border-white/10 bg-black/25 p-2">
                        <p className="mb-1 text-[0.6rem] font-black uppercase text-fuchsia-200/70">{section}</p>
                        <pre className="overflow-x-auto text-[0.6rem] leading-4 text-slate-300">{JSON.stringify(config[section], null, 1)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PreviewPanel>
          </div>
        </section>
      </div>
    </main>
  );
}
