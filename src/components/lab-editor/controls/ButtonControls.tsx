import { Slider, SelectControl, ControlDivider } from "../primitives";
import type { LabEditorConfig, UpdateSection } from "@/types/lab-editor";

export function ButtonControls({
  config,
  updateSection,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
}) {
  return (
    <>
      <ControlDivider label="Style & intent" />
      <SelectControl label="Button style" value={config.button.buttonStyle} options={["solid", "gradient", "glass", "outline", "neon"]} onChange={(v) => updateSection("button", "buttonStyle", v)} />
      <SelectControl label="Primary intent" value={config.button.primaryIntent} options={["cyan", "purple", "ember", "serpent"]} onChange={(v) => updateSection("button", "primaryIntent", v)} />
      <SelectControl label="Draft button intent" value={config.button.draftButtonIntent} options={["ember", "red alert", "solar", "white hot"]} onChange={(v) => updateSection("button", "draftButtonIntent", v)} />
      <ControlDivider label="Shape & size" />
      <SelectControl label="Button shape" value={config.button.buttonShape} options={["sharp", "soft", "pillowy"]} onChange={(v) => updateSection("button", "buttonShape", v)} />
      <Slider label="Button height" value={config.button.buttonHeight} min={28} max={64} suffix="px" onChange={(v) => updateSection("button", "buttonHeight", v)} />
      <Slider label="Button radius" value={config.button.buttonRadius} min={4} max={32} suffix="px" onChange={(v) => updateSection("button", "buttonRadius", v)} />
      <Slider label="Button padding-x" value={config.button.buttonPaddingX} min={10} max={32} suffix="px" onChange={(v) => updateSection("button", "buttonPaddingX", v)} />
      <Slider label="Button text size" value={config.button.buttonTextSize} min={11} max={18} suffix="px" onChange={(v) => updateSection("button", "buttonTextSize", v)} />
      <ControlDivider label="Glow & border" />
      <Slider label="Button border opacity" value={config.button.buttonBorderOpacity} min={0} max={100} suffix="%" onChange={(v) => updateSection("button", "buttonBorderOpacity", v)} />
      <Slider label="Button glow opacity" value={config.button.buttonGlowOpacity} min={0} max={100} suffix="%" onChange={(v) => updateSection("button", "buttonGlowOpacity", v)} />
      <Slider label="Button glow blur" value={config.button.buttonGlowBlur} min={0} max={60} suffix="px" onChange={(v) => updateSection("button", "buttonGlowBlur", v)} />
      <Slider label="Gradient blend intensity" value={config.button.gradientBlendIntensity} min={0} max={100} suffix="%" onChange={(v) => updateSection("button", "gradientBlendIntensity", v)} />
      <ControlDivider label="Interaction" />
      <SelectControl label="Hover effect" value={config.button.hoverEffect} options={["none", "lift", "brighten", "glow flare", "scanline"]} onChange={(v) => updateSection("button", "hoverEffect", v)} />
      <SelectControl label="Press effect" value={config.button.pressEffect} options={["none", "compress", "flash", "ripple"]} onChange={(v) => updateSection("button", "pressEffect", v)} />
      <Slider label="Hover lift" value={config.button.hoverLift} min={0} max={12} suffix="px" onChange={(v) => updateSection("button", "hoverLift", v)} />
      <Slider label="Press scale" value={config.button.pressScale} min={0.92} max={1} step={0.01} onChange={(v) => updateSection("button", "pressScale", v)} />
      <ControlDivider label="Disabled state" />
      <SelectControl label="Disabled style" value={config.button.disabledStyle} options={["dim", "locked", "ghosted"]} onChange={(v) => updateSection("button", "disabledStyle", v)} />
      <Slider label="Disabled opacity" value={config.button.disabledOpacity} min={20} max={80} suffix="%" onChange={(v) => updateSection("button", "disabledOpacity", v)} />
    </>
  );
}
