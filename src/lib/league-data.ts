import { MOCK_LEAGUE_DATA } from "@/data/mock-league";
import type { Announcement, Division, LeagueData, LeaguePlayer, Match, Org, OrgStanding, Season } from "@/types/league";
import { recalcStandings } from "@/lib/standings";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DbDivision = Omit<Division, "accentColor"> & { accent_color: string };

type DbOrg = Omit<Org, "divisionId" | "logoInitials" | "logoGradient" | "primaryColor" | "accentGradient" | "captainId" | "socialLinks"> & {
  division_id: Org["divisionId"];
  logo_initials: string;
  logo_gradient: string;
  primary_color: string;
  accent_gradient: string;
  captain_id?: string | null;
  social_links?: Org["socialLinks"] | null;
};

type DbPlayer = Omit<LeaguePlayer, "orgId" | "discordUsername" | "avatarInitials" | "avatarGradient" | "primaryRole" | "secondaryRoles" | "isStarter" | "isCaptain" | "divisionId"> & {
  org_id?: string | null;
  discord_username: string;
  avatar_initials: string;
  avatar_gradient: string;
  primary_role: LeaguePlayer["primaryRole"];
  secondary_roles: LeaguePlayer["secondaryRoles"];
  is_starter: boolean;
  is_captain: boolean;
  division_id?: LeaguePlayer["divisionId"] | null;
};

type DbMatch = Omit<Match, "divisionId" | "homeOrgId" | "awayOrgId" | "scheduledDate" | "scheduledTime" | "homeScore" | "awayScore" | "streamUrl" | "vodUrl"> & {
  division_id: Match["divisionId"];
  home_org_id: string;
  away_org_id: string;
  scheduled_date: string;
  scheduled_time: string;
  home_score?: number | null;
  away_score?: number | null;
  stream_url?: string | null;
  vod_url?: string | null;
};

type DbStanding = Omit<OrgStanding, "orgId" | "divisionId" | "matchesPlayed" | "pointsFor" | "pointsAgainst" | "gamesBack"> & {
  org_id: string;
  division_id: OrgStanding["divisionId"];
  matches_played: number;
  points_for: number;
  points_against: number;
  games_back: number;
};

type DbAnnouncement = Omit<Announcement, "createdAt"> & { created_at: string };

function fromDbOrg(row: DbOrg): Org {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    divisionId: row.division_id,
    logoInitials: row.logo_initials,
    logoGradient: row.logo_gradient,
    primaryColor: row.primary_color,
    accentGradient: row.accent_gradient,
    captainId: row.captain_id ?? undefined,
    founded: row.founded,
    socialLinks: row.social_links ?? undefined,
  };
}

function fromDbDivision(row: DbDivision): Division {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tier: row.tier,
    accentColor: row.accent_color,
  };
}

function toDbOrg(org: Org): DbOrg {
  return {
    id: org.id,
    name: org.name,
    tag: org.tag,
    division_id: org.divisionId,
    logo_initials: org.logoInitials,
    logo_gradient: org.logoGradient,
    primary_color: org.primaryColor,
    accent_gradient: org.accentGradient,
    captain_id: org.captainId ?? null,
    founded: org.founded,
    social_links: org.socialLinks ?? null,
  };
}

function fromDbPlayer(row: DbPlayer): LeaguePlayer {
  return {
    id: row.id,
    orgId: row.org_id ?? undefined,
    discordUsername: row.discord_username,
    ign: row.ign,
    avatarInitials: row.avatar_initials,
    avatarGradient: row.avatar_gradient,
    primaryRole: row.primary_role,
    secondaryRoles: row.secondary_roles ?? [],
    isStarter: row.is_starter,
    isCaptain: row.is_captain,
    divisionId: row.division_id ?? undefined,
    status: row.status,
    stats: row.stats,
  };
}

function toDbPlayer(player: LeaguePlayer): DbPlayer {
  return {
    id: player.id,
    org_id: player.orgId ?? null,
    discord_username: player.discordUsername,
    ign: player.ign,
    avatar_initials: player.avatarInitials,
    avatar_gradient: player.avatarGradient,
    primary_role: player.primaryRole,
    secondary_roles: player.secondaryRoles,
    is_starter: player.isStarter,
    is_captain: player.isCaptain,
    division_id: player.divisionId ?? null,
    status: player.status,
    stats: player.stats,
  };
}

function fromDbMatch(row: DbMatch): Match {
  return {
    id: row.id,
    divisionId: row.division_id,
    homeOrgId: row.home_org_id,
    awayOrgId: row.away_org_id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time.slice(0, 5),
    status: row.status,
    week: row.week,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    streamUrl: row.stream_url ?? undefined,
    vodUrl: row.vod_url ?? undefined,
  };
}

function toDbMatch(match: Match): DbMatch {
  return {
    id: match.id,
    division_id: match.divisionId,
    home_org_id: match.homeOrgId,
    away_org_id: match.awayOrgId,
    scheduled_date: match.scheduledDate,
    scheduled_time: match.scheduledTime,
    status: match.status,
    week: match.week,
    home_score: match.homeScore ?? null,
    away_score: match.awayScore ?? null,
    stream_url: match.streamUrl ?? null,
    vod_url: match.vodUrl ?? null,
  };
}

function fromDbStanding(row: DbStanding): OrgStanding {
  return {
    orgId: row.org_id,
    divisionId: row.division_id,
    wins: row.wins,
    losses: row.losses,
    matchesPlayed: row.matches_played,
    pointsFor: row.points_for,
    pointsAgainst: row.points_against,
    streak: row.streak ?? [],
    gamesBack: row.games_back,
  };
}

function toDbStanding(standing: OrgStanding): DbStanding {
  return {
    org_id: standing.orgId,
    division_id: standing.divisionId,
    wins: standing.wins,
    losses: standing.losses,
    matches_played: standing.matchesPlayed,
    points_for: standing.pointsFor,
    points_against: standing.pointsAgainst,
    streak: standing.streak,
    games_back: standing.gamesBack,
  };
}

function fromDbAnnouncement(row: DbAnnouncement): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    category: row.category,
    pinned: row.pinned,
  };
}

export async function getLeagueData(): Promise<LeagueData> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return MOCK_LEAGUE_DATA;

  try {
    const [seasonRes, divisionRes, orgRes, playerRes, matchRes, standingRes, announcementRes] = await Promise.all([
      supabase.from("seasons").select("*").order("start_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("divisions").select("*").order("tier"),
      supabase.from("orgs").select("*").order("name"),
      supabase.from("players").select("*").order("ign"),
      supabase.from("matches").select("*").order("scheduled_date").order("scheduled_time"),
      supabase.from("standings").select("*"),
      supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    const queryError = seasonRes.error ?? divisionRes.error ?? orgRes.error ?? playerRes.error ?? matchRes.error ?? standingRes.error ?? announcementRes.error;
    if (queryError) {
      console.error("getLeagueData: Supabase query error, using mock data:", queryError.message);
      return MOCK_LEAGUE_DATA;
    }

    const seasonRow = seasonRes.data as (Season & { start_date?: string; end_date?: string; current_week?: number }) | null;
    if (!seasonRow || !divisionRes.data?.length || !orgRes.data?.length) {
      console.error("getLeagueData: Missing critical Supabase data (season/divisions/orgs), using mock data.");
      return MOCK_LEAGUE_DATA;
    }

    return {
      season: {
        id: seasonRow.id,
        name: seasonRow.name,
        status: seasonRow.status,
        startDate: seasonRow.start_date ?? seasonRow.startDate,
        endDate: seasonRow.end_date ?? seasonRow.endDate,
        currentWeek: seasonRow.current_week ?? seasonRow.currentWeek,
      },
      divisions: (divisionRes.data as DbDivision[]).map(fromDbDivision),
      orgs: (orgRes.data as DbOrg[]).map(fromDbOrg),
      players: (playerRes.data as DbPlayer[]).map(fromDbPlayer),
      matches: (matchRes.data as DbMatch[]).map(fromDbMatch),
      standings: (standingRes.data as DbStanding[]).map(fromDbStanding),
      announcements: (announcementRes.data as DbAnnouncement[]).map(fromDbAnnouncement),
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("getLeagueData: unexpected error, using mock data:", err);
    return MOCK_LEAGUE_DATA;
  }
}

export async function seedLeagueData(data: LeagueData = MOCK_LEAGUE_DATA) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");

  const standings = recalcStandings(data);
  const season = {
    id: data.season.id,
    name: data.season.name,
    status: data.season.status,
    start_date: data.season.startDate,
    end_date: data.season.endDate,
    current_week: data.season.currentWeek,
  };

  await supabase.from("seasons").upsert(season);
  await supabase.from("divisions").upsert(data.divisions.map((division) => ({
    id: division.id,
    name: division.name,
    description: division.description,
    tier: division.tier,
    accent_color: division.accentColor,
  })));
  await supabase.from("orgs").upsert(data.orgs.map(toDbOrg));
  await supabase.from("players").upsert(data.players.map(toDbPlayer));
  await supabase.from("matches").upsert(data.matches.map(toDbMatch));
  await supabase.from("announcements").upsert(data.announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    created_at: a.createdAt,
    category: a.category,
    pinned: a.pinned,
  })));
  await supabase.from("standings").delete().neq("org_id", "__never__");
  await supabase.from("standings").upsert(standings.map(toDbStanding));
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
}

async function writeAuditLog(action: string, entityType: string | null, entityId: string | null, payload: unknown) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  await supabase.from("admin_audit_log").insert({ action, entity_type: entityType, entity_id: entityId, payload });
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getAuditLog error:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as number,
    action: row.action as string,
    entityType: row.entity_type as string | null,
    entityId: row.entity_id as string | null,
    payload: row.payload,
    createdAt: row.created_at as string,
  }));
}

export async function saveMatch(match: Match) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const { error } = await supabase.from("matches").upsert(toDbMatch(match));
  if (error) throw error;
  await Promise.all([
    recalculateAndPersistStandings(),
    writeAuditLog("save_match", "match", match.id, match),
  ]);
}

export async function savePlayer(player: LeaguePlayer) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const { error } = await supabase.from("players").upsert(toDbPlayer(player));
  if (error) throw error;
  await writeAuditLog("save_player", "player", player.id, { ign: player.ign, orgId: player.orgId, status: player.status });
}

export async function recalculateAndPersistStandings() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");

  // Fetch live data directly — bypass getLeagueData() to avoid mock fallback corrupting standings
  const [orgRes, matchRes] = await Promise.all([
    supabase.from("orgs").select("*").order("name"),
    supabase.from("matches").select("*").order("scheduled_date").order("scheduled_time"),
  ]);
  if (orgRes.error) throw orgRes.error;
  if (matchRes.error) throw matchRes.error;

  // Reuse the full data fetch for the recalc (standings recalc needs season/divisions too)
  const data = await getLeagueData();
  if (data === MOCK_LEAGUE_DATA) throw new Error("Cannot recalculate standings: Supabase data unavailable.");

  const standings = recalcStandings(data);
  // Upsert first, then remove any orgs that no longer exist to keep the table clean
  const { error } = await supabase.from("standings").upsert(standings.map(toDbStanding));
  if (error) throw error;
  const currentOrgIds = standings.map((s) => s.orgId);
  if (currentOrgIds.length > 0) {
    await supabase.from("standings").delete().not("org_id", "in", `(${currentOrgIds.map((id) => `"${id}"`).join(",")})`);
  }
  await writeAuditLog("recalculate_standings", "standings", null, { orgCount: standings.length });
  return standings;
}
