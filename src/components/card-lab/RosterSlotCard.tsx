import { AvatarMark, RolePill } from "@/components/card-lab/ui";
import type { RosterSlot } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";
import { cn } from "@/lib/utils";

export function RosterSlotCard({ slot, compact = false, editorConfig }: { slot: RosterSlot; compact?: boolean; editorConfig?: LabEditorConfig }) {
  const player = slot.player ?? slot.projectedPlayer;
  const slotConfig = editorConfig?.rosterSlot;
  const showPickNumber = slotConfig?.showPickNumbers !== false;
  const pulsePreset = slotConfig?.selectedSlotPulse === "off" ? 0 : slotConfig?.selectedSlotPulse === "strong" ? 1.35 : 1;
  const pulseStrength = ((slotConfig?.selectedPulseStrength ?? 16) / 100) * pulsePreset;

  return (
    <div
      className={cn(
        "relative flex min-h-16 items-center gap-3 rounded-xl border p-3 transition duration-300",
        slot.state === "drafted" && "border-white/10 bg-white/[0.055]",
        slot.state === "empty" && "border-dashed border-white/12 bg-white/[0.025]",
        slot.state === "queued-ghost" && "border-dashed border-cyan-200/25 bg-cyan-200/[0.045] opacity-70",
        slot.state === "active" && "border-orange-300/55 bg-orange-400/10 shadow-[0_0_22px_rgba(251,146,60,0.16)]",
      )}
      style={{
        minHeight: slotConfig ? `${slotConfig.slotHeight}px` : undefined,
        borderRadius: slotConfig ? `${slotConfig.slotRadius}px` : undefined,
        padding: slotConfig ? `${slotConfig.slotPadding}px` : undefined,
        opacity: slot.state === "queued-ghost" && slotConfig ? slotConfig.ghostOpacity / 100 : undefined,
        boxShadow:
          slot.state === "active" && slotConfig
            ? `0 0 ${Math.round(44 * pulseStrength)}px rgba(251,146,60,${Math.max(0.08, pulseStrength * 0.45)})`
            : undefined,
      }}
    >
      {showPickNumber ? <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25 text-xs font-black text-slate-300" style={{ fontSize: slotConfig ? `${slotConfig.pickNumberSize}px` : undefined }}>
        {slot.pickNumber ?? slot.slotNumber}
      </div> : null}

      {player ? (
        <>
          <AvatarMark initials={player.avatarInitials} gradient={player.avatarGradient} className="size-10 rounded-xl text-xs" />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-black text-white", compact ? "text-sm" : "text-base")}>{player.ign}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <RolePill role={player.primaryRole} compact />
              {slot.state === "queued-ghost" ? <span className="text-[0.65rem] font-bold uppercase text-cyan-100/60">Projected</span> : null}
            </div>
          </div>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-300">{slot.state === "active" ? "On the clock" : "Open roster slot"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{slot.state === "active" ? "Captain selecting now" : "Awaiting pick"}</p>
        </div>
      )}
    </div>
  );
}
