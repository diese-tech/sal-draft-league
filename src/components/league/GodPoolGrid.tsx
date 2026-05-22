import type { PlayerGodStats } from '@/types/league';
import { cn } from '@/lib/utils';

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

export function GodPoolGrid({
  stats,
  subtitle,
}: {
  stats: PlayerGodStats[];
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <p className="text-[0.65rem] font-black uppercase text-slate-300">God Pool</p>
        {subtitle && <p className="text-[0.6rem] text-slate-500">{subtitle}</p>}
      </div>
      {stats.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
          No stats recorded yet
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((g) => (
            <div key={g.godPlayed} className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <span className="absolute right-2 top-2 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[0.6rem] font-black text-slate-300">
                {g.gamesPlayed}G
              </span>
              <p className="mb-1 pr-8 text-sm font-black leading-tight text-white">{g.godPlayed}</p>
              <p className={cn('text-base font-black leading-none', g.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                {g.winRate}%
              </p>
              <p className="mb-2 text-[0.55rem] font-black uppercase text-slate-500">Win Rate</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-xs font-black text-white">{g.kda.toFixed(2)}</p>
                  <p className="text-[0.55rem] font-black uppercase text-slate-600">KDA</p>
                </div>
                <div>
                  <p className="text-xs font-black text-white">{fmt(g.avgDamage)}</p>
                  <p className="text-[0.55rem] font-black uppercase text-slate-600">DMG</p>
                </div>
                <div>
                  <p className="text-xs font-black text-white">
                    {g.avgMitigated !== null ? fmt(g.avgMitigated) : '—'}
                  </p>
                  <p className="text-[0.55rem] font-black uppercase text-slate-600">MIT</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
