import { cn } from "@/lib/utils";

export function AdminStatCard({
  label,
  value,
  sub,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "cyan" | "orange" | "emerald" | "violet";
}) {
  const accentStyle = {
    cyan: "border-cyan-500/25 bg-cyan-500/5 text-cyan-300",
    orange: "border-orange-500/25 bg-orange-500/5 text-orange-300",
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-300",
    violet: "border-violet-500/25 bg-violet-500/5 text-violet-300",
  }[accent];

  const valueStyle = {
    cyan: "text-cyan-300",
    orange: "text-orange-300",
    emerald: "text-emerald-300",
    violet: "text-violet-300",
  }[accent];

  return (
    <div className={cn("rounded-xl border p-4", accentStyle)}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={cn("text-3xl font-black tabular-nums", valueStyle)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/35">{sub}</p>}
    </div>
  );
}
