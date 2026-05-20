import Link from "next/link";
import type { Announcement } from "@/types/league";
import { cn } from "@/lib/utils";

function stripMd(s: string) {
  return s.replace(/[#*_`>[\]!]/g, "").replace(/\n+/g, " ").trim();
}

const categoryLabel: Record<Announcement["category"], string> = {
  general: "General",
  rules: "Rules",
  draft: "Draft",
  results: "Results",
  admin: "Admin",
};

const categoryStyle: Record<Announcement["category"], string> = {
  general: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  rules: "border-violet-300/35 bg-violet-300/10 text-violet-100",
  draft: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  results: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  admin: "border-white/15 bg-white/[0.04] text-slate-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72 p-4 shadow-xl shadow-black/30 backdrop-blur transition duration-300",
        "hover:border-white/20",
        announcement.pinned && "border-orange-300/30 shadow-orange-500/8",
      )}
    >
      {announcement.pinned && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
      )}

      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {announcement.pinned && (
            <span className="rounded-xl border border-orange-300/40 bg-orange-300/15 px-2 py-0.5 text-[0.65rem] font-black uppercase text-orange-100">
              Pinned
            </span>
          )}
          <span className={cn("rounded-xl border px-2 py-0.5 text-[0.65rem] font-black uppercase", categoryStyle[announcement.category])}>
            {categoryLabel[announcement.category]}
          </span>
        </div>
        <time className="shrink-0 text-[0.65rem] font-bold text-slate-600">{formatDate(announcement.createdAt)}</time>
      </div>

      <h3 className="mb-1.5 font-black text-white">{announcement.title}</h3>
      <p className="line-clamp-3 text-xs font-semibold leading-relaxed text-slate-400">{stripMd(announcement.body)}</p>
      <Link
        href={`/announcements/${announcement.id}`}
        className="mt-3 inline-block text-[0.65rem] font-black uppercase text-cyan-400/80 transition hover:text-cyan-300"
      >
        Read article →
      </Link>
    </div>
  );
}
