export type { PlayerRole, PlayerStatus } from "@/types/card-lab";

export type DivisionId = "solar" | "lunar" | "gaia";
export type MatchStatus = "scheduled" | "live" | "completed" | "postponed" | "forfeit";
export type SeasonStatus = "pre-season" | "active" | "post-season" | "offseason";
export type AnnouncementCategory = "general" | "rules" | "draft" | "results" | "admin";

export interface Season {
  id: string;
  name: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string;
  currentWeek: number;
}

export interface Division {
  id: DivisionId;
  name: string;
  description: string;
  tier: number;
  accentColor: string;
}

export interface Org {
  id: string;
  name: string;
  tag: string;
  divisionId: DivisionId;
  logoInitials: string;
  logoGradient: string;
  primaryColor: string;
  accentGradient: string;
  brandId?: string;
  captainId?: string;
  founded?: string;
  socialLinks?: {
    discord?: string;
    twitch?: string;
    twitter?: string;
  };
  /** ISO timestamp — set means archived, hidden from public. Admin-only visibility. */
  archivedAt?: string;
  /** ISO timestamp — set means queued for hard delete by a superadmin. */
  deletionScheduledAt?: string;
}

export interface LeaguePlayer {
  id: string;
  orgId?: string;
  discordUsername: string;
  ign: string;
  avatarInitials: string;
  avatarGradient: string;
  primaryRole: import("@/types/card-lab").PlayerRole;
  secondaryRoles: import("@/types/card-lab").PlayerRole[];
  isStarter: boolean;
  isCaptain: boolean;
  divisionId?: DivisionId;
  status: import("@/types/card-lab").PlayerStatus;
  stats?: {
    kills: number;
    deaths: number;
    assists: number;
    gamesPlayed: number;
    wins: number;
  };
  /** ISO timestamp — set means archived, hidden from public. Admin-only visibility. */
  archivedAt?: string;
  /** ISO timestamp — set means queued for hard delete by a superadmin. */
  deletionScheduledAt?: string;
}

export interface Match {
  id: string;
  divisionId: DivisionId;
  homeOrgId: string;
  awayOrgId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: MatchStatus;
  week: number;
  homeScore?: number;
  awayScore?: number;
  streamUrl?: string;
  vodUrl?: string;
  /** ISO timestamp — set means archived, hidden from public. Admin-only visibility. */
  archivedAt?: string;
  /** ISO timestamp — set means queued for hard delete by a superadmin. */
  deletionScheduledAt?: string;
  seasonId?: string;
}

export interface OrgStanding {
  orgId: string;
  divisionId: DivisionId;
  wins: number;
  losses: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: ("W" | "L" | "D")[];
  gamesBack: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  category: AnnouncementCategory;
  pinned: boolean;
}

export interface LeagueData {
  season: Season;
  divisions: Division[];
  orgs: Org[];
  players: LeaguePlayer[];
  matches: Match[];
  standings: OrgStanding[];
  announcements: Announcement[];
  lastUpdated: string;
}

// ── Per-game stat types ─────────────────────────────────────────────────────────────────────────

/** One row per game played. Powers the Match History table on a player's profile page. */
export interface PlayerMatchStat {
  matchId: string;
  gameNumber: number;
  godPlayed: string;
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  /** null until ForgeLens begins extracting the mitigation column */
  damageMitigated: number | null;
  healingDone: number | null;
  won: boolean;
  opponentOrgId: string;
  opponentOrgName: string;
  opponentOrgTag: string;
  /** matches.scheduled_date */
  matchDate: string;
  /** matches.division_id — shows which division this game was played in */
  divisionId: DivisionId;
  seasonId: string;
}

/** Aggregated per god. Powers the God Pool cards on a player's profile page. */
export interface PlayerGodStats {
  godPlayed: string;
  godClass?: string;
  gamesPlayed: number;
  wins: number;
  /** 0–100, rounded to nearest integer */
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  /** (kills + assists) / max(deaths, 1) */
  kda: number;
  avgDamage: number;
  /** null until damage_mitigated data is available */
  avgMitigated: number | null;
  divisionIds?: DivisionId[];
}

export interface OrgGodTendency {
  orgId: string;
  orgName: string;
  orgTag: string;
  brandId?: string;
  divisionIds: DivisionId[];
  gamesPlayed: number;
  topGods: PlayerGodStats[];
}

/**
 * One row per season+division combination for a player.
 * A player who subbed up to a higher division produces two rows for the same season.
 * Powers the Season History table on a player's profile page.
 */
export interface PlayerSeasonSummary {
  seasonId: string;
  seasonName: string;
  divisionId: DivisionId;
  orgId: string;
  orgName: string;
  orgTag: string;
  role: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  /** (kills + assists) / max(deaths, 1) across all games in this season+division */
  kda: number;
}

/** Per-player aggregate row for the team roster stats table on an org's page. */
export interface TeamPlayerStat {
  playerId: string;
  ign: string;
  primaryRole: import("@/types/card-lab").PlayerRole;
  gamesPlayed: number;
  kills: number;
  deaths: number;
  assists: number;
  /** (kills + assists) / max(deaths, 1) */
  kda: number;
  /** 0–100, rounded to nearest integer */
  winRate: number;
  totalDamage: number;
  avgDamage: number;
  /** null until damage_mitigated data is available */
  totalMitigated: number | null;
  /** null until damage_mitigated data is available */
  avgMitigated: number | null;
}
