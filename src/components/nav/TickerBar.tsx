import { getLeagueData } from "@/lib/league-data";
import { cn } from "@/lib/utils";

const DIV_TAG = { solar: "SOL", lunar: "LUN", gaia: "GAI" } as const;
const DIV_COLOR = {
  solar: "text-orange-300",
  lunar: "text-cyan-300",
  gaia: "text-emerald-300",
} as const;
const DIV_SEP_COLOR = {
  solar: "text-orange-500/50",
  lunar: "text-cyan-500/50",
  gaia: "text-emerald-500/50",
} as const;

function shortTime(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${t}`;
}

export async function TickerBar() {
  const { matches, orgs } = await getLeagueData();

  const getOrg = (id: string) => orgs.find((o) => o.id === id);

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
    .slice(0, 8);
  const recent = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .slice(0, 5);

  const items = [...live, ...upcoming, ...recent];

  if (items.length === 0) return null;

  const renderItem = (m: (typeof items)[number], key: string) => {
    const home = getOrg(m.homeOrgId);
    const away = getOrg(m.awayOrgId);
    const divColor = DIV_COLOR[m.divisionId];
    const sepColor = DIV_SEP_COLOR[m.divisionId];
    const tag = DIV_TAG[m.divisionId];

    return (
      <span key={key} className="inline-flex shrink-0 items-center gap-2 px-4">
        {/* Division tag */}
        <span className={cn("font-mono text-[0.72rem] font-semibold", divColor)}>[{tag}]</span>

        {/* Live dot */}
        {m.status === "live" && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 live-pulse" />
        )}

        {/* Teams + score/vs */}
        <span className="text-[0.78rem] font-bold text-white">{home?.tag ?? "?"}</span>
        {m.status === "completed" ? (
          <span className="font-mono text-[0.78rem] font-bold text-slate-300">
            {m.homeScore}:{m.awayScore}
          </span>
        ) : m.status === "live" ? (
          <span className="font-mono text-[0.78rem] font-bold text-orange-200">
            {m.homeScore ?? "–"}:{m.awayScore ?? "–"}
          </span>
        ) : (
          <span className="text-[0.72rem] text-slate-500">vs</span>
        )}
        <span className="text-[0.78rem] font-bold text-white">{away?.tag ?? "?"}</span>

        {/* Status label */}
        {m.status === "live" && (
          <span className="font-mono text-[0.72rem] font-semibold uppercase text-orange-300">· LIVE</span>
        )}
        {m.status === "completed" && (
          <span className="text-[0.72rem] text-slate-500">· Final</span>
        )}
        {m.status === "scheduled" && (
          <span className="text-[0.72rem] text-slate-500">· {shortTime(m.scheduledDate, m.scheduledTime)}</span>
        )}

        {/* Division-colored separator */}
        <span className={cn("ml-2 text-[0.78rem]", sepColor)}>|</span>
      </span>
    );
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-10 overflow-hidden border-b border-white/[0.08] bg-slate-950/95 backdrop-blur"
      aria-hidden="true"
    >
      {/* LIVE FEED label */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent pl-3 pr-8">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-orange-300">Live Feed</span>
      </div>

      {/* Scrolling strip */}
      <div className="flex h-full items-center pl-28">
        {/* Inner div: items × 2 for seamless loop */}
        <div className="sal-ticker flex items-center whitespace-nowrap">
          {items.map((m) => renderItem(m, m.id))}
          {/* Duplicate for seamless loop */}
          {items.map((m) => renderItem(m, `${m.id}-dup`))}
        </div>
      </div>

      {/* Right fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent" />
    </div>
  );
}
