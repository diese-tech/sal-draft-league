"use client";

import { useState, useEffect } from "react";
import type { LeagueData, DivisionId, MatchStatus } from "@/types/league";
import { MOCK_LEAGUE_DATA } from "@/data/mock-league";

const STORAGE_KEY = "sal-league-data";

function loadData(): LeagueData {
  if (typeof window === "undefined") return MOCK_LEAGUE_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_LEAGUE_DATA;
    return JSON.parse(raw) as LeagueData;
  } catch {
    return MOCK_LEAGUE_DATA;
  }
}

function saveData(data: LeagueData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }));
  } catch {
    // storage unavailable
  }
}

export function useLeagueData() {
  const [data, setData] = useState<LeagueData | null>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  const update = (next: LeagueData) => {
    setData(next);
    saveData(next);
  };

  const isLoaded = data !== null;
  const safe = data ?? MOCK_LEAGUE_DATA;

  // --- Selectors ---

  const getOrg = (id: string) => safe.orgs.find((o) => o.id === id);

  const getOrgsByDivision = (divisionId: DivisionId) =>
    safe.orgs.filter((o) => o.divisionId === divisionId);

  const getPlayersByOrg = (orgId: string) =>
    safe.players.filter((p) => p.orgId === orgId);

  const getMatchesByDivision = (divisionId: DivisionId) =>
    safe.matches.filter((m) => m.divisionId === divisionId);

  const getMatchesByStatus = (status: MatchStatus) =>
    safe.matches.filter((m) => m.status === status);

  const getUpcomingMatches = (limit = 5) =>
    safe.matches
      .filter((m) => m.status === "scheduled" || m.status === "live")
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, limit);

  const getRecentResults = (limit = 5) =>
    safe.matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
      .slice(0, limit);

  const getLiveMatches = () => safe.matches.filter((m) => m.status === "live");

  const getStandingsByDivision = (divisionId: DivisionId) =>
    safe.standings
      .filter((s) => s.divisionId === divisionId)
      .sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const getOrgStanding = (orgId: string) => safe.standings.find((s) => s.orgId === orgId);

  // --- Mutators ---

  const updateMatchScore = (matchId: string, homeScore: number, awayScore: number) => {
    if (!data) return;
    const updatedMatches = data.matches.map((m) =>
      m.id === matchId ? { ...m, homeScore, awayScore, status: "completed" as MatchStatus } : m,
    );
    // Recalculate standings from scratch
    const recalcData = { ...data, matches: updatedMatches };
    const newStandings = recalcStandings(recalcData);
    update({ ...recalcData, standings: newStandings });
  };

  const resetData = () => update(MOCK_LEAGUE_DATA);

  return {
    data: safe,
    isLoaded,
    // Selectors
    getOrg,
    getOrgsByDivision,
    getPlayersByOrg,
    getMatchesByDivision,
    getMatchesByStatus,
    getUpcomingMatches,
    getRecentResults,
    getLiveMatches,
    getStandingsByDivision,
    getOrgStanding,
    // Mutators
    updateMatchScore,
    resetData,
  };
}

function recalcStandings(data: LeagueData): import("@/types/league").OrgStanding[] {
  const map = new Map<string, import("@/types/league").OrgStanding>();
  for (const org of data.orgs) {
    map.set(org.id, {
      orgId: org.id,
      divisionId: org.divisionId,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: [],
      gamesBack: 0,
    });
  }
  for (const m of data.matches) {
    if (m.status !== "completed" || m.homeScore === undefined || m.awayScore === undefined) continue;
    const home = map.get(m.homeOrgId)!;
    const away = map.get(m.awayOrgId)!;
    home.matchesPlayed++;
    away.matchesPlayed++;
    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
      home.streak = [...home.streak.slice(-4), "W"];
      away.streak = [...away.streak.slice(-4), "L"];
    } else if (m.awayScore > m.homeScore) {
      away.wins++;
      home.losses++;
      away.streak = [...away.streak.slice(-4), "W"];
      home.streak = [...home.streak.slice(-4), "L"];
    }
  }
  const divIds: DivisionId[] = ["solar", "lunar", "gaia"];
  for (const divId of divIds) {
    const divStandings = [...map.values()].filter((s) => s.divisionId === divId);
    const leader = divStandings.reduce((a, b) => (b.wins - b.losses > a.wins - a.losses ? b : a), divStandings[0]);
    for (const s of divStandings) {
      s.gamesBack = ((leader.wins - leader.losses) - (s.wins - s.losses)) / 2;
    }
  }
  return [...map.values()];
}
