import { ToggleRow, Slider, SelectControl } from "../primitives";
import type { LabEditorConfig, UpdateSection } from "@/types/lab-editor";

export function PlayerCardControls({
  config,
  updateSection,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
}) {
  return (
    <>
      <SelectControl label="Density" value={config.playerCard.density} options={["compact", "standard", "full"]} onChange={(v) => updateSection("playerCard", "density", v)} />
      <ToggleRow label="Banner" value={config.playerCard.showBanner} onChange={(v) => updateSection("playerCard", "showBanner", v)} />
      <ToggleRow label="Timezone" value={config.playerCard.showTimezone} onChange={(v) => updateSection("playerCard", "showTimezone", v)} />
      <ToggleRow label="Tags" value={config.playerCard.showTags} onChange={(v) => updateSection("playerCard", "showTags", v)} />
      <ToggleRow label="Discord username" value={config.playerCard.showDiscordUsername} onChange={(v) => updateSection("playerCard", "showDiscordUsername", v)} />
      <ToggleRow label="Org/free agent badge" value={config.playerCard.showOrgBadge} onChange={(v) => updateSection("playerCard", "showOrgBadge", v)} />
      <Slider label="Card scale" value={config.playerCard.cardScale} min={0.75} max={1.35} step={0.01} onChange={(v) => updateSection("playerCard", "cardScale", v)} />
      <Slider label="Card width" value={config.playerCard.cardWidth} min={220} max={420} suffix="px" onChange={(v) => updateSection("playerCard", "cardWidth", v)} />
      <Slider label="Card radius" value={config.playerCard.cardRadius} min={4} max={40} suffix="px" onChange={(v) => updateSection("playerCard", "cardRadius", v)} />
      <Slider label="Card padding" value={config.playerCard.cardPadding} min={8} max={32} suffix="px" onChange={(v) => updateSection("playerCard", "cardPadding", v)} />
      <Slider label="Banner height" value={config.playerCard.bannerHeight} min={40} max={180} suffix="px" onChange={(v) => updateSection("playerCard", "bannerHeight", v)} />
      <Slider label="Avatar size" value={config.playerCard.avatarSize} min={32} max={96} suffix="px" onChange={(v) => updateSection("playerCard", "avatarSize", v)} />
      <Slider label="Tag size" value={config.playerCard.tagSize} min={10} max={18} suffix="px" onChange={(v) => updateSection("playerCard", "tagSize", v)} />
    </>
  );
}
