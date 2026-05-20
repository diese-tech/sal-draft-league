import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeagueData } from "@/lib/league-data";
import { MarkdownBody } from "@/components/ui/MarkdownBody";
import type { Announcement } from "@/types/league";

export const revalidate = 30;

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

function stripMd(s: string) {
  return s.replace(/[#*_`>[\]!]/g, "").replace(/\n+/g, " ").trim();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { announcements } = await getLeagueData();
  const a = announcements.find((x) => x.id === id);
  if (!a) return { title: "Not Found" };
  return {
    title: `${a.title} — SAL`,
    description: stripMd(a.body).slice(0, 160),
  };
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { announcements } = await getLeagueData();
  const a = announcements.find((x) => x.id === id);
  if (!a) notFound();

  const date = new Date(a.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500 transition hover:text-slate-200"
      >
        ← Back
      </Link>

      <article>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {a.pinned && (
            <span className="rounded-xl border border-orange-300/40 bg-orange-300/15 px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-orange-100">
              Pinned
            </span>
          )}
          <span className={`rounded-xl border px-2.5 py-0.5 text-[0.65rem] font-black uppercase ${categoryStyle[a.category]}`}>
            {categoryLabel[a.category]}
          </span>
          <time className="text-[0.65rem] font-bold text-slate-600">{date}</time>
        </div>

        <h1 className="mb-6 text-3xl font-black leading-tight text-white sm:text-4xl">{a.title}</h1>

        <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-6 sm:p-8">
          <MarkdownBody body={a.body} />
        </div>
      </article>
    </main>
  );
}
