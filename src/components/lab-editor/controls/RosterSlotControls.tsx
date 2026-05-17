import { ToggleRow, Slider, SelectControl } from "../primitives";
import type { LabEditorConfig, UpdateSection } from "@/types/lab-editor";

export function RosterSlotControls({
  config,
  updateSection,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
}) {
  return (
    <>
      <ToggleRow label="Pick numbers" value={config.rosterSlot.showPickNumbers} onChange={(v) => updateSection("rosterSlot", "showPickNumbers", v)} />
      <ToggleRow label="Empty slots" value={config.rosterSlot.showEmptySlots} onChange={(v) => updateSection("rosterSlot", "showEmptySlots", v)} />
      <ToggleRow label="Ghost queue" value={config.rosterSlot.showGhostQueue} onChange={(v) => updateSection("rosterSlot", "showGhostQueue", v)} />
      <SelectControl label="Slot density" value={config.rosterSlot.slotDensity} options={["compact", "standard"]} onChange={(v) => updateSection("rosterSlot", "slotDensity", v)} />
      <SelectControl label="Selected pulse" value={config.rosterSlot.selectedSlotPulse} options={["off", "subtle", "strong"]} onChange={(v) => updateSection("rosterSlot", "selectedSlotPulse", v)} />
      <Slider label="Slot height" value={config.rosterSlot.slotHeight} min={38} max={110} suffix="px" onChange={(v) => updateSection("rosterSlot", "slotHeight", v)} />
      <Slider label="Slot radius" value={config.rosterSlot.slotRadius} min={4} max={28} suffix="px" onChange={(v) => updateSection("rosterSlot", "slotRadius", v)} />
      <Slider label="Slot padding" value={config.rosterSlot.slotPadding} min={6} max={24} suffix="px" onChange={(v) => updateSection("rosterSlot", "slotPadding", v)} />
      <Slider label="Pick number size" value={config.rosterSlot.pickNumberSize} min={10} max={24} suffix="px" onChange={(v) => updateSection("rosterSlot", "pickNumberSize", v)} />
      <Slider label="Ghost opacity" value={config.rosterSlot.ghostOpacity} min={10} max={80} suffix="%" onChange={(v) => updateSection("rosterSlot", "ghostOpacity", v)} />
      <Slider label="Selected pulse strength" value={config.rosterSlot.selectedPulseStrength} min={0} max={100} suffix="%" onChange={(v) => updateSection("rosterSlot", "selectedPulseStrength", v)} />
    </>
  );
}
