"use client";

import { type RefObject } from "react";
import { GhostQueueCard } from "@/components/card-lab/GhostQueueCard";
import { OrgRosterCard } from "@/components/card-lab/OrgRosterCard";
import { players } from "@/data/mock-card-lab";
import { sliceBoardRows } from "@/lib/lab-utils";
import type { LabEditorConfig } from "@/types/lab-editor";
import type { OrgRoster } from "@/types/card-lab";
import { cn } from "@/lib/utils";

// ─── Shared board team grid (used by both preview and canvas) ─────────────────

export function BoardTeamGrid({
  config,
  boardOrgs,
}: {
  config: LabEditorConfig;
  boardOrgs: OrgRoster[];
}) {
  return (
    <div className="flex flex-col" style={{ gap: `${config.board.rowGap}px` }}>
      {sliceBoardRows(boardOrgs, config.board.teamCount, config.board.layoutPreset).map(
        ({ orgs, startIndex }, rowIndex) => (
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
        ),
      )}
    </div>
  );
}

// ─── Stream canvas (1920×1080 / 1280×720) ────────────────────────────────────

export type CanvasSize = "preview" | "1920x1080" | "1280x720";

export function BoardCanvas({
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

  // Auto-fit: scale the board grid so it fits within the canvas (both width and height).
  const canvasPad = 64; // p-8 = 32px × 2
  const CANVAS_GAP = 16; // gap-4 between canvas flex children

  // Width fit — card CSS width = orgCardWidth × orgCardScale, so include the scale
  const usableW = Math.min(canvasW - canvasPad, config.board.boardMaxWidth);
  const rows = sliceBoardRows(boardOrgs, config.board.teamCount, config.board.layoutPreset);
  const maxTeamsPerRow = Math.max(...rows.map((r) => r.orgs.length), 1);
  const naturalRowW =
    maxTeamsPerRow * config.orgCard.orgCardWidth * config.orgCard.orgCardScale +
    (maxTeamsPerRow - 1) * config.board.boardGap;
  const widthFitScale = naturalRowW > usableW ? usableW / naturalRowW : 1;

  // Height fit — estimate card natural height from config values
  const bannerTotalH = config.board.showTopBanner ? 90 + CANVAS_GAP : 0; // actual banner ~88px, round up
  // Captain mode shows ghost queue at bottom (~135px) instead of recent picks (~120px)
  const picksVisible = config.board.showRecentPicksWidget && config.board.viewMode !== "captain";
  const bottomWidgetH = config.board.viewMode === "captain"
    ? 135 + CANVAS_GAP  // ghost queue: p-3(24) + card p-16(32) + avatar(56) + text(27) ≈ 135px
    : picksVisible ? 120 + CANVAS_GAP : 0;
  const boardAreaH = canvasH - canvasPad - bannerTotalH - bottomWidgetH - 24; // 24px safety margin

  // Captain block: p-3 top/bot(24) + label line(17) + mb-2(8) + avatar row size-11(44) = 93px; +space-y-3(12)
  const captainBlockH = config.orgCard.showCaptainLockedSlot ? 94 + 12 : 0;
  // Slots use minHeight: slotHeight, but content (name 24 + mt-1 4 + role pill 18 = 46px + 2×slotPadding)
  // can push them taller than slotHeight
  const effectiveSlotH = Math.max(
    config.rosterSlot.slotHeight,
    config.rosterSlot.slotPadding * 2 + 48,
  );
  const slotGridH =
    config.orgCard.rosterSize * effectiveSlotH +
    (config.orgCard.rosterSize - 1) * 8; // gap-2
  const cardNaturalH =
    config.orgCard.headerHeight +
    config.orgCard.orgCardPadding * 2 +
    captainBlockH + slotGridH;

  // Extra vertical padding so active-card scale() doesn't clip against the container edges
  const activePad = config.board.activeCardScale > 1
    ? Math.ceil((config.board.activeCardScale - 1) * 0.5 * cardNaturalH)
    : 0;

  const boardNaturalH =
    rows.length * cardNaturalH +
    (rows.length - 1) * config.board.rowGap +
    activePad * 2; // top + bottom overflow buffer
  const heightFitScale = boardNaturalH > boardAreaH ? boardAreaH / boardNaturalH : 1;

  const fitScale = Math.min(widthFitScale, heightFitScale);
  const effectiveBoardScale = config.board.boardScale * fitScale;
  const boardVisualH = Math.round(boardNaturalH * effectiveBoardScale);

  return (
    <div
      ref={containerRef}
      data-testid="sal-canvas"
      className="w-full overflow-hidden rounded-2xl border border-white/15"
      style={{ height: scaledH > 0 ? `${scaledH}px` : "620px" }}
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
            className="min-w-0 w-full mx-auto overflow-hidden"
            style={{
              maxWidth: `${config.board.boardMaxWidth}px`,
              height: `${boardVisualH}px`,
            }}
          >
            <div
              style={{
                paddingTop: activePad > 0 ? `${activePad}px` : undefined,
                paddingBottom: activePad > 0 ? `${activePad}px` : undefined,
                transform: effectiveBoardScale !== 1 ? `scale(${effectiveBoardScale})` : undefined,
                transformOrigin: "top center",
              }}
            >
              <BoardTeamGrid config={config} boardOrgs={boardOrgs} />
            </div>
          </div>

          {config.board.viewMode === "captain" ? (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.04] p-3">
              <GhostQueueCard player={players[4]} queuePosition={1} editorConfig={config} />
              <GhostQueueCard player={players[0]} queuePosition={2} editorConfig={config} />
            </div>
          ) : picksVisible ? (
            <div
              className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(players.length, 5)}, 1fr)` }}
            >
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
