import { NextRequest, NextResponse } from "next/server";
import { adminCookie } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DiscordTokenResponse = { access_token: string; token_type: string };
type DiscordUser = { id: string; username: string; global_name?: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("discord_admin_state")?.value;

  // Always clear the state cookie
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set("discord_admin_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
    return response;
  };

  // Verify state
  if (!state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(new URL("/admin/login?error=invalid_state", siteUrl()));
    return clearStateCookie(response);
  }

  if (!code) {
    const response = NextResponse.redirect(new URL("/admin/login?error=invalid_state", siteUrl()));
    return clearStateCookie(response);
  }

  const clientId = process.env.DISCORD_ADMIN_CLIENT_ID;
  const clientSecret = process.env.DISCORD_ADMIN_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_ADMIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const response = NextResponse.redirect(new URL("/admin/login?error=config", siteUrl()));
    return clearStateCookie(response);
  }

  // Exchange code for token
  let tokenData: DiscordTokenResponse;
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    tokenData = (await tokenRes.json()) as DiscordTokenResponse;
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login?error=token_exchange", siteUrl()));
    return clearStateCookie(response);
  }

  // Fetch Discord user
  let discordUser: DiscordUser;
  try {
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);
    discordUser = (await userRes.json()) as DiscordUser;
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login?error=user_fetch", siteUrl()));
    return clearStateCookie(response);
  }

  // Look up in admin_users table
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    const response = NextResponse.redirect(new URL("/admin/login?error=config", siteUrl()));
    return clearStateCookie(response);
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("discord_id", discordUser.id)
    .single();

  if (error || !data) {
    const response = NextResponse.redirect(new URL("/admin/login?error=no_access", siteUrl()));
    return clearStateCookie(response);
  }

  const role = data.role as "super_admin" | "admin";

  // Set admin session cookie and redirect to admin
  const response = NextResponse.redirect(new URL("/admin", siteUrl()));
  const cookie = adminCookie(discordUser.id, role);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return clearStateCookie(response);
}
