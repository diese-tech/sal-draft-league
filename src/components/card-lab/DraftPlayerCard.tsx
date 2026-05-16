import { AvatarMark, RolePill, StatusChip } from "@/components/card-lab/ui";
import type { PlayerProfile } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";
import { cn } from "@/lib/utils";

export function DraftPlayerCard({ player, editorConfig }: { player: PlayerProfile; editorConfig?: LabEditorConfig }) {
  const ghosted = player.status === "queued-ghost";
  const drafted = player.status === "drafted";
  const card = editorConfig?.playerCard;
  const theme = editorConfig?.theme;

  return (
    <article
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 p-3 shadow-xl shadow-black/30 backdrop-blur transition duration-300",
        "hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-slate-900/85",
        player.status === "active" && "border-orange-300/50 shadow-orange-500/15",
        ghosted && "border-dashed opacity-70",
        drafted && "opacity-55 grayscale",
      )}
      style={{
        width: card ? `${Math.round(card.cardWidth * card.cardScale)}px` : undefined,
        maxWidth: "100%",
        borderRadius: card ? `${card.cardRadius}px` : undefined,
        padding: card ? `${card.cardPadding}px` : undefined,
        transitionDuration: theme ? `${theme.motionDuration}ms` : undefined,
      }}
    >
      {card?.showBanner === false ? null : (
        <>
          <div className={cn("absolute inset-x-0 top-0 h-16 bg-gradient-to-br opacity-80", player.bannerGradient)} style={{ height: card ? `${Math.max(40, card.bannerHeight * 0.58)}px` : undefined }} />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/10 to-slate-950/60" style={{ height: card ? `${Math.max(40, card.bannerHeight * 0.58)}px` : undefined }} />
        </>
      )}
      <div className="relative flex items-start gap-3">
        <AvatarMark
          initials={player.avatarInitials}
          gradient={player.avatarGradient}
          className="size-14 rounded-xl text-base"
          style={{
            height: card ? `${Math.max(32, card.avatarSize * 0.7)}px` : undefined,
            width: card ? `${Math.max(32, card.avatarSize * 0.7)}px` : undefined,
          }}
        />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black leading-tight text-white">{player.ign}</h3>
              {card?.showDiscordUsername === false ? null : <p className="truncate text-xs font-medium text-slate-400">@{player.discordUsername}</p>}
            </div>
            {card?.showOrgBadge === false ? null : <StatusChip status={player.status} />}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <RolePill role={player.primaryRole} compact />
            {player.secondaryRoles.slice(0, 2).map((role) => (
              <RolePill key={role} role={role} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-white/10 pt-3 text-xs font-bold text-slate-300">
        <span>{card?.showTimezone === false ? "" : player.timezone}</span>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-300">Queue</span>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-300">Note</span>
      </div>
    </article>
  );
}
