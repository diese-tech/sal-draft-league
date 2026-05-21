export type { PlayerRole, PlayerStatus } from "@/types/card-lab";

export type DivisionId = "solar" | "lunar" | "gaia";
export type MatchStatus = "scheduled" | "live" | "completed" | "postponed";
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
}

export interface OrgStanding {
  orgId: string;
  divisionId: DivisionId;
  wins: number;
  losses: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: ("W" | "L")[];
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
