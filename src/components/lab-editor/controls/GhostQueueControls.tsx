import { ToggleRow, Slider, SelectControl, ControlDivider } from "../primitives";
import type { LabEditorConfig, UpdateSection, GhostBorderStyle } from "@/types/lab-editor";

export function GhostQueueControls({
  config,
  updateSection,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
}) {
  return (
    <>
      <ControlDivider label="Visibility" />
      <ToggleRow label="Position badge" value={config.ghostQueue.showPosition} onChange={(v) => updateSection("ghostQueue", "showPosition", v)} />
      <ToggleRow label="Role pills" value={config.ghostQueue.showRoles} onChange={(v) => updateSection("ghostQueue", "showRoles", v)} />
      <ToggleRow label="Subtext" value={config.ghostQueue.showSubtext} onChange={(v) => updateSection("ghostQueue", "showSubtext", v)} />
      <ControlDivider label="Opacity" />
      <Slider label="Card opacity" value={config.ghostQueue.cardOpacity} min={10} max={100} suffix="%" onChange={(v) => updateSection("ghostQueue", "cardOpacity", v)} />
      <Slider label="Hover opacity" value={config.ghostQueue.hoverOpacity} min={10} max={100} suffix="%" onChange={(v) => updateSection("ghostQueue", "hoverOpacity", v)} />
      <ControlDivider label="Shape & size" />
      <SelectControl label="Border style" value={config.ghostQueue.borderStyle} options={["dashed", "solid", "none"] as GhostBorderStyle[]} onChange={(v) => updateSection("ghostQueue", "borderStyle", v)} />
      <Slider label="Card radius" value={config.ghostQueue.cardRadius} min={4} max={32} suffix="px" onChange={(v) => updateSection("ghostQueue", "cardRadius", v)} />
      <Slider label="Card padding" value={config.ghostQueue.cardPadding} min={8} max={28} suffix="px" onChange={(v) => updateSection("ghostQueue", "cardPadding", v)} />
      <Slider label="Avatar size" value={config.ghostQueue.avatarSize} min={32} max={80} suffix="px" onChange={(v) => updateSection("ghostQueue", "avatarSize", v)} />
    </>
  );
}
