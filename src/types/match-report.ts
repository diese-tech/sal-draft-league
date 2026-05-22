import type { DivisionId } from "@/types/league";

export type MatchReportStatus = "pending" | "extracting" | "review" | "done";

export interface MatchReport {
  id: string;
  matchId: string;
  seasonId: string;
  divisionId: DivisionId;
  status: MatchReportStatus;
  submittedBy: string;
  homeScore?: number;
  awayScore?: number;
  totalGames?: number;
  screenshotUrls: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PlayerMatchStat {
  id?: string;
  matchReportId: string;
  matchId: string;
  playerId?: string;
  playerIgn: string;
  gameNumber: number;
  orgId?: string;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  godPlayed?: string;
  role?: string;
  damageDealt?: number;
  damageMitigated?: number;
  seasonId: string;
  divisionId: DivisionId;
}

// Returned by AI extraction — transient, not stored directly
export interface ExtractedGame {
  gameNumber: number;
  winningSide: "home" | "away" | "unknown";
  players: ExtractedPlayer[];
}

export interface ExtractedPlayer {
  ign: string;
  side: "home" | "away";
  god?: string;
  role?: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt?: number;
  damageMitigated?: number;
  forfeit?: boolean;
}

// Used in MatchReportClient — enriched with match metadata for display
export interface MatchReportWithMatch extends MatchReport {
  homeOrgId: string;
  homeOrgName: string;
  homeOrgTag: string;
  awayOrgId: string;
  awayOrgName: string;
  awayOrgTag: string;
  matchDate: string;
  week: number;
}
