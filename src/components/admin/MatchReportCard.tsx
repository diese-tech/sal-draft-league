import { cn } from "@/lib/utils";
import type { MatchReportWithMatch } from "@/types/match-report";

const DIV_DOT: Record<string, string> = {
  gaia: "bg-emerald-400",
  solar: "bg-orange-400",
  lunar: "bg-cyan-400",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "border-slate-500/40 bg-slate-500/10 text-slate-400",
  extracting: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  review: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  done: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

export function MatchReportCard({
  report,
  active,
  onClick,
}: {
  report: MatchReportWithMatch;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition",
        active
          ? "border-cyan-300/40 bg-cyan-300/10"
          : "border-white/8 bg-slate-950/60 hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", DIV_DOT[report.divisionId] ?? "bg-white/30")} />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white">
              {report.homeOrgTag || report.homeOrgName} <span className="text-slate-500">vs</span>{" "}
              {report.awayOrgTag || report.awayOrgName}
            </p>
            <p className="text-[0.6rem] font-semibold text-slate-500">
              {report.matchDate} · Wk {report.week}
            </p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[0.55rem] font-black uppercase", STATUS_BADGE[report.status])}>
          {report.status === "extracting" ? "AI..." : report.status}
        </span>
      </div>
      {report.status === "done" && report.homeScore !== undefined && report.awayScore !== undefined && (
        <p className="mt-1.5 text-[0.65rem] font-black text-emerald-300">
          {report.homeOrgTag} {report.homeScore} – {report.awayScore} {report.awayOrgTag}
          <span className="ml-1.5 font-semibold text-slate-500">({report.totalGames}G)</span>
        </p>
      )}
    </button>
  );
}
