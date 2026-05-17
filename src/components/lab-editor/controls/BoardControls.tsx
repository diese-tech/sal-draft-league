import { ToggleRow, Slider, SelectControl } from "../primitives";
import type { LabEditorConfig, UpdateSection } from "@/types/lab-editor";
import { getBoardRows } from "@/lib/lab-utils";

export function BoardControls({
  config,
  updateSection,
  onTeamCountChange,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
  onTeamCountChange: (value: 6 | 7 | 8 | 9 | 10) => void;
}) {
  return (
    <>
      <SelectControl
        label="Team count"
        value={String(config.board.teamCount) as "6" | "7" | "8" | "9" | "10"}
        options={["6", "7", "8", "9", "10"]}
        onChange={(v) => onTeamCountChange(Number(v) as 6 | 7 | 8 | 9 | 10)}
      />
      <SelectControl label="Layout preset" value={config.board.layoutPreset} options={["balanced", "4-4", "5-4", "4-5"]} onChange={(v) => updateSection("board", "layoutPreset", v)} />
      <Slider label="Active team index" value={config.board.activeTeamIndex} min={0} max={config.board.teamCount - 1} onChange={(v) => updateSection("board", "activeTeamIndex", Math.round(v))} />
      <SelectControl label="View mode" value={config.board.viewMode} options={["spectator", "captain", "caster"]} onChange={(v) => updateSection("board", "viewMode", v)} />
      <p className="text-[0.65rem] font-semibold text-slate-500">
        Spectator: no queue. Captain: ghost queue shown, no recent picks. Caster: all elements visible.
      </p>
      <ToggleRow label="Recent picks widget" value={config.board.showRecentPicksWidget} onChange={(v) => updateSection("board", "showRecentPicksWidget", v)} />
      <ToggleRow label="Top banner" value={config.board.showTopBanner} onChange={(v) => updateSection("board", "showTopBanner", v)} />
      <Slider label="Board max width" value={config.board.boardMaxWidth} min={900} max={1800} suffix="px" onChange={(v) => updateSection("board", "boardMaxWidth", v)} />
      <Slider label="Board gap" value={config.board.boardGap} min={8} max={40} suffix="px" onChange={(v) => updateSection("board", "boardGap", v)} />
      <Slider label="Row gap" value={config.board.rowGap} min={8} max={48} suffix="px" onChange={(v) => updateSection("board", "rowGap", v)} />
      <Slider label="Board scale" value={config.board.boardScale} min={0.7} max={1.2} step={0.01} onChange={(v) => updateSection("board", "boardScale", v)} />
      <p className="text-[0.65rem] font-semibold text-slate-500">
        Board scale is the stream design value and stacks on top of editor preview zoom.
      </p>
      <Slider label="Inactive card opacity" value={config.board.inactiveCardOpacity} min={45} max={100} suffix="%" onChange={(v) => updateSection("board", "inactiveCardOpacity", v)} />
      <Slider label="Active card scale" value={config.board.activeCardScale} min={1} max={1.2} step={0.01} onChange={(v) => updateSection("board", "activeCardScale", v)} />
      <p className="mt-1 text-[0.65rem] font-semibold text-slate-500">
        Layout: {config.board.layoutPreset} → [{getBoardRows(config.board.teamCount, config.board.layoutPreset).join(", ")}]
      </p>
    </>
  );
}
