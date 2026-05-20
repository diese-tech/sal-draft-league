import { NextResponse } from "next/server";

export interface TwitchLiveStatus {
  live: boolean;
  title: string;
  viewerCount: number;
  channel: string;
}

// Cache the app access token in module scope to avoid re-fetching on every request.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to fetch Twitch app token");
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    // Expire 60s early to avoid edge cases
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export async function GET() {
  const channel = process.env.TWITCH_CHANNEL;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!channel || !clientId || !clientSecret) {
    return NextResponse.json<TwitchLiveStatus>(
      { live: false, title: "", viewerCount: 0, channel: channel ?? "" },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } },
    );
  }

  try {
    const token = await getAppToken(clientId, clientSecret);
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      { headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Twitch streams API ${res.status}`);

    const data = await res.json() as { data: Array<{ title: string; viewer_count: number }> };
    const stream = data.data[0];

    return NextResponse.json<TwitchLiveStatus>(
      {
        live: !!stream,
        title: stream?.title ?? "",
        viewerCount: stream?.viewer_count ?? 0,
        channel,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } },
    );
  } catch (err) {
    console.error("Twitch live check failed:", err);
    return NextResponse.json<TwitchLiveStatus>(
      { live: false, title: "", viewerCount: 0, channel },
      { headers: { "Cache-Control": "public, s-maxage=30" } },
    );
  }
}
