import type { DivisionId, LeagueData, OrgStanding } from "@/types/league";

export function recalcStandings(data: Pick<LeagueData, "orgs" | "matches">, seasonId?: string): OrgStanding[] {
  const map = new Map<string, OrgStanding>();

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

  const matches = seasonId ? data.matches.filter((m) => m.seasonId === seasonId) : data.matches;

  for (const match of matches) {
    if (match.status !== "completed" || match.homeScore === undefined || match.awayScore === undefined) continue;
    const home = map.get(match.homeOrgId);
    const away = map.get(match.awayOrgId);
    if (!home || !away) continue;

    home.matchesPlayed++;
    away.matchesPlayed++;
    home.pointsFor += match.homeScore;
    home.pointsAgainst += match.awayScore;
    away.pointsFor += match.awayScore;
    away.pointsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins++;
      away.losses++;
      home.streak = [...home.streak.slice(-4), "W"];
      away.streak = [...away.streak.slice(-4), "L"];
    } else if (match.awayScore > match.homeScore) {
      away.wins++;
      home.losses++;
      away.streak = [...away.streak.slice(-4), "W"];
      home.streak = [...home.streak.slice(-4), "L"];
    } else {
      // tied match — record "D" in both streaks; wins/losses stay unchanged
      home.streak = [...home.streak.slice(-4), "D"];
      away.streak = [...away.streak.slice(-4), "D"];
    }
  }

  for (const divisionId of ["gaia", "solar", "lunar"] satisfies DivisionId[]) {
    const divStandings = [...map.values()].filter((s) => s.divisionId === divisionId);
    if (divStandings.length === 0) continue;
    const leader = divStandings.reduce((a, b) => (b.wins - b.losses > a.wins - a.losses ? b : a), divStandings[0]);
    for (const standing of divStandings) {
      standing.gamesBack = ((leader.wins - leader.losses) - (standing.wins - standing.losses)) / 2;
    }
  }

  return [...map.values()];
}
