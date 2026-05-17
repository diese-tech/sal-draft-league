import { ToggleRow, Slider, SelectControl } from "../primitives";
import type { LabEditorConfig, UpdateSection } from "@/types/lab-editor";

export function OrgCardControls({
  config,
  updateSection,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
}) {
  return (
    <>
      <SelectControl label="Roster size" value={String(config.orgCard.rosterSize) as "6" | "7" | "8"} options={["6", "7", "8"]} onChange={(v) => updateSection("orgCard", "rosterSize", Number(v) as 6 | 7 | 8)} />
      <ToggleRow label="Captain locked slot" value={config.orgCard.showCaptainLockedSlot} onChange={(v) => updateSection("orgCard", "showCaptainLockedSlot", v)} />
      <ToggleRow label="Active state" value={config.orgCard.activeState} onChange={(v) => updateSection("orgCard", "activeState", v)} />
      <SelectControl label="Header intensity" value={config.orgCard.headerIntensity} options={["low", "medium", "high"]} onChange={(v) => updateSection("orgCard", "headerIntensity", v)} />
      <Slider label="Org card scale" value={config.orgCard.orgCardScale} min={0.75} max={1.25} step={0.01} onChange={(v) => updateSection("orgCard", "orgCardScale", v)} />
      <Slider label="Org card width" value={config.orgCard.orgCardWidth} min={260} max={520} suffix="px" onChange={(v) => updateSection("orgCard", "orgCardWidth", v)} />
      <Slider label="Org card radius" value={config.orgCard.orgCardRadius} min={8} max={44} suffix="px" onChange={(v) => updateSection("orgCard", "orgCardRadius", v)} />
      <Slider label="Org card padding" value={config.orgCard.orgCardPadding} min={10} max={36} suffix="px" onChange={(v) => updateSection("orgCard", "orgCardPadding", v)} />
      <Slider label="Org logo size" value={config.orgCard.orgLogoSize} min={32} max={96} suffix="px" onChange={(v) => updateSection("orgCard", "orgLogoSize", v)} />
      <Slider label="Header height" value={config.orgCard.headerHeight} min={70} max={180} suffix="px" onChange={(v) => updateSection("orgCard", "headerHeight", v)} />
      <Slider label="Active glow intensity" value={config.orgCard.activeGlowIntensity} min={0} max={100} suffix="%" onChange={(v) => updateSection("orgCard", "activeGlowIntensity", v)} />
    </>
  );
}
