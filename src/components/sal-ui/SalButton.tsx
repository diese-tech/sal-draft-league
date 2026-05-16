import type { ButtonHTMLAttributes, CSSProperties } from "react";
import type { ButtonEditorConfig, DraftButtonIntent } from "@/types/lab-editor";
import { cn } from "@/lib/utils";

type SalButtonVariant = "primary" | "queue" | "draft" | "notes" | "admin";
type PressStyle = CSSProperties & { "--sal-press-scale"?: string };

const intentColors = {
  cyan: { rgb: "34,211,238", from: "from-cyan-300", to: "to-blue-500", text: "text-cyan-50" },
  purple: { rgb: "217,70,239", from: "from-fuchsia-400", to: "to-violet-600", text: "text-fuchsia-50" },
  ember: { rgb: "251,146,60", from: "from-orange-300", to: "to-rose-600", text: "text-orange-50" },
  serpent: { rgb: "45,212,191", from: "from-teal-300", to: "to-emerald-600", text: "text-teal-50" },
};

const draftIntentMap: Record<DraftButtonIntent, keyof typeof intentColors | "white"> = {
  ember: "ember",
  "red alert": "ember",
  solar: "ember",
  "white hot": "white",
};

export function SalButton({
  children,
  className,
  config,
  variant = "primary",
  disabled,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  config: ButtonEditorConfig;
  variant?: SalButtonVariant;
}) {
  return (
    <button
      className={cn(
        "group relative isolate inline-flex items-center justify-center overflow-hidden border font-black uppercase tracking-normal transition",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        !disabled && "active:translate-y-0.5 active:scale-[var(--sal-press-scale)] active:brightness-125 active:saturate-150 active:[box-shadow:inset_0_2px_18px_rgba(0,0,0,0.48)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
        getButtonClasses(config, variant, disabled),
        className,
      )}
      disabled={disabled}
      style={{ ...getButtonStyle(config, variant, disabled), ...style }}
      {...props}
    >
      {config.hoverEffect === "scanline" ? <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" /> : null}
      {!disabled ? <span className="pointer-events-none absolute inset-0 bg-white opacity-0 mix-blend-screen transition-opacity group-active:opacity-25" /> : null}
      <span className="relative">{children}</span>
    </button>
  );
}

export function getButtonStyle(config: ButtonEditorConfig, variant: SalButtonVariant, disabled?: boolean): PressStyle {
  const color = getVariantColor(config, variant);
  const opacity = disabled ? config.disabledOpacity / 100 : 1;
  const glowOpacity = disabled ? 0 : config.buttonGlowOpacity / 100;
  const pressScale = config.pressEffect === "none" ? 1 : config.pressEffect === "compress" ? config.pressScale : 0.96;
  const shapeRadius = config.buttonShape === "sharp" ? Math.min(config.buttonRadius, 8) : config.buttonShape === "pillowy" ? Math.max(config.buttonRadius, 28) : config.buttonRadius;

  return {
    "--sal-press-scale": String(pressScale),
    minHeight: `${config.buttonHeight}px`,
    borderRadius: `${shapeRadius}px`,
    paddingInline: `${config.buttonPaddingX}px`,
    fontSize: `${config.buttonTextSize}px`,
    borderColor: `rgba(${color.rgb},${config.buttonBorderOpacity / 100})`,
    boxShadow: `0 0 ${config.buttonGlowBlur}px rgba(${color.rgb},${glowOpacity})`,
    opacity,
    transitionDuration: "120ms",
    filter: config.buttonStyle === "gradient" ? `saturate(${1 + config.gradientBlendIntensity / 100})` : undefined,
  } satisfies PressStyle;
}

function getButtonClasses(config: ButtonEditorConfig, variant: SalButtonVariant, disabled?: boolean) {
  const color = getVariantColor(config, variant);

  if (disabled) {
    return cn(
      config.disabledStyle === "ghosted" && "border-dashed bg-white/[0.03] text-white/45",
      config.disabledStyle === "locked" && "border-zinc-500/25 bg-zinc-950 text-zinc-500",
      config.disabledStyle === "dim" && "border-white/10 bg-white/[0.04] text-white/50",
    );
  }

  return cn(
    color.text,
    config.buttonStyle === "solid" && "bg-slate-900",
    config.buttonStyle === "gradient" && `bg-gradient-to-r ${color.from} ${color.to}`,
    config.buttonStyle === "glass" && "bg-white/[0.075] backdrop-blur",
    config.buttonStyle === "outline" && "bg-transparent",
    config.buttonStyle === "neon" && `bg-black ${color.text}`,
    config.hoverEffect === "lift" && "hover:-translate-y-1",
    config.hoverEffect === "brighten" && "hover:brightness-125",
    config.hoverEffect === "glow flare" && "hover:shadow-white/20",
    config.pressEffect === "flash" && "active:bg-white/25",
    config.pressEffect === "ripple" && "active:ring-4 active:ring-white/25",
  );
}

function getVariantColor(config: ButtonEditorConfig, variant: SalButtonVariant) {
  if (variant === "draft") {
    const mapped = draftIntentMap[config.draftButtonIntent];
    if (mapped === "white") {
      return { rgb: "255,255,255", from: "from-white", to: "to-orange-200", text: "text-slate-950" };
    }
    return intentColors[mapped];
  }

  if (variant === "admin") return intentColors.purple;
  if (variant === "queue") return intentColors.serpent;
  if (variant === "notes") return intentColors.cyan;

  return intentColors[config.primaryIntent];
}
