import { AvatarMark, GlowPanel, OrgLogo, RolePill, StatusChip } from "@/components/card-lab/ui";
import { RosterSlotCard } from "@/components/card-lab/RosterSlotCard";
import type { OrgRoster, RosterSlot } from "@/types/card-lab";
import type { LabEditorConfig } from "@/types/lab-editor";
import { cn } from "@/lib/utils";

export function OrgRosterCard({ org, editorConfig }: { org: OrgRoster; editorConfig?: LabEditorConfig }) {
  const orgConfig = editorConfig?.orgCard;
  const visibleSlots = padSlots(org.slots, orgConfig?.rosterSize ?? org.slots.length);
  const active = orgConfig?.activeState === false ? false : org.state === "active";

  return (
    <GlowPanel
      data-testid="org-roster-card"
      active={active}
      editorConfig={editorConfig}
      className="h-full shrink-0"
      style={{
        width: orgConfig ? `${Math.round(orgConfig.orgCardWidth * orgConfig.orgCardScale)}px` : undefined,
        maxWidth: "100%",
        borderRadius: orgConfig ? `${orgConfig.orgCardRadius}px` : undefined,
        boxShadow: active && orgConfig ? `0 0 ${Math.round(48 * (orgConfig.activeGlowIntensity / 100))}px rgba(251,146,60,${Math.max(0.08, orgConfig.activeGlowIntensity / 220)})` : undefined,
      }}
    >
      <div
        className={cn("bg-gradient-to-br p-4", org.headerGradient)}
        style={{
          minHeight: orgConfig ? `${orgConfig.headerHeight}px` : undefined,
          padding: orgConfig ? `${orgConfig.orgCardPadding}px` : undefined,
          opacity: orgConfig?.headerIntensity === "low" ? 0.72 : orgConfig?.headerIntensity === "medium" ? 0.87 : 1,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <OrgLogo
              initials={org.logoInitials}
              gradient={org.headerGradient}
              className="size-12"
              style={{
                height: orgConfig ? `${orgConfig.orgLogoSize}px` : undefined,
                width: orgConfig ? `${orgConfig.orgLogoSize}px` : undefined,
              }}
            />
            <div className="min-w-0">
              <h3 className="truncate text-xl font-black text-white">{org.name}</h3>
              <p className="text-xs font-bold uppercase text-white/65">Draft position {org.draftPosition}</p>
            </div>
          </div>
          {active ? <StatusChip status="active" /> : <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.68rem] font-bold uppercase text-white/60">Waiting</span>}
        </div>
      </div>

      <div className="space-y-3 p-4" style={{ padding: orgConfig ? `${orgConfig.orgCardPadding}px` : undefined }}>
        {orgConfig?.showCaptainLockedSlot === false ? null : <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-[0.68rem] font-black uppercase tracking-normal text-slate-500">Captain locked</div>
          <div className="flex items-center gap-3">
            <AvatarMark initials={org.captain.avatarInitials} gradient={org.captain.avatarGradient} className="size-11 rounded-xl text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-white">{org.captain.ign}</p>
              <p className="truncate text-xs font-medium text-slate-400">@{org.captain.discordUsername}</p>
            </div>
            <RolePill role={org.captain.primaryRole} compact />
          </div>
        </div>}

        <div className="grid gap-2">
          {visibleSlots.map((slot) => (
            <RosterSlotCard key={`${org.id}-${slot.slotNumber}`} slot={slot} compact editorConfig={editorConfig} />
          ))}
        </div>
      </div>
    </GlowPanel>
  );
}

function padSlots(slots: RosterSlot[], rosterSize: number) {
  const next = slots.slice(0, rosterSize);

  for (let slotNumber = next.length + 1; slotNumber <= rosterSize; slotNumber += 1) {
    next.push({ slotNumber, state: "empty" });
  }

  return next;
}
