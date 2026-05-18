"use client";

import type { DivisionId, MatchStatus } from "@/types/league";
import { cn } from "@/lib/utils";

const DIVISIONS: { id: DivisionId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "solar", label: "Solar" },
  { id: "lunar", label: "Lunar" },
  { id: "gaia", label: "Gaia" },
];

const STATUSES: { id: MatchStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "postponed", label: "Postponed" },
];

const divisionActive: Record<DivisionId, string> = {
  solar: "border-orange-300/40 bg-orange-300/15 text-orange-100",
  lunar: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
  gaia: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
};

const allActive = "border-white/25 bg-white/10 text-white";
const inactiveBtn = "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200";

export function ScheduleFilters({
  division,
  status,
  week,
  maxWeek,
  onDivisionChange,
  onStatusChange,
  onWeekChange,
}: {
  division: DivisionId | "all";
  status: MatchStatus | "all";
  week: number | "all";
  maxWeek: number;
  onDivisionChange: (v: DivisionId | "all") => void;
  onStatusChange: (v: MatchStatus | "all") => void;
  onWeekChange: (v: number | "all") => void;
}) {
  const weeks = ["all", ...Array.from({ length: maxWeek }, (_, i) => i + 1)] as (number | "all")[];

  return (
    <div className="flex flex-wrap gap-5">
      {/* Division */}
      <div>
        <p className="mb-2 text-[0.65rem] font-black uppercase text-slate-500">Division</p>
        <div className="flex flex-wrap gap-1">
          {DIVISIONS.map(({ id, label }) => {
            const isActive = division === id;
            const activeStyle = id !== "all" ? divisionActive[id as DivisionId] : allActive;
            return (
              <button
                key={id}
                onClick={() => onDivisionChange(id as DivisionId | "all")}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                  isActive ? activeStyle : inactiveBtn,
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="mb-2 text-[0.65rem] font-black uppercase text-slate-500">Status</p>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onStatusChange(id as MatchStatus | "all")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                status === id ? allActive : inactiveBtn,
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Week */}
      <div>
        <p className="mb-2 text-[0.65rem] font-black uppercase text-slate-500">Week</p>
        <div className="flex flex-wrap gap-1">
          {weeks.map((w) => (
            <button
              key={w}
              onClick={() => onWeekChange(w)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-black uppercase transition",
                week === w ? allActive : inactiveBtn,
              )}
            >
              {w === "all" ? "All" : `Wk ${w}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
