import { redirect } from "next/navigation";
import { DraftPlayerCard } from "@/components/card-lab/DraftPlayerCard";
import { GhostQueueCard } from "@/components/card-lab/GhostQueueCard";
import { OrgRosterCard } from "@/components/card-lab/OrgRosterCard";
import { PlayerProfileCard } from "@/components/card-lab/PlayerProfileCard";
import { RosterSlotCard } from "@/components/card-lab/RosterSlotCard";
import { orgRosters, players, rosterSlotStates } from "@/data/mock-card-lab";

export default function CardLabPage() {
  if (process.env.NODE_ENV === "production") redirect("/");
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="sal-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <header className="grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-cyan-200">Phase 1 Card Lab</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-none text-white sm:text-6xl">
              Discord-native draft identity for SAL.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-slate-300 sm:text-lg">
              Mock-data component playground for stream-readable player cards, roster slots, ghost queues, and org boards.
            </p>
          </div>
          <div className="rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 shadow-lg shadow-orange-500/10">
            <p className="text-xs font-black uppercase text-orange-100">On the clock</p>
            <p className="mt-1 text-2xl font-black text-white">Helix Reign</p>
            <div className="sal-active-pulse mt-3 h-1 rounded-full bg-gradient-to-r from-orange-300 via-white to-fuchsia-300" />
          </div>
        </header>

        <section className="mt-10">
          <SectionHeading eyebrow="Profiles" title="Avatar-first player identity" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PlayerProfileCard player={players[0]} featured />
            <PlayerProfileCard player={players[1]} />
            <PlayerProfileCard player={players[2]} />
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="Draft pool" title="Compact states for captain overlays" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {players.map((player) => (
              <DraftPlayerCard key={player.id} player={player} />
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading eyebrow="Roster slots" title="Empty, drafted, active, and queued" />
            <div className="mt-5 grid gap-3">
              {rosterSlotStates.map((slot) => (
                <RosterSlotCard key={slot.slotNumber} slot={slot} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeading eyebrow="Ghost queue" title="Predictive but clearly not drafted" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <GhostQueueCard player={players[4]} queuePosition={1} />
              <GhostQueueCard player={players[0]} queuePosition={2} />
            </div>
          </div>
        </section>

        <section className="mt-12 pb-8">
          <SectionHeading eyebrow="Org boards" title="Captain locked, roster slots numbered" />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {orgRosters.map((org) => (
              <OrgRosterCard key={org.id} org={org} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-normal text-cyan-200/80">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{title}</h2>
    </div>
  );
}
