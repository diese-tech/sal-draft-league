import { AvatarMark, GlowPanel, RolePill, StatusChip } from "@/components/card-lab/ui";
import type { PlayerProfile } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";
import { cn } from "@/lib/utils";

export function PlayerProfileCard({
  player,
  featured = false,
  editorConfig,
}: {
  player: PlayerProfile;
  featured?: boolean;
  editorConfig?: LabEditorConfig;
}) {
  const card = editorConfig?.playerCard;
  const padding = card?.cardPadding ?? 20;

  return (
    <GlowPanel
      active={player.status === "active"}
      editorConfig={editorConfig}
      className={cn("min-h-full shrink-0", featured && "lg:col-span-2")}
      style={{
        width: card ? `${Math.round(card.cardWidth * card.cardScale)}px` : undefined,
        maxWidth: "100%",
        borderRadius: card ? `${card.cardRadius}px` : undefined,
      }}
    >
      {card?.showBanner === false ? null : (
        <div className={cn("h-28 bg-gradient-to-br", player.bannerGradient)} style={{ height: card ? `${card.bannerHeight}px` : undefined }}>
          <div className="h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.28),transparent_18%)]" />
        </div>
      )}
      <div className="px-5 pb-5" style={{ paddingInline: padding, paddingBottom: padding }}>
        <div className="-mt-9 flex items-end justify-between gap-4">
          <AvatarMark
            initials={player.avatarInitials}
            gradient={player.avatarGradient}
            className="size-20 text-xl"
            style={{
              height: card ? `${card.avatarSize}px` : undefined,
              width: card ? `${card.avatarSize}px` : undefined,
            }}
          />
          {card?.showOrgBadge === false ? null : <StatusChip status={player.status} label={player.orgName ?? undefined} />}
        </div>

        <div className="mt-4">
          <h3 className={cn("font-black leading-tight text-white", card?.density === "compact" ? "text-xl" : "text-2xl")}>{player.ign}</h3>
          {card?.showDiscordUsername === false ? null : <p className="mt-1 text-sm font-medium text-slate-400">@{player.discordUsername}</p>}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <RolePill role={player.primaryRole} />
          {player.secondaryRoles.map((role) => (
            <RolePill key={role} role={role} compact />
          ))}
        </div>

        {card?.showTimezone === false ? null : (
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-300">
            <span className="font-semibold text-slate-400">Timezone</span>
            <span className="font-bold text-white">{player.timezone}</span>
          </div>
        )}

        {card?.showTags === false ? null : (
          <div className="mt-4 flex flex-wrap gap-2">
            {player.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-semibold text-slate-300"
                style={{ fontSize: card ? `${card.tagSize}px` : undefined }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </GlowPanel>
  );
}
