import { getLeagueData } from "@/lib/league-data";
import { WatchLiveClient } from "@/components/watch/WatchLiveClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watch Live – SAL",
  description: "Watch the Serpent Ascension League live on Twitch.",
};

async function getTwitchStatus(channel: string) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { live: false, title: "", viewerCount: 0 };

  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST", next: { revalidate: 3600 } },
    );
    if (!tokenRes.ok) return { live: false, title: "", viewerCount: 0 };
    const tokenData = await tokenRes.json() as { access_token: string };

    const streamRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      {
        headers: { "Client-ID": clientId, Authorization: `Bearer ${tokenData.access_token}` },
        next: { revalidate: 60 },
      },
    );
    if (!streamRes.ok) return { live: false, title: "", viewerCount: 0 };
    const streamData = await streamRes.json() as { data: Array<{ title: string; viewer_count: number }> };
    const stream = streamData.data[0];
    return { live: !!stream, title: stream?.title ?? "", viewerCount: stream?.viewer_count ?? 0 };
  } catch {
    return { live: false, title: "", viewerCount: 0 };
  }
}

export default async function WatchPage() {
  const channel = process.env.TWITCH_CHANNEL ?? "serpentascensionleague";
  const [{ matches, orgs }, twitchStatus] = await Promise.all([
    getLeagueData(),
    getTwitchStatus(channel),
  ]);

  const getOrg = (id: string) => orgs.find((o) => o.id === id) ?? null;

  const liveMatch = matches.find((m) => m.status === "live") ?? null;
  const nextMatch = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))[0] ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Broadcast</p>
        <h1 className="text-2xl font-black text-white">Watch Live</h1>
      </div>

      <WatchLiveClient
        channel={channel}
        isLive={twitchStatus.live}
        streamTitle={twitchStatus.title}
        viewerCount={twitchStatus.viewerCount}
        liveMatch={liveMatch}
        homeOrg={liveMatch ? getOrg(liveMatch.homeOrgId) : null}
        awayOrg={liveMatch ? getOrg(liveMatch.awayOrgId) : null}
        nextMatch={nextMatch}
        nextHomeOrg={nextMatch ? getOrg(nextMatch.homeOrgId) : null}
        nextAwayOrg={nextMatch ? getOrg(nextMatch.awayOrgId) : null}
      />
    </main>
  );
}
