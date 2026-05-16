"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DraftPlayerCard } from "@/components/card-lab/DraftPlayerCard";
import { GhostQueueCard } from "@/components/card-lab/GhostQueueCard";
import { OrgRosterCard } from "@/components/card-lab/OrgRosterCard";
import { PlayerProfileCard } from "@/components/card-lab/PlayerProfileCard";
import { RosterSlotCard } from "@/components/card-lab/RosterSlotCard";
import { SalButton } from "@/components/sal-ui/SalButton";
import { labEditorDefaults } from "@/data/lab-editor-defaults";
import { orgRosters, players, rosterSlotStates } from "@/data/mock-card-lab";
import type { LabEditorConfig, CornerStyle, GhostBorderStyle } from "@/types/lab-editor";
import type { OrgRoster } from "@/types/card-lab";
import { cn } from "@/lib/utils";

const storageKey = "sal-lab-editor-config";
const utilityButtonClass =
  "cursor-pointer rounded-xl border px-3 py-2 text-xs font-black uppercase transition hover:brightness-110 active:translate-y-0.5 active:scale-95 active:brightness-125 active:saturate-150 active:[box-shadow:inset_0_2px_14px_rgba(0,0,0,0.5)]";

type UpdateSection = <Section extends keyof LabEditorConfig, Key extends keyof LabEditorConfig[Section]>(
  section: Section,
  key: Key,
  value: LabEditorConfig[Section][Key],
) => void;

type CanvasSize = "preview" | "1920x1080" | "1280x720";

export function LabEditor() {
  const [config, setConfig] = useState<LabEditorConfig>(readStoredConfig);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonMessage, setJsonMessage] = useState(readStoredMessage);
  const [buttonMessage, setButtonMessage] = useState("No preview action clicked yet.");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>("preview");
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
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
    const targetWidth = canvasSize === "1920x1080" ? 1920 : 1280;
    const update = () => setCanvasScale(el.getBoundingClientRect().width / targetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasSize]);

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const boardOrgs = useMemo(() => buildBoardOrgs(config), [config]);
  const themeClass = getThemeClass(config);
  const previewPanelGapClass = getPreviewPanelGapClass(config);

  function updateSection<Section extends keyof LabEditorConfig, Key extends keyof LabEditorConfig[Section]>(
    section: Section,
    key: Key,
    value: LabEditorConfig[Section][Key],
  ) {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  function handleCornerStyleChange(value: CornerStyle) {
    const presets = getCornerStylePresets(value);
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, cornerStyle: value },
      playerCard: { ...current.playerCard, cardRadius: presets.cardRadius },
      orgCard: { ...current.orgCard, orgCardRadius: presets.orgCardRadius },
      rosterSlot: { ...current.rosterSlot, slotRadius: presets.slotRadius },
      button: { ...current.button, buttonRadius: presets.buttonRadius },
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
    setConfig(labEditorDefaults);
    setJsonDraft("");
    setJsonMessage("Reset to SAL defaults.");
  }

  return (
    <main className={cn("relative min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8", themeClass)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          config.theme.backgroundStyle === "grid" && "sal-grid",
          config.theme.backgroundStyle === "smoke" && "bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_28rem),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.12),transparent_30rem)]",
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
            <PreviewPanel eyebrow="Theme" title="Page theme, card chrome, and motion" tunedBy={["Theme"]} collapsed={collapsedSections.has("Theme")} onToggle={() => toggleSectionCollapse("Theme")}>
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Theme controls">
                  <ThemeControls config={config} updateSection={updateSection} onCornerStyleChange={handleCornerStyleChange} />
                </InlineControls>
                <PreviewTarget label="Theme surface samples" affectedBy="Theme controls affect the page backdrop, card borders/glow/corners, and transition speed. Button shape/style lives in the Button section.">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div
                      className={cn(
                        "min-h-40 overflow-hidden border p-5 transition",
                        config.theme.backgroundStyle === "grid" && "sal-grid",
                        config.theme.backgroundStyle === "smoke" && "bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_9rem),radial-gradient(circle_at_80%_30%,rgba(251,146,60,0.18),transparent_10rem)]",
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

            <PreviewPanel eyebrow="Button Preview" title="Reusable SAL action buttons" tunedBy={["Buttons", "Theme"]} collapsed={collapsedSections.has("Button Preview")} onToggle={() => toggleSectionCollapse("Button Preview")}>
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

            <PreviewPanel eyebrow="Cards" title="Profile and draft pool tuning" tunedBy={["Player Cards", "Theme"]} collapsed={collapsedSections.has("Cards")} onToggle={() => toggleSectionCollapse("Cards")}>
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

            <PreviewPanel eyebrow="Roster Slots" title="Drafted, active, ghost, and empty states" tunedBy={["Roster Slots", "Theme"]} collapsed={collapsedSections.has("Roster Slots")} onToggle={() => toggleSectionCollapse("Roster Slots")}>
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

            <PreviewPanel eyebrow="Ghost Queue" title="Private queue preview cards" tunedBy={["Ghost Queue", "Theme"]} collapsed={collapsedSections.has("Ghost Queue")} onToggle={() => toggleSectionCollapse("Ghost Queue")}>
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

            <PreviewPanel eyebrow="Org Roster" title="Captain card and roster construction" tunedBy={["Org Cards", "Roster Slots", "Theme"]} collapsed={collapsedSections.has("Org Roster")} onToggle={() => toggleSectionCollapse("Org Roster")}>
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Org card controls">
                  <OrgCardControls config={config} updateSection={updateSection} />
                </InlineControls>
                <PreviewTarget label="Org roster card" affectedBy="Org Card controls tune the shell/header; Roster Slot controls tune each roster row">
                  <div className="max-w-full">
                    <OrgRosterCard org={{ ...orgRosters[0], state: config.orgCard.activeState ? "active" : "inactive" }} editorConfig={config} />
                  </div>
                </PreviewTarget>
              </div>
            </PreviewPanel>

            <PreviewPanel eyebrow="Mini Board" title="Mock draft board composition" tunedBy={["Board", "Org Cards", "Roster Slots", "Theme"]} collapsed={collapsedSections.has("Mini Board")} onToggle={() => toggleSectionCollapse("Mini Board")}>
              <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
                <InlineControls title="Board controls">
                  <BoardControls config={config} updateSection={updateSection} />
                </InlineControls>
                <div className="min-w-0">
                  {/* Canvas size toggle */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
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
                        Scale {(canvasScale * 100).toFixed(0)}% — showing {canvasSize} stream canvas
                      </span>
                    )}
                  </div>

                  {canvasSize === "preview" ? (
                    <>
                  {config.board.showTopBanner ? (
                <PreviewTarget label="Draft top banner" affectedBy="Board controls: top banner toggle and active team index">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3">
                  <div>
                    <p className="text-xs font-black uppercase text-orange-100">Round 2 Pick 9</p>
                    <p className="text-xl font-black text-white">{boardOrgs[config.board.activeTeamIndex]?.name ?? "Active org"} is on the clock</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-lg font-black text-white">01:24</div>
                </div>
                </PreviewTarget>
                  ) : null}

                  <PreviewTarget label="Board team grid" affectedBy="Board controls: team count, layout, gaps, active team, inactive opacity, board scale. View mode: spectator hides ghost queue; captain shows ghost queue">
              <p className="mb-3 text-xs font-bold text-slate-400">View: {config.board.viewMode}</p>
              <div className="mx-auto overflow-hidden" style={{ maxWidth: `${config.board.boardMaxWidth}px` }}>
              <div
                className="w-full min-w-0 grid"
                style={{
                  gap: `${config.board.rowGap}px ${config.board.boardGap}px`,
                  gridTemplateColumns: getGridTemplateColumns(config),
                  transform: config.board.boardScale !== 1 ? `scale(${config.board.boardScale})` : undefined,
                  transformOrigin: "top center",
                }}
              >
                {boardOrgs.map((org, index) => (
                  <div
                    key={`${org.id}-${index}`}
                    style={{
                      opacity: index === config.board.activeTeamIndex ? 1 : config.board.inactiveCardOpacity / 100,
                      transform: index === config.board.activeTeamIndex ? `scale(${config.board.activeCardScale})` : undefined,
                    }}
                  >
                    <OrgRosterCard org={org} editorConfig={config} />
                  </div>
                ))}
              </div>
              </div>
                  </PreviewTarget>

                  {config.board.showRecentPicksWidget && config.board.viewMode !== "captain" ? (
                <PreviewTarget label="Recent picks widget" affectedBy="Board controls: recent picks toggle; Theme controls affect its surface">
                <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-3">
                  {players.slice(0, 3).map((player, index) => (
                    <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-[0.65rem] font-black uppercase text-slate-500">Recent pick {index + 1}</p>
                      <p className="mt-1 truncate text-sm font-black text-white">{player.ign}</p>
                    </div>
                  ))}
                </div>
                </PreviewTarget>
                  ) : null}
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

            <PreviewPanel eyebrow="JSON" title="Copy or import the current design config" collapsed={collapsedSections.has("JSON")} onToggle={() => toggleSectionCollapse("JSON")}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-300">{jsonMessage}</p>
                    <button data-testid="copy-json" onClick={copyJson} className={cn(utilityButtonClass, "border-cyan-200/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 active:bg-cyan-100/30")}>
                      Copy JSON
                    </button>
                  </div>
                  <textarea data-testid="config-json" readOnly value={configJson} className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-xs leading-5 text-cyan-50 outline-none" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-300">Paste edited JSON here.</p>
                    <button data-testid="apply-json" onClick={importJson} className={cn(utilityButtonClass, "border-orange-200/20 bg-orange-300/10 text-orange-100 hover:bg-orange-300/15 active:bg-orange-100/30")}>
                      Apply JSON
                    </button>
                  </div>
                  <textarea data-testid="json-import" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} className="h-80 w-full resize-none rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-xs leading-5 text-slate-100 outline-none" placeholder="Paste SAL editor JSON..." />
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

function BoardCanvas({
  config,
  boardOrgs,
  canvasSize,
  canvasScale,
  containerRef,
  themeClass,
}: {
  config: LabEditorConfig;
  boardOrgs: OrgRoster[];
  canvasSize: Exclude<CanvasSize, "preview">;
  canvasScale: number;
  containerRef: RefObject<HTMLDivElement | null>;
  themeClass: string;
}) {
  const canvasW = canvasSize === "1920x1080" ? 1920 : 1280;
  const canvasH = canvasSize === "1920x1080" ? 1080 : 720;
  const scaledH = Math.round(canvasH * canvasScale);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl border border-white/15"
      style={{ height: scaledH > 0 ? `${scaledH}px` : undefined }}
    >
      <div
        className={cn("relative overflow-hidden", themeClass)}
        style={{
          width: `${canvasW}px`,
          height: `${canvasH}px`,
          transform: `scale(${canvasScale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Background overlays matching the editor page */}
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

        {/* Stream content */}
        <div className="relative flex h-full flex-col gap-4 p-8">
          {config.board.showTopBanner ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-300/25 bg-orange-400/10 px-6 py-4">
              <div>
                <p className="text-sm font-black uppercase text-orange-100">Round 2 Pick 9</p>
                <p className="text-3xl font-black text-white">
                  {boardOrgs[config.board.activeTeamIndex]?.name ?? "Active org"} is on the clock
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-2xl font-black text-white">01:24</div>
            </div>
          ) : null}

          <div
            className="flex-1 grid min-w-0"
            style={{
              gap: `${config.board.rowGap}px ${config.board.boardGap}px`,
              gridTemplateColumns: getGridTemplateColumns(config),
              maxWidth: `${config.board.boardMaxWidth}px`,
              margin: "0 auto",
              width: "100%",
              transform: config.board.boardScale !== 1 ? `scale(${config.board.boardScale})` : undefined,
              transformOrigin: "top center",
            }}
          >
            {boardOrgs.map((org, index) => (
              <div
                key={`${org.id}-${index}`}
                style={{
                  opacity: index === config.board.activeTeamIndex ? 1 : config.board.inactiveCardOpacity / 100,
                  transform: index === config.board.activeTeamIndex ? `scale(${config.board.activeCardScale})` : undefined,
                }}
              >
                <OrgRosterCard org={org} editorConfig={config} />
              </div>
            ))}
          </div>

          {config.board.showRecentPicksWidget && config.board.viewMode !== "captain" ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4" style={{ gridTemplateColumns: `repeat(${Math.min(players.length, 5)}, 1fr)` }}>
              {players.slice(0, 5).map((player, index) => (
                <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Recent pick {index + 1}</p>
                  <p className="mt-1 truncate text-lg font-black text-white">{player.ign}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ eyebrow, title, tunedBy, collapsed, onToggle, children }: { eyebrow: string; title: string; tunedBy?: string[]; collapsed?: boolean; onToggle?: () => void; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full cursor-pointer flex-wrap items-end justify-between gap-3 p-4 text-left transition hover:bg-white/[0.02]",
          collapsed ? "rounded-2xl" : "rounded-t-2xl",
        )}
      >
        <div>
          <p className="text-xs font-black uppercase text-cyan-200/80">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tunedBy ? (
            <div className="flex flex-wrap gap-1.5">
              {tunedBy.map((item) => (
                <span key={item} className="rounded-full border border-orange-200/15 bg-orange-300/10 px-2 py-1 text-[0.65rem] font-black uppercase text-orange-100/80">
                  Tuned by {item}
                </span>
              ))}
            </div>
          ) : null}
          <span className={cn("ml-1 text-slate-500 transition-transform", !collapsed && "rotate-180")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>
      {!collapsed && <div className="min-w-0 border-t border-white/10 p-4 pt-4">{children}</div>}
    </section>
  );
}

function InlineControls({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-testid={`controls-${slugify(title)}`} className="h-fit rounded-2xl border border-white/10 bg-black/25 2xl:sticky 2xl:top-4">
      <p className="px-3 pt-3 text-xs font-black uppercase text-cyan-100">{title}</p>
      <div className="grid gap-3 overflow-y-auto p-3 pt-2 2xl:max-h-[calc(100vh-6rem)]">{children}</div>
    </div>
  );
}

function ControlDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function PlayerCardControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <SelectControl label="Density" value={config.playerCard.density} options={["compact", "standard", "full"]} onChange={(value) => updateSection("playerCard", "density", value)} />
      <ToggleRow label="Banner" value={config.playerCard.showBanner} onChange={(value) => updateSection("playerCard", "showBanner", value)} />
      <ToggleRow label="Timezone" value={config.playerCard.showTimezone} onChange={(value) => updateSection("playerCard", "showTimezone", value)} />
      <ToggleRow label="Tags" value={config.playerCard.showTags} onChange={(value) => updateSection("playerCard", "showTags", value)} />
      <ToggleRow label="Discord username" value={config.playerCard.showDiscordUsername} onChange={(value) => updateSection("playerCard", "showDiscordUsername", value)} />
      <ToggleRow label="Org/free agent badge" value={config.playerCard.showOrgBadge} onChange={(value) => updateSection("playerCard", "showOrgBadge", value)} />
      <Slider label="Card scale" value={config.playerCard.cardScale} min={0.75} max={1.35} step={0.01} onChange={(value) => updateSection("playerCard", "cardScale", value)} />
      <Slider label="Card width" value={config.playerCard.cardWidth} min={220} max={420} suffix="px" onChange={(value) => updateSection("playerCard", "cardWidth", value)} />
      <Slider label="Card radius" value={config.playerCard.cardRadius} min={4} max={40} suffix="px" onChange={(value) => updateSection("playerCard", "cardRadius", value)} />
      <Slider label="Card padding" value={config.playerCard.cardPadding} min={8} max={32} suffix="px" onChange={(value) => updateSection("playerCard", "cardPadding", value)} />
      <Slider label="Banner height" value={config.playerCard.bannerHeight} min={40} max={180} suffix="px" onChange={(value) => updateSection("playerCard", "bannerHeight", value)} />
      <Slider label="Avatar size" value={config.playerCard.avatarSize} min={32} max={96} suffix="px" onChange={(value) => updateSection("playerCard", "avatarSize", value)} />
      <Slider label="Tag size" value={config.playerCard.tagSize} min={10} max={18} suffix="px" onChange={(value) => updateSection("playerCard", "tagSize", value)} />
    </>
  );
}

function RosterSlotControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <ToggleRow label="Pick numbers" value={config.rosterSlot.showPickNumbers} onChange={(value) => updateSection("rosterSlot", "showPickNumbers", value)} />
      <ToggleRow label="Empty slots" value={config.rosterSlot.showEmptySlots} onChange={(value) => updateSection("rosterSlot", "showEmptySlots", value)} />
      <ToggleRow label="Ghost queue" value={config.rosterSlot.showGhostQueue} onChange={(value) => updateSection("rosterSlot", "showGhostQueue", value)} />
      <SelectControl label="Slot density" value={config.rosterSlot.slotDensity} options={["compact", "standard"]} onChange={(value) => updateSection("rosterSlot", "slotDensity", value)} />
      <SelectControl label="Selected pulse" value={config.rosterSlot.selectedSlotPulse} options={["off", "subtle", "strong"]} onChange={(value) => updateSection("rosterSlot", "selectedSlotPulse", value)} />
      <Slider label="Slot height" value={config.rosterSlot.slotHeight} min={38} max={110} suffix="px" onChange={(value) => updateSection("rosterSlot", "slotHeight", value)} />
      <Slider label="Slot radius" value={config.rosterSlot.slotRadius} min={4} max={28} suffix="px" onChange={(value) => updateSection("rosterSlot", "slotRadius", value)} />
      <Slider label="Slot padding" value={config.rosterSlot.slotPadding} min={6} max={24} suffix="px" onChange={(value) => updateSection("rosterSlot", "slotPadding", value)} />
      <Slider label="Pick number size" value={config.rosterSlot.pickNumberSize} min={10} max={24} suffix="px" onChange={(value) => updateSection("rosterSlot", "pickNumberSize", value)} />
      <Slider label="Ghost opacity" value={config.rosterSlot.ghostOpacity} min={10} max={80} suffix="%" onChange={(value) => updateSection("rosterSlot", "ghostOpacity", value)} />
      <Slider label="Selected pulse strength" value={config.rosterSlot.selectedPulseStrength} min={0} max={100} suffix="%" onChange={(value) => updateSection("rosterSlot", "selectedPulseStrength", value)} />
    </>
  );
}

function OrgCardControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <SelectControl label="Roster size" value={String(config.orgCard.rosterSize)} options={["6", "7", "8"]} onChange={(value) => updateSection("orgCard", "rosterSize", Number(value) as 6 | 7 | 8)} />
      <ToggleRow label="Captain locked slot" value={config.orgCard.showCaptainLockedSlot} onChange={(value) => updateSection("orgCard", "showCaptainLockedSlot", value)} />
      <ToggleRow label="Active state" value={config.orgCard.activeState} onChange={(value) => updateSection("orgCard", "activeState", value)} />
      <SelectControl label="Header intensity" value={config.orgCard.headerIntensity} options={["low", "medium", "high"]} onChange={(value) => updateSection("orgCard", "headerIntensity", value)} />
      <Slider label="Org card scale" value={config.orgCard.orgCardScale} min={0.75} max={1.25} step={0.01} onChange={(value) => updateSection("orgCard", "orgCardScale", value)} />
      <Slider label="Org card width" value={config.orgCard.orgCardWidth} min={260} max={520} suffix="px" onChange={(value) => updateSection("orgCard", "orgCardWidth", value)} />
      <Slider label="Org card radius" value={config.orgCard.orgCardRadius} min={8} max={44} suffix="px" onChange={(value) => updateSection("orgCard", "orgCardRadius", value)} />
      <Slider label="Org card padding" value={config.orgCard.orgCardPadding} min={10} max={36} suffix="px" onChange={(value) => updateSection("orgCard", "orgCardPadding", value)} />
      <Slider label="Org logo size" value={config.orgCard.orgLogoSize} min={32} max={96} suffix="px" onChange={(value) => updateSection("orgCard", "orgLogoSize", value)} />
      <Slider label="Header height" value={config.orgCard.headerHeight} min={70} max={180} suffix="px" onChange={(value) => updateSection("orgCard", "headerHeight", value)} />
      <Slider label="Active glow intensity" value={config.orgCard.activeGlowIntensity} min={0} max={100} suffix="%" onChange={(value) => updateSection("orgCard", "activeGlowIntensity", value)} />
    </>
  );
}

function GhostQueueControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <ControlDivider label="Visibility" />
      <ToggleRow label="Position badge" value={config.ghostQueue.showPosition} onChange={(value) => updateSection("ghostQueue", "showPosition", value)} />
      <ToggleRow label="Role pills" value={config.ghostQueue.showRoles} onChange={(value) => updateSection("ghostQueue", "showRoles", value)} />
      <ToggleRow label="Subtext" value={config.ghostQueue.showSubtext} onChange={(value) => updateSection("ghostQueue", "showSubtext", value)} />
      <ControlDivider label="Opacity" />
      <Slider label="Card opacity" value={config.ghostQueue.cardOpacity} min={10} max={100} suffix="%" onChange={(value) => updateSection("ghostQueue", "cardOpacity", value)} />
      <Slider label="Hover opacity" value={config.ghostQueue.hoverOpacity} min={10} max={100} suffix="%" onChange={(value) => updateSection("ghostQueue", "hoverOpacity", value)} />
      <ControlDivider label="Shape & size" />
      <SelectControl label="Border style" value={config.ghostQueue.borderStyle} options={["dashed", "solid", "none"] as GhostBorderStyle[]} onChange={(value) => updateSection("ghostQueue", "borderStyle", value)} />
      <Slider label="Card radius" value={config.ghostQueue.cardRadius} min={4} max={32} suffix="px" onChange={(value) => updateSection("ghostQueue", "cardRadius", value)} />
      <Slider label="Card padding" value={config.ghostQueue.cardPadding} min={8} max={28} suffix="px" onChange={(value) => updateSection("ghostQueue", "cardPadding", value)} />
      <Slider label="Avatar size" value={config.ghostQueue.avatarSize} min={32} max={80} suffix="px" onChange={(value) => updateSection("ghostQueue", "avatarSize", value)} />
    </>
  );
}

function BoardControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <SelectControl label="Team count" value={String(config.board.teamCount)} options={["6", "7", "8", "9", "10"]} onChange={(value) => updateSection("board", "teamCount", Number(value) as 6 | 7 | 8 | 9 | 10)} />
      <SelectControl label="Layout preset" value={config.board.layoutPreset} options={["balanced", "4-4", "5-4", "4-5"]} onChange={(value) => updateSection("board", "layoutPreset", value)} />
      <Slider label="Active team index" value={config.board.activeTeamIndex} min={0} max={config.board.teamCount - 1} onChange={(value) => updateSection("board", "activeTeamIndex", Math.round(value))} />
      <SelectControl label="View mode" value={config.board.viewMode} options={["spectator", "captain", "caster"]} onChange={(value) => updateSection("board", "viewMode", value)} />
      <ToggleRow label="Recent picks widget" value={config.board.showRecentPicksWidget} onChange={(value) => updateSection("board", "showRecentPicksWidget", value)} />
      <ToggleRow label="Top banner" value={config.board.showTopBanner} onChange={(value) => updateSection("board", "showTopBanner", value)} />
      <Slider label="Board max width" value={config.board.boardMaxWidth} min={900} max={1800} suffix="px" onChange={(value) => updateSection("board", "boardMaxWidth", value)} />
      <Slider label="Board gap" value={config.board.boardGap} min={8} max={40} suffix="px" onChange={(value) => updateSection("board", "boardGap", value)} />
      <Slider label="Row gap" value={config.board.rowGap} min={8} max={48} suffix="px" onChange={(value) => updateSection("board", "rowGap", value)} />
      <Slider label="Board scale" value={config.board.boardScale} min={0.7} max={1.2} step={0.01} onChange={(value) => updateSection("board", "boardScale", value)} />
      <Slider label="Inactive card opacity" value={config.board.inactiveCardOpacity} min={45} max={100} suffix="%" onChange={(value) => updateSection("board", "inactiveCardOpacity", value)} />
      <Slider label="Active card scale" value={config.board.activeCardScale} min={1} max={1.2} step={0.01} onChange={(value) => updateSection("board", "activeCardScale", value)} />
    </>
  );
}

function ThemeControls({ config, updateSection, onCornerStyleChange }: { config: LabEditorConfig; updateSection: UpdateSection; onCornerStyleChange: (value: CornerStyle) => void }) {
  return (
    <>
      <ControlDivider label="Identity" />
      <SelectControl label="Theme" value={config.theme.theme} options={["cyan serpent", "purple plasma", "solar ember", "dark temple"]} onChange={(value) => updateSection("theme", "theme", value)} />
      <SelectControl label="Background style" value={config.theme.backgroundStyle} options={["grid", "smoke", "clean"]} onChange={(value) => updateSection("theme", "backgroundStyle", value)} />
      <SelectControl label="Corner style" value={config.theme.cornerStyle} options={["sharp", "soft", "pillowy"]} onChange={onCornerStyleChange} />
      <SelectControl label="Spacing" value={config.theme.spacing} options={["compact", "balanced", "cinematic"]} onChange={(value) => updateSection("theme", "spacing", value)} />
      <ControlDivider label="Glow & borders" />
      <SelectControl label="Glow strength" value={config.theme.glowStrength} options={["none", "low", "medium", "high", "nuclear"]} onChange={(value) => updateSection("theme", "glowStrength", value)} />
      <SelectControl label="Border strength" value={config.theme.borderStrength} options={["none", "subtle", "clear", "bright"]} onChange={(value) => updateSection("theme", "borderStrength", value)} />
      <Slider label="Global glow opacity" value={config.theme.globalGlowOpacity} min={0} max={100} suffix="%" onChange={(value) => updateSection("theme", "globalGlowOpacity", value)} />
      <Slider label="Global glow blur" value={config.theme.globalGlowBlur} min={0} max={80} suffix="px" onChange={(value) => updateSection("theme", "globalGlowBlur", value)} />
      <Slider label="Border opacity" value={config.theme.borderOpacity} min={0} max={100} suffix="%" onChange={(value) => updateSection("theme", "borderOpacity", value)} />
      <ControlDivider label="Background" />
      <Slider label="Grid opacity" value={config.theme.backgroundGridOpacity} min={0} max={100} suffix="%" onChange={(value) => updateSection("theme", "backgroundGridOpacity", value)} />
      <Slider label="Vignette strength" value={config.theme.backgroundVignetteStrength} min={0} max={100} suffix="%" onChange={(value) => updateSection("theme", "backgroundVignetteStrength", value)} />
      <ControlDivider label="Motion" />
      <SelectControl label="Animation intensity" value={config.theme.animationIntensity} options={["none", "subtle", "medium", "flashy"]} onChange={(value) => updateSection("theme", "animationIntensity", value)} />
      <Slider label="Motion duration" value={config.theme.motionDuration} min={80} max={1200} suffix="ms" onChange={(value) => updateSection("theme", "motionDuration", value)} />
      <Slider label="Hover lift" value={config.theme.hoverLift} min={0} max={18} suffix="px" onChange={(value) => updateSection("theme", "hoverLift", value)} />
    </>
  );
}

function ButtonControls({ config, updateSection }: { config: LabEditorConfig; updateSection: UpdateSection }) {
  return (
    <>
      <ControlDivider label="Style & intent" />
      <SelectControl label="Button style" value={config.button.buttonStyle} options={["solid", "gradient", "glass", "outline", "neon"]} onChange={(value) => updateSection("button", "buttonStyle", value)} />
      <SelectControl label="Primary intent" value={config.button.primaryIntent} options={["cyan", "purple", "ember", "serpent"]} onChange={(value) => updateSection("button", "primaryIntent", value)} />
      <SelectControl label="Draft button intent" value={config.button.draftButtonIntent} options={["ember", "red alert", "solar", "white hot"]} onChange={(value) => updateSection("button", "draftButtonIntent", value)} />
      <ControlDivider label="Shape & size" />
      <SelectControl label="Button shape" value={config.button.buttonShape} options={["sharp", "soft", "pillowy"]} onChange={(value) => updateSection("button", "buttonShape", value)} />
      <Slider label="Button height" value={config.button.buttonHeight} min={28} max={64} suffix="px" onChange={(value) => updateSection("button", "buttonHeight", value)} />
      <Slider label="Button radius" value={config.button.buttonRadius} min={4} max={32} suffix="px" onChange={(value) => updateSection("button", "buttonRadius", value)} />
      <Slider label="Button padding-x" value={config.button.buttonPaddingX} min={10} max={32} suffix="px" onChange={(value) => updateSection("button", "buttonPaddingX", value)} />
      <Slider label="Button text size" value={config.button.buttonTextSize} min={11} max={18} suffix="px" onChange={(value) => updateSection("button", "buttonTextSize", value)} />
      <ControlDivider label="Glow & border" />
      <Slider label="Button border opacity" value={config.button.buttonBorderOpacity} min={0} max={100} suffix="%" onChange={(value) => updateSection("button", "buttonBorderOpacity", value)} />
      <Slider label="Button glow opacity" value={config.button.buttonGlowOpacity} min={0} max={100} suffix="%" onChange={(value) => updateSection("button", "buttonGlowOpacity", value)} />
      <Slider label="Button glow blur" value={config.button.buttonGlowBlur} min={0} max={60} suffix="px" onChange={(value) => updateSection("button", "buttonGlowBlur", value)} />
      <Slider label="Gradient blend" value={config.button.gradientBlendIntensity} min={0} max={100} suffix="%" onChange={(value) => updateSection("button", "gradientBlendIntensity", value)} />
      <ControlDivider label="Interaction" />
      <SelectControl label="Hover effect" value={config.button.hoverEffect} options={["none", "lift", "brighten", "glow flare", "scanline"]} onChange={(value) => updateSection("button", "hoverEffect", value)} />
      <SelectControl label="Press effect" value={config.button.pressEffect} options={["none", "compress", "flash", "ripple"]} onChange={(value) => updateSection("button", "pressEffect", value)} />
      <Slider label="Hover lift" value={config.button.hoverLift} min={0} max={12} suffix="px" onChange={(value) => updateSection("button", "hoverLift", value)} />
      <Slider label="Press scale" value={config.button.pressScale} min={0.92} max={1} step={0.01} onChange={(value) => updateSection("button", "pressScale", value)} />
      <ControlDivider label="Disabled state" />
      <SelectControl label="Disabled style" value={config.button.disabledStyle} options={["dim", "locked", "ghosted"]} onChange={(value) => updateSection("button", "disabledStyle", value)} />
      <Slider label="Disabled opacity" value={config.button.disabledOpacity} min={20} max={80} suffix="%" onChange={(value) => updateSection("button", "disabledOpacity", value)} />
    </>
  );
}

function PreviewTarget({ label, affectedBy, children }: { label: string; affectedBy: string; children: React.ReactNode }) {
  return (
    <div data-testid="preview-target" className="min-w-0 rounded-2xl border border-cyan-200/12 bg-cyan-200/[0.025] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <p className="text-xs font-black uppercase text-cyan-100">{label}</p>
        <p className="text-[0.68rem] font-bold text-slate-400">{affectedBy}</p>
      </div>
      <div className="min-w-0 pb-2">{children}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const controlId = slugify(label);

  return (
    <label data-control-label={label} data-control-kind="toggle" className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <input data-testid={`toggle-${controlId}`} type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-300" />
    </label>
  );
}

function SelectControl<Option extends string>({ label, value, options, onChange }: { label: string; value: Option; options: Option[]; onChange: (value: Option) => void }) {
  const controlId = slugify(label);

  return (
    <label data-control-label={label} data-control-kind="select" className="grid gap-1 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <select data-testid={`select-${controlId}`} value={value} onChange={(event) => onChange(event.target.value as Option)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-200/50">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const controlId = slugify(label);

  function updateValue(nextValue: number) {
    const clamped = Math.min(max, Math.max(min, nextValue));
    onChange(clamped);
  }

  return (
    <label data-control-label={label} data-control-kind="slider" className="grid gap-1 text-sm font-bold text-slate-200">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-xs text-cyan-100">{formatNumber(value)}{suffix}</span>
      </span>
      <span className="grid grid-cols-[1fr_5.5rem] gap-2">
        <input
          data-testid={`slider-range-${controlId}`}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onInput={(event) => updateValue(Number(event.currentTarget.value))}
          onChange={(event) => updateValue(Number(event.currentTarget.value))}
          className="w-full accent-cyan-300"
        />
        <input
          data-testid={`slider-number-${controlId}`}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onInput={(event) => updateValue(Number(event.currentTarget.value))}
          onChange={(event) => updateValue(Number(event.currentTarget.value))}
          className="h-8 rounded-lg border border-white/10 bg-black/35 px-2 text-right font-mono text-xs text-white outline-none focus:border-cyan-200/45"
        />
      </span>
    </label>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mergeConfig(value: unknown): LabEditorConfig {
  const next = value as Partial<LabEditorConfig>;
  return {
    playerCard: { ...labEditorDefaults.playerCard, ...(next.playerCard ?? {}) },
    rosterSlot: { ...labEditorDefaults.rosterSlot, ...(next.rosterSlot ?? {}) },
    orgCard: { ...labEditorDefaults.orgCard, ...(next.orgCard ?? {}) },
    board: { ...labEditorDefaults.board, ...(next.board ?? {}) },
    theme: { ...labEditorDefaults.theme, ...(next.theme ?? {}) },
    button: { ...labEditorDefaults.button, ...(next.button ?? {}) },
    ghostQueue: { ...labEditorDefaults.ghostQueue, ...(next.ghostQueue ?? {}) },
  };
}

function buildBoardOrgs(config: LabEditorConfig): OrgRoster[] {
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

function getGridTemplateColumns(config: LabEditorConfig): string {
  const minWidth = config.board.teamCount >= 9 ? 220 : 240;
  if (config.board.layoutPreset === "4-4") return "repeat(4, minmax(0, 1fr))";
  if (config.board.layoutPreset === "5-4") return "repeat(5, minmax(0, 1fr))";
  if (config.board.layoutPreset === "4-5") return "repeat(4, minmax(0, 1fr))";
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}

function getCornerStylePresets(style: CornerStyle) {
  if (style === "sharp") return { cardRadius: 6, orgCardRadius: 8, slotRadius: 4, buttonRadius: 6 };
  if (style === "pillowy") return { cardRadius: 32, orgCardRadius: 32, slotRadius: 20, buttonRadius: 28 };
  return { cardRadius: 20, orgCardRadius: 20, slotRadius: 12, buttonRadius: 14 };
}

function getThemeRadius(config: LabEditorConfig) {
  if (config.theme.cornerStyle === "sharp") return 8;
  if (config.theme.cornerStyle === "pillowy") return 28;
  return 18;
}

function getThemeClass(config: LabEditorConfig) {
  if (config.theme.theme === "purple plasma") return "bg-[radial-gradient(circle_at_20%_0%,rgba(217,70,239,0.2),transparent_30rem),linear-gradient(135deg,#05030a,#111027_55%,#05030a)]";
  if (config.theme.theme === "solar ember") return "bg-[radial-gradient(circle_at_25%_0%,rgba(251,146,60,0.2),transparent_30rem),linear-gradient(135deg,#080604,#17100b_55%,#050505)]";
  if (config.theme.theme === "dark temple") return "bg-[linear-gradient(135deg,#020305,#090d14_55%,#020305)]";
  return "bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.16),transparent_30rem),linear-gradient(135deg,#05070d,#08111f_55%,#05070d)]";
}

function getPreviewPanelGapClass(config: LabEditorConfig) {
  if (config.theme.spacing === "compact") return "gap-3";
  if (config.theme.spacing === "cinematic") return "gap-8";
  return "gap-5";
}

function readStoredConfig(): LabEditorConfig {
  if (typeof window === "undefined") return labEditorDefaults;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) return mergeConfig(JSON.parse(stored));
  } catch {}
  return labEditorDefaults;
}

function readStoredMessage(): string {
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
