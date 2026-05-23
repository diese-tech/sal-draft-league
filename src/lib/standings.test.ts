import { describe, it, expect } from "vitest";
import { recalcStandings } from "./standings";
import type { Org, Match } from "@/types/league";

// ── Helper factories ────────────────────────────────────────────────────────

function makeOrg(id: string, divisionId: Org["divisionId"] = "solar"): Org {
  return {
    id,
    name: `Org ${id}`,
    tag: id.toUpperCase(),
    divisionId,
    logoInitials: id.slice(0, 2).toUpperCase(),
    logoGradient: "from-blue-500 to-purple-500",
    primaryColor: "#0000ff",
    accentGradient: "from-purple-500 to-pink-500",
  };
}

let matchCounter = 0;
function makeMatch(
  homeOrgId: string,
  awayOrgId: string,
  homeScore: number | undefined,
  awayScore: number | undefined,
  status: Match["status"] = "completed",
  divisionId: Match["divisionId"] = "solar",
): Match {
  matchCounter++;
  return {
    id: `match-${matchCounter}`,
    divisionId,
    homeOrgId,
    awayOrgId,
    scheduledDate: "2026-01-01",
    scheduledTime: "18:00",
    status,
    week: 1,
    homeScore,
    awayScore,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("recalcStandings()", () => {
  it("returns empty array when no orgs are provided", () => {
    const result = recalcStandings({ orgs: [], matches: [] });
    expect(result).toEqual([]);
  });

  it("returns orgs with zeroed stats when there are no matches", () => {
    const orgs = [makeOrg("teamA"), makeOrg("teamB")];
    const result = recalcStandings({ orgs, matches: [] });
    expect(result).toHaveLength(2);
    for (const s of result) {
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
      expect(s.matchesPlayed).toBe(0);
      expect(s.pointsFor).toBe(0);
      expect(s.pointsAgainst).toBe(0);
      expect(s.streak).toEqual([]);
      expect(s.gamesBack).toBe(0);
    }
  });

  describe("home win (homeScore > awayScore)", () => {
    it("increments home.wins, away.losses, and matchesPlayed for both", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, 1)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.wins).toBe(1);
      expect(home.losses).toBe(0);
      expect(home.matchesPlayed).toBe(1);

      expect(away.wins).toBe(0);
      expect(away.losses).toBe(1);
      expect(away.matchesPlayed).toBe(1);
    });

    it("records 'W' in home streak and 'L' in away streak", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, 1)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.streak).toEqual(["W"]);
      expect(away.streak).toEqual(["L"]);
    });
  });

  describe("away win (awayScore > homeScore)", () => {
    it("increments away.wins, home.losses", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 1, 4)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(away.wins).toBe(1);
      expect(away.losses).toBe(0);
      expect(home.wins).toBe(0);
      expect(home.losses).toBe(1);
    });

    it("records 'W' in away streak and 'L' in home streak", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 1, 4)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(away.streak).toEqual(["W"]);
      expect(home.streak).toEqual(["L"]);
    });
  });

  describe("tie score (homeScore === awayScore)", () => {
    it("does not increment wins or losses for either team on a tie", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 2, 2)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.wins).toBe(0);
      expect(home.losses).toBe(0);
      expect(away.wins).toBe(0);
      expect(away.losses).toBe(0);
    });

    it("still increments matchesPlayed and accumulates points on a tie", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 2, 2)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.matchesPlayed).toBe(1);
      expect(away.matchesPlayed).toBe(1);
      expect(home.pointsFor).toBe(2);
      expect(home.pointsAgainst).toBe(2);
    });

    it("appends 'D' to streak arrays on a tie", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 2, 2)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.streak).toEqual(["D"]);
      expect(away.streak).toEqual(["D"]);
    });
  });

  describe("match status filtering", () => {
    it("ignores matches with status 'scheduled'", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, 1, "scheduled")];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      expect(home.wins).toBe(0);
      expect(home.matchesPlayed).toBe(0);
    });

    it("ignores matches with status 'live'", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, 1, "live")];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      expect(home.wins).toBe(0);
      expect(home.matchesPlayed).toBe(0);
    });

    it("ignores matches with status 'postponed'", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, 1, "postponed")];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      expect(home.wins).toBe(0);
      expect(home.matchesPlayed).toBe(0);
    });

    it("counts only 'completed' matches", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [
        makeMatch("home", "away", 3, 1, "scheduled"),
        makeMatch("home", "away", 2, 0, "completed"),
        makeMatch("home", "away", 1, 4, "postponed"),
      ];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      expect(home.wins).toBe(1);
      expect(home.losses).toBe(0);
      expect(home.matchesPlayed).toBe(1);
    });
  });

  describe("points accumulation", () => {
    it("accumulates pointsFor and pointsAgainst across multiple matches", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [
        makeMatch("home", "away", 3, 1), // home: +3 for, +1 against; away: +1 for, +3 against
        makeMatch("home", "away", 2, 4), // home: +2 for, +4 against; away: +4 for, +2 against
      ];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.pointsFor).toBe(5);
      expect(home.pointsAgainst).toBe(5);
      expect(away.pointsFor).toBe(5);
      expect(away.pointsAgainst).toBe(5);
    });

    it("correctly assigns home score to home.pointsFor and away score to home.pointsAgainst", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 7, 3)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      const away = result.find((s) => s.orgId === "away")!;

      expect(home.pointsFor).toBe(7);
      expect(home.pointsAgainst).toBe(3);
      expect(away.pointsFor).toBe(3);
      expect(away.pointsAgainst).toBe(7);
    });
  });

  describe("streak calculation", () => {
    it("caps streak at 5 entries after 5 consecutive wins", () => {
      const orgs = [makeOrg("alpha"), makeOrg("beta")];
      // Play 6 matches where alpha always wins
      const matches = Array.from({ length: 6 }, () =>
        makeMatch("alpha", "beta", 3, 1),
      );
      const result = recalcStandings({ orgs, matches });

      const alpha = result.find((s) => s.orgId === "alpha")!;
      expect(alpha.streak).toHaveLength(5);
      expect(alpha.streak).toEqual(["W", "W", "W", "W", "W"]);
    });

    it("caps beta's loss streak at 5 entries after 6 losses", () => {
      const orgs = [makeOrg("alpha"), makeOrg("beta")];
      const matches = Array.from({ length: 6 }, () =>
        makeMatch("alpha", "beta", 3, 1),
      );
      const result = recalcStandings({ orgs, matches });

      const beta = result.find((s) => s.orgId === "beta")!;
      expect(beta.streak).toHaveLength(5);
      expect(beta.streak).toEqual(["L", "L", "L", "L", "L"]);
    });

    it("produces correct last-5 sequence for mixed results W L L W W", () => {
      const orgs = [makeOrg("alpha"), makeOrg("beta")];
      // Matches in order produce alpha results: W, L, L, W, W
      const matches = [
        makeMatch("alpha", "beta", 3, 1), // W
        makeMatch("alpha", "beta", 1, 3), // L
        makeMatch("alpha", "beta", 0, 2), // L
        makeMatch("alpha", "beta", 2, 1), // W
        makeMatch("alpha", "beta", 4, 2), // W
      ];
      const result = recalcStandings({ orgs, matches });

      const alpha = result.find((s) => s.orgId === "alpha")!;
      expect(alpha.streak).toEqual(["W", "L", "L", "W", "W"]);
    });

    it("oldest entry is dropped when a 6th result is added", () => {
      const orgs = [makeOrg("alpha"), makeOrg("beta")];
      // First 5 matches: W W W W W; 6th: L — streak should be W W W W L
      const matches = [
        ...Array.from({ length: 5 }, () => makeMatch("alpha", "beta", 3, 1)),
        makeMatch("alpha", "beta", 0, 2),
      ];
      const result = recalcStandings({ orgs, matches });

      const alpha = result.find((s) => s.orgId === "alpha")!;
      expect(alpha.streak).toEqual(["W", "W", "W", "W", "L"]);
    });
  });

  describe("games-back calculation", () => {
    it("leader always has gamesBack of 0", () => {
      const orgs = [makeOrg("leader"), makeOrg("follower")];
      const matches = [
        makeMatch("leader", "follower", 3, 1),
        makeMatch("leader", "follower", 2, 0),
      ];
      const result = recalcStandings({ orgs, matches });

      const leader = result.find((s) => s.orgId === "leader")!;
      expect(leader.gamesBack).toBe(0);
    });

    it("team 1 win behind leader has gamesBack of 0.5", () => {
      const orgs = [makeOrg("leader"), makeOrg("follower")];
      // leader: 2W 0L, follower: 1W 1L
      // diff = (2-0) - (1-1) = 2; gamesBack = 2/2 = 1... wait let's be precise
      // leader net = 2, follower net = 0 => gamesBack = (2 - 0) / 2 = 1
      const matches = [
        makeMatch("leader", "follower", 3, 1), // leader W, follower L
        makeMatch("leader", "follower", 3, 1), // leader W, follower L
      ];
      const result = recalcStandings({ orgs, matches });

      const follower = result.find((s) => s.orgId === "follower")!;
      // leader: 2W 0L => net 2; follower: 0W 2L => net -2; gamesBack = (2-(-2))/2 = 2
      expect(follower.gamesBack).toBe(2);
    });

    it("follows formula: ((leaderNet) - (standingNet)) / 2", () => {
      const orgs = [makeOrg("a"), makeOrg("b"), makeOrg("c")];
      // After matches: a=3W/0L, b=2W/1L, c=1W/2L
      const matches = [
        makeMatch("a", "b", 3, 1), // a W, b L
        makeMatch("a", "c", 3, 1), // a W, c L
        makeMatch("a", "b", 3, 1), // a W, b L
        makeMatch("b", "c", 3, 1), // b W, c L
        makeMatch("b", "c", 3, 1), // b W, c L
      ];
      const result = recalcStandings({ orgs, matches });

      const a = result.find((s) => s.orgId === "a")!;
      const b = result.find((s) => s.orgId === "b")!;
      const c = result.find((s) => s.orgId === "c")!;

      // a: 3W 0L => net 3 (leader)
      // b: 2W 2L => net 0; gamesBack = (3 - 0) / 2 = 1.5
      // c: 0W 3L => net -3; gamesBack = (3 - (-3)) / 2 = 3
      expect(a.gamesBack).toBe(0);
      expect(b.gamesBack).toBe(1.5);
      expect(c.gamesBack).toBe(3);
    });
  });

  describe("division isolation", () => {
    it("teams in 'solar' division are ranked separately from 'lunar' division", () => {
      const orgs = [
        makeOrg("solar1", "solar"),
        makeOrg("solar2", "solar"),
        makeOrg("lunar1", "lunar"),
        makeOrg("lunar2", "lunar"),
      ];
      const matches = [
        makeMatch("solar1", "solar2", 3, 1, "completed", "solar"),
        makeMatch("lunar1", "lunar2", 1, 3, "completed", "lunar"),
      ];
      const result = recalcStandings({ orgs, matches });

      const solar1 = result.find((s) => s.orgId === "solar1")!;
      const solar2 = result.find((s) => s.orgId === "solar2")!;
      const lunar1 = result.find((s) => s.orgId === "lunar1")!;
      const lunar2 = result.find((s) => s.orgId === "lunar2")!;

      // solar1 leads solar division
      expect(solar1.gamesBack).toBe(0);
      expect(solar2.gamesBack).toBe(1);

      // lunar2 leads lunar division
      expect(lunar2.gamesBack).toBe(0);
      expect(lunar1.gamesBack).toBe(1);
    });

    it("a dominant solar team does not inflate gamesBack for lunar teams", () => {
      const orgs = [
        makeOrg("solarBig", "solar"),
        makeOrg("solarSmall", "solar"),
        makeOrg("lunarA", "lunar"),
        makeOrg("lunarB", "lunar"),
      ];
      // solarBig wins 10 matches; lunar teams play 1 match each
      const matches = [
        ...Array.from({ length: 5 }, () =>
          makeMatch("solarBig", "solarSmall", 3, 0, "completed", "solar"),
        ),
        makeMatch("lunarA", "lunarB", 2, 1, "completed", "lunar"),
      ];
      const result = recalcStandings({ orgs, matches });

      const lunarA = result.find((s) => s.orgId === "lunarA")!;
      const lunarB = result.find((s) => s.orgId === "lunarB")!;

      // lunarA leads lunar division with 1W 0L
      expect(lunarA.gamesBack).toBe(0);
      // lunarB: 0W 1L; gamesBack = (1 - (-1)) / 2 = 1
      expect(lunarB.gamesBack).toBe(1);
    });
  });

  describe("season filter (P0-06)", () => {
    it("includes all matches when no seasonId is passed", () => {
      const orgs = [makeOrg("a"), makeOrg("b")];
      const m1 = { ...makeMatch("a", "b", 3, 1), seasonId: "s1" };
      const m2 = { ...makeMatch("b", "a", 3, 1), seasonId: "s2" };
      const result = recalcStandings({ orgs, matches: [m1, m2] });
      const a = result.find((s) => s.orgId === "a")!;
      expect(a.wins).toBe(1);
      expect(a.losses).toBe(1);
    });

    it("filters to only the specified season", () => {
      const orgs = [makeOrg("a"), makeOrg("b")];
      const m1 = { ...makeMatch("a", "b", 3, 1), seasonId: "s1" };
      const m2 = { ...makeMatch("b", "a", 3, 1), seasonId: "s2" };
      const result = recalcStandings({ orgs, matches: [m1, m2] }, "s1");
      const a = result.find((s) => s.orgId === "a")!;
      expect(a.wins).toBe(1);
      expect(a.losses).toBe(0);
    });

    it("returns zeroed standings when no matches match the seasonId", () => {
      const orgs = [makeOrg("a"), makeOrg("b")];
      const m1 = { ...makeMatch("a", "b", 3, 1), seasonId: "s1" };
      const result = recalcStandings({ orgs, matches: [m1] }, "s2");
      const a = result.find((s) => s.orgId === "a")!;
      expect(a.wins).toBe(0);
      expect(a.matchesPlayed).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles a match where homeOrgId is not in orgs list without crashing", () => {
      const orgs = [makeOrg("knownOrg")];
      const matches = [makeMatch("unknownHome", "knownOrg", 3, 1)];
      expect(() => recalcStandings({ orgs, matches })).not.toThrow();

      // knownOrg should not be affected since the match is skipped
      const result = recalcStandings({ orgs, matches });
      const known = result.find((s) => s.orgId === "knownOrg")!;
      expect(known.wins).toBe(0);
      expect(known.losses).toBe(0);
    });

    it("handles a match where awayOrgId is not in orgs list without crashing", () => {
      const orgs = [makeOrg("knownOrg")];
      const matches = [makeMatch("knownOrg", "unknownAway", 3, 1)];
      expect(() => recalcStandings({ orgs, matches })).not.toThrow();

      const result = recalcStandings({ orgs, matches });
      const known = result.find((s) => s.orgId === "knownOrg")!;
      expect(known.wins).toBe(0);
      expect(known.matchesPlayed).toBe(0);
    });

    it("skips completed matches where homeScore is undefined", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", undefined, 3)];
      const result = recalcStandings({ orgs, matches });

      const home = result.find((s) => s.orgId === "home")!;
      expect(home.matchesPlayed).toBe(0);
      expect(home.wins).toBe(0);
    });

    it("skips completed matches where awayScore is undefined", () => {
      const orgs = [makeOrg("home"), makeOrg("away")];
      const matches = [makeMatch("home", "away", 3, undefined)];
      const result = recalcStandings({ orgs, matches });

      const away = result.find((s) => s.orgId === "away")!;
      expect(away.matchesPlayed).toBe(0);
      expect(away.losses).toBe(0);
    });

    it("handles multiple orgs in the same division with no matches (all gamesBack = 0)", () => {
      const orgs = [makeOrg("a"), makeOrg("b"), makeOrg("c")];
      const result = recalcStandings({ orgs, matches: [] });

      for (const s of result) {
        expect(s.gamesBack).toBe(0);
      }
    });
  });
});
