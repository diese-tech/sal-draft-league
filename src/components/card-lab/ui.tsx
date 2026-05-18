import type { PlayerRole, PlayerStatus } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type GlowPanelStyle = CSSProperties & { "--sal-hover-lift"?: string };

const roleStyles: Record<PlayerRole, string> = {
  Solo: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  Jungle: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  Mid: "border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100",
  Carry: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  Support: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  Flex: "border-violet-300/35 bg-violet-300/10 text-violet-100",
};

const statusLabels: Record<PlayerStatus, string> = {
  "free-agent": "Free Agent",
  "org-affiliated": "Org Affiliated",
  drafted: "Drafted",
  "queued-ghost": "Ghost Queued",
  active: "On The Clock",
};

const statusStyles: Record<PlayerStatus, string> = {
  "free-agent": "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  "org-affiliated": "border-violet-300/35 bg-violet-300/10 text-violet-100",
  drafted: "border-zinc-400/25 bg-zinc-300/10 text-zinc-200",
  "queued-ghost": "border-white/20 bg-white/5 text-white/65",
  active: "border-orange-300/55 bg-orange-400/15 text-orange-100 shadow-[0_0_24px_rgba(251,146,60,0.2)]",
};

export function GlowPanel({
  children,
  className,
  active,
  editorConfig,
  style,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  editorConfig?: LabEditorConfig;
  style?: CSSProperties;
  "data-testid"?: string;
}) {
  const theme = editorConfig?.theme;
  const glowPreset = theme?.glowStrength === "none" ? 0 : theme?.glowStrength === "low" ? 0.45 : theme?.glowStrength === "high" ? 1.35 : theme?.glowStrength === "nuclear" ? 1.9 : 1;
  const borderPreset = theme?.borderStrength === "none" ? 0 : theme?.borderStrength === "subtle" ? 0.45 : theme?.borderStrength === "bright" ? 1.7 : 1;
  const motionPreset = theme?.animationIntensity === "none" ? 0 : theme?.animationIntensity === "subtle" ? 0.75 : theme?.animationIntensity === "flashy" ? 1.35 : 1;
  const glowOpacity = Math.min(1, ((theme?.globalGlowOpacity ?? 80) / 100) * glowPreset);
  const borderOpacity = Math.min(1, ((theme?.borderOpacity ?? 10) / 100) * borderPreset);
  const motionDuration = Math.round((theme?.motionDuration ?? 300) * motionPreset);
  const radius =
    theme?.cornerStyle === "sharp" ? 8 : theme?.cornerStyle === "pillowy" ? 28 : undefined;

  const outerGlowBlur = theme?.globalGlowBlur ?? 0;
  const outerGlowPart = outerGlowBlur > 0 && glowOpacity > 0
    ? `, 0 0 ${outerGlowBlur}px rgba(34,211,238,${(Math.min(1, glowOpacity * 0.55)).toFixed(3)})`
    : "";
  const computedBoxShadow = theme
    ? `0 25px 50px -12px rgba(8,47,73,0.4)${outerGlowPart}`
    : undefined;

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "sal-glowpanel group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-950/30 backdrop-blur",
        "transition duration-300 hover:border-cyan-200/25 hover:shadow-cyan-500/10",
        active && "border-orange-300/45 shadow-orange-500/15",
        className,
      )}
      style={{
        "--sal-hover-lift": `${theme?.hoverLift ?? 4}px`,
        borderColor: theme ? `rgba(255,255,255,${Math.max(0.06, borderOpacity)})` : undefined,
        borderRadius: radius,
        transitionDuration: `${motionDuration}ms`,
        boxShadow: computedBoxShadow,
        ...style,
      } as GlowPanelStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.16),transparent_32%)] opacity-80"
        style={{ opacity: theme ? glowOpacity : undefined }}
      />
      {active ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function RolePill({ role, compact = false }: { role: PlayerRole; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold leading-none tracking-normal",
        compact ? "px-2 py-1 text-[0.65rem]" : "px-2.5 py-1.5 text-xs",
        roleStyles[role],
      )}
    >
      {role}
    </span>
  );
}

export function StatusChip({ status, label }: { status: PlayerStatus; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-normal",
        statusStyles[status],
      )}
    >
      {label ?? statusLabels[status]}
    </span>
  );
}

export function AvatarMark({
  initials,
  gradient,
  className,
  style,
}: {
  initials: string;
  gradient: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl border border-white/25 bg-gradient-to-br text-sm font-black text-white shadow-lg shadow-black/30",
        gradient,
        className,
      )}
      style={style}
    >
      {initials}
    </div>
  );
}

export function OrgLogo({
  initials,
  gradient,
  className,
  style,
}: {
  initials: string;
  gradient: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border border-white/20 bg-gradient-to-br text-sm font-black text-white shadow-lg shadow-black/30",
        gradient,
        className,
      )}
      style={style}
    >
      {initials}
    </div>
  );
}
