import { useState } from "react";
import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import type { PlayerProfile } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";

export function GhostQueueCard({
  player,
  queuePosition,
  editorConfig,
}: {
  player: PlayerProfile;
  queuePosition: number;
  editorConfig?: LabEditorConfig;
}) {
  const [hovered, setHovered] = useState(false);
  const ghost = editorConfig?.ghostQueue;
  const opacity = ghost ? ghost.cardOpacity / 100 : 0.75;
  const hoverOpacity = ghost ? ghost.hoverOpacity / 100 : 0.9;
  const radius = ghost?.cardRadius ?? 16;
  const padding = ghost?.cardPadding ?? 16;
  const avatarSize = ghost?.avatarSize ?? 56;
  const borderStyle = ghost?.borderStyle ?? "dashed";

  const borderClass =
    borderStyle === "dashed"
      ? "border-dashed border-cyan-200/25"
      : borderStyle === "solid"
        ? "border-solid border-cyan-200/20"
        : "border-transparent";

  return (
    <article
      className={`relative overflow-hidden border bg-cyan-200/[0.045] backdrop-blur transition duration-300 ${borderClass}`}
      style={{
        opacity: hovered ? hoverOpacity : opacity,
        borderRadius: `${radius}px`,
        padding: `${padding}px`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_10px)]" />
      <div className="relative flex items-center gap-3">
        <AvatarMark
          initials={player.avatarInitials}
          gradient={player.avatarGradient}
          className="shrink-0 rounded-xl text-base"
          style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-lg font-black text-white/80">{player.ign}</p>
            {ghost?.showPosition !== false && (
              <span className="rounded-full border border-cyan-100/20 bg-cyan-100/10 px-2 py-1 text-[0.65rem] font-black uppercase text-cyan-100/70">
                Ghost {queuePosition}
              </span>
            )}
          </div>
          {ghost?.showSubtext !== false && (
            <p className="mt-1 truncate text-xs font-semibold text-slate-400">Private queue preview, not drafted</p>
          )}
          {ghost?.showRoles !== false && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <RolePill role={player.primaryRole} compact />
              {player.secondaryRoles.slice(0, 2).map((role) => (
                <RolePill key={role} role={role} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
