import { Slider, SelectControl, ControlDivider } from "../primitives";
import type {
  LabEditorConfig,
  UpdateSection,
  CornerStyle,
  GlowStrength,
  BorderStrength,
  AnimationIntensity,
} from "@/types/lab-editor";

export function ThemeControls({
  config,
  updateSection,
  onCornerStyleChange,
  onGlowStrengthChange,
  onBorderStrengthChange,
  onMotionPresetChange,
}: {
  config: LabEditorConfig;
  updateSection: UpdateSection;
  onCornerStyleChange: (value: CornerStyle) => void;
  onGlowStrengthChange: (value: GlowStrength) => void;
  onBorderStrengthChange: (value: BorderStrength) => void;
  onMotionPresetChange: (value: AnimationIntensity) => void;
}) {
  return (
    <>
      <ControlDivider label="Identity" />
      <SelectControl label="Theme" value={config.theme.theme} options={["cyan serpent", "purple plasma", "solar ember", "dark temple"]} onChange={(v) => updateSection("theme", "theme", v)} />
      <SelectControl label="Background style" value={config.theme.backgroundStyle} options={["grid", "smoke", "clean"]} onChange={(v) => updateSection("theme", "backgroundStyle", v)} />
      <SelectControl label="Corner style" value={config.theme.cornerStyle} options={["sharp", "soft", "pillowy"]} onChange={onCornerStyleChange} />
      <SelectControl label="Editor panel spacing" value={config.theme.spacing} options={["compact", "balanced", "cinematic"]} onChange={(v) => updateSection("theme", "spacing", v)} />
      <p className="text-[0.65rem] font-semibold text-slate-500">Controls gap between editor sections only — not card or board spacing.</p>
      <ControlDivider label="Glow & border presets — sets fine-grain sliders" />
      <SelectControl label="Glow preset" value={config.theme.glowStrength} options={["none", "low", "medium", "high", "nuclear"]} onChange={onGlowStrengthChange} />
      <SelectControl label="Border preset" value={config.theme.borderStrength} options={["none", "subtle", "clear", "bright"]} onChange={onBorderStrengthChange} />
      <ControlDivider label="Fine-grain controls" />
      <Slider label="Global glow opacity" value={config.theme.globalGlowOpacity} min={0} max={100} suffix="%" onChange={(v) => updateSection("theme", "globalGlowOpacity", v)} />
      <Slider label="Global glow blur" value={config.theme.globalGlowBlur} min={0} max={80} suffix="px" onChange={(v) => updateSection("theme", "globalGlowBlur", v)} />
      <Slider label="Border opacity" value={config.theme.borderOpacity} min={0} max={100} suffix="%" onChange={(v) => updateSection("theme", "borderOpacity", v)} />
      <ControlDivider label="Background" />
      <Slider label="Background grid opacity" value={config.theme.backgroundGridOpacity} min={0} max={100} suffix="%" onChange={(v) => updateSection("theme", "backgroundGridOpacity", v)} />
      <Slider label="Background vignette strength" value={config.theme.backgroundVignetteStrength} min={0} max={100} suffix="%" onChange={(v) => updateSection("theme", "backgroundVignetteStrength", v)} />
      <ControlDivider label="Motion preset — sets fine-grain sliders" />
      <SelectControl label="Motion preset" value={config.theme.animationIntensity} options={["none", "subtle", "medium", "flashy"]} onChange={onMotionPresetChange} />
      <ControlDivider label="Fine-grain controls" />
      <Slider label="Motion duration" value={config.theme.motionDuration} min={80} max={1200} suffix="ms" onChange={(v) => updateSection("theme", "motionDuration", v)} />
      <Slider label="Hover lift" value={config.theme.hoverLift} min={0} max={18} suffix="px" onChange={(v) => updateSection("theme", "hoverLift", v)} />
    </>
  );
}
