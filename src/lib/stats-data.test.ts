import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLeagueGodStats,
  getOrgBrandGodStats,
  getOrgGodTendencies,
  getPlayerGodStats,
  getPlayerMatchHistory,
  getPlayerSeasonSummaries,
  getTeamRosterStats,
} from "./stats-data";
import type { Org } from "@/types/league";

type QueryState = {
  table: string;
  select?: string;
  eqs: Array<[string, unknown]>;
  ins: Array<[string, unknown[]]>;
};

type QueryResult = { data: unknown; error: { message: string } | null };
type QueryHandler = (query: QueryState) => QueryResult;

class FakeQuery {
  private state: QueryState;

  constructor(table: string, private readonly handler: QueryHandler) {
    this.state = { table, eqs: [], ins: [] };
  }

  select(columns: string) {
    this.state.select = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.state.eqs.push([column, value]);
    return this;
  }

  in(column: string, value: unknown[]) {
    this.state.ins.push([column, value]);
    return this;
  }

  not() {
    return this;
  }

  order() {
    return this;
  }

  single() {
    return this.execute();
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    return this.handler(this.state);
  }
}

function makeClient(handler: QueryHandler) {
  return {
    from: (table: string) => new FakeQuery(table, handler),
  };
}

let client: ReturnType<typeof makeClient> | null = null;

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: () => client,
}));

const homeMatch = {
  scheduled_date: "2026-05-01",
  division_id: "gaia",
  season_id: "season-1",
  home_org_id: "org-a",
  away_org_id: "org-b",
  home_org: { id: "org-a", name: "Alpha", tag: "ALP" },
  away_org: { id: "org-b", name: "Beta", tag: "BET" },
};

const awayMatch = {
  scheduled_date: "2026-05-02",
  division_id: "solar",
  season_id: "season-1",
  home_org_id: "org-c",
  away_org_id: "org-a",
  home_org: { id: "org-c", name: "Comet", tag: "COM" },
  away_org: { id: "org-a", name: "Alpha", tag: "ALP" },
};

function statRow(overrides: Record<string, unknown>) {
  return {
    match_id: "match-1",
    game_number: 1,
    god_played: "Achilles",
    role: "Solo",
    kills: 4,
    deaths: 2,
    assists: 6,
    damage_dealt: 12000,
    damage_mitigated: 5000,
    healing_done: null,
    won: true,
    matches: homeMatch,
    player: { org_id: "org-a", primary_role: "Solo" },
    ...overrides,
  };
}

function eqValue(query: QueryState, column: string) {
  return query.eqs.find(([key]) => key === column)?.[1];
}

beforeEach(() => {
  client = null;
});

describe("player match and god stats", () => {
  it("aggregates god stats across multiple games and keeps per-game god pools", async () => {
    const rows = [
      statRow({ game_number: 1, god_played: "Achilles", kills: 1, deaths: 1, assists: 2, won: true }),
      statRow({ game_number: 2, god_played: "Amaterasu", kills: 2, deaths: 1, assists: 5, won: false }),
      statRow({ game_number: 3, god_played: "Amaterasu", kills: 3, deaths: 2, assists: 6, won: true }),
    ];
    client = makeClient(() => ({ data: rows, error: null }));

    const stats = await getPlayerGodStats("player-1", "season-1");

    expect(stats).toMatchObject([
      { godPlayed: "Amaterasu", gamesPlayed: 2, wins: 1, kills: 5, deaths: 3, assists: 11, winRate: 50 },
      { godPlayed: "Achilles", gamesPlayed: 1, wins: 1, kills: 1, deaths: 1, assists: 2, winRate: 100 },
    ]);
  });

  it("calculates KDA with zero deaths as kills plus assists", async () => {
    client = makeClient(() => ({
      data: [statRow({ kills: 7, deaths: 0, assists: 8, god_played: "Ymir" })],
      error: null,
    }));

    const [ymir] = await getPlayerGodStats("player-1");

    expect(ymir.kda).toBe(15);
    expect(Number.isFinite(ymir.kda)).toBe(true);
  });

  it("returns an empty god pool for players with zero games", async () => {
    client = makeClient(() => ({ data: [], error: null }));

    await expect(getPlayerGodStats("player-1")).resolves.toEqual([]);
  });

  it("tracks one god across all three games", async () => {
    client = makeClient(() => ({
      data: [1, 2, 3].map((gameNumber) => statRow({ game_number: gameNumber, god_played: "Hecate" })),
      error: null,
    }));

    await expect(getPlayerGodStats("player-1")).resolves.toMatchObject([{ godPlayed: "Hecate", gamesPlayed: 3 }]);
  });

  it("does not invent a third game for 2-0 matches", async () => {
    client = makeClient(() => ({
      data: [1, 2].map((gameNumber) => statRow({ game_number: gameNumber, match_id: "match-2-0" })),
      error: null,
    }));

    const stats = await getPlayerGodStats("player-1");

    expect(stats[0].gamesPlayed).toBe(2);
  });

  it("derives opponent org when the player is on the home team", async () => {
    client = makeClient(() => ({ data: [statRow({ matches: homeMatch, player: { org_id: "org-a", primary_role: "Solo" } })], error: null }));

    const [match] = await getPlayerMatchHistory("player-1");

    expect(match).toMatchObject({ opponentOrgId: "org-b", opponentOrgName: "Beta", opponentOrgTag: "BET" });
  });

  it("derives opponent org when the player is on the away team", async () => {
    client = makeClient(() => ({ data: [statRow({ matches: awayMatch, player: { org_id: "org-a", primary_role: "Solo" } })], error: null }));

    const [match] = await getPlayerMatchHistory("player-1");

    expect(match).toMatchObject({ opponentOrgId: "org-c", opponentOrgName: "Comet", opponentOrgTag: "COM" });
  });

  it("applies the season filter to exclude out-of-season rows", async () => {
    const rows = [
      statRow({ match_id: "current", matches: { ...homeMatch, season_id: "season-1" } }),
      statRow({ match_id: "old", matches: { ...homeMatch, season_id: "season-old" } }),
    ];
    client = makeClient((query) => ({
      data: rows.filter((row) => row.matches.season_id === eqValue(query, "matches.season_id")),
      error: null,
    }));

    const history = await getPlayerMatchHistory("player-1", "season-1");

    expect(history).toHaveLength(1);
    expect(history[0].matchId).toBe("current");
  });

  it("includes unfiltered god stats from both divisions", async () => {
    client = makeClient(() => ({
      data: [
        statRow({ matches: { ...homeMatch, division_id: "gaia" }, god_played: "Terra" }),
        statRow({ matches: { ...awayMatch, division_id: "solar" }, god_played: "Ra" }),
      ],
      error: null,
    }));

    const stats = await getPlayerGodStats("player-1");

    expect(stats.map((stat) => stat.godPlayed).sort()).toEqual(["Ra", "Terra"]);
  });

  it("computes mitigation averages only across non-null rows", async () => {
    client = makeClient(() => ({
      data: [
        statRow({ god_played: "Bellona", damage_mitigated: 1000 }),
        statRow({ god_played: "Bellona", damage_mitigated: null }),
        statRow({ god_played: "Bellona", damage_mitigated: 3000 }),
      ],
      error: null,
    }));

    const [bellona] = await getPlayerGodStats("player-1");

    expect(bellona.avgMitigated).toBe(2000);
  });
});

describe("season, roster, and org god aggregations", () => {
  it("returns two season summary rows when a player subs into a higher division", async () => {
    const rows = [
      statRow({ matches: { ...homeMatch, season_id: "season-1", division_id: "gaia" } }),
      statRow({ matches: { ...awayMatch, season_id: "season-1", division_id: "solar" } }),
    ];
    client = makeClient((query) => {
      if (query.table === "seasons") return { data: [{ id: "season-1", name: "Season 1", start_date: "2026-01-01" }], error: null };
      return { data: rows, error: null };
    });

    const summaries = await getPlayerSeasonSummaries("player-1");

    expect(summaries).toHaveLength(2);
    expect(summaries.map((row) => row.divisionId).sort()).toEqual(["gaia", "solar"]);
  });

  it("computes team roster per-game averages by games played", async () => {
    client = makeClient(() => ({
      data: [
        { player_id: "p1", kills: 1, deaths: 1, assists: 1, damage_dealt: 100, damage_mitigated: 50, won: true, players: { ign: "One", primary_role: "Mid" } },
        { player_id: "p1", kills: 3, deaths: 1, assists: 5, damage_dealt: 300, damage_mitigated: 150, won: false, players: { ign: "One", primary_role: "Mid" } },
      ],
      error: null,
    }));

    const [player] = await getTeamRosterStats("org-a");

    expect(player).toMatchObject({ gamesPlayed: 2, totalDamage: 400, avgDamage: 200, totalMitigated: 200, avgMitigated: 100 });
  });

  it("aggregates brand god stats across every org sharing brand_id", async () => {
    client = makeClient((query) => {
      if (query.table === "players") {
        return { data: [{ id: "p1" }, { id: "p2" }], error: null };
      }
      return {
        data: [
          { god_played: "Athena", kills: 1, deaths: 1, assists: 3, damage_dealt: 1000, damage_mitigated: 2000, won: true },
          { god_played: "Athena", kills: 2, deaths: 1, assists: 2, damage_dealt: 2000, damage_mitigated: 3000, won: false },
        ],
        error: null,
      };
    });

    const [athena] = await getOrgBrandGodStats("brand-a", "season-1");

    expect(athena).toMatchObject({ godPlayed: "Athena", gamesPlayed: 2, wins: 1 });
  });

  it("only returns org tendency cards for orgs with stat rows", async () => {
    const orgs: Org[] = [
      { id: "org-a", name: "Alpha", tag: "ALP", divisionId: "gaia", logoInitials: "A", logoGradient: "", primaryColor: "", accentGradient: "" },
      { id: "org-empty", name: "Empty", tag: "EMP", divisionId: "solar", logoInitials: "E", logoGradient: "", primaryColor: "", accentGradient: "" },
    ];
    client = makeClient((query) => {
      if (query.table === "player_stats") {
        return {
          data: [{ god_played: "Athena", kills: 1, deaths: 1, assists: 1, damage_dealt: 1, damage_mitigated: null, won: true, matches: { season_id: "season-1", division_id: "gaia" }, player: { org_id: "org-a" } }],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const tendencies = await getOrgGodTendencies(orgs, "season-1");

    expect(tendencies).toHaveLength(1);
    expect(tendencies[0]).toMatchObject({ orgId: "org-a", topGods: [{ godPlayed: "Athena", gamesPlayed: 1 }] });
  });

  it("filters league god stats by division and attaches class metadata", async () => {
    client = makeClient((query) => {
      if (query.table === "gods") return { data: [{ name: "Athena", class: "Guardian" }], error: null };
      return {
        data: [
          { god_played: "Athena", kills: 1, deaths: 1, assists: 1, damage_dealt: 1, damage_mitigated: null, won: true, matches: { season_id: "season-1", division_id: "solar" } },
        ].filter((row) => row.matches.division_id === eqValue(query, "matches.division_id")),
        error: null,
      };
    });

    const [athena] = await getLeagueGodStats("season-1", "solar");

    expect(athena).toMatchObject({ godPlayed: "Athena", gamesPlayed: 1, godClass: "Guardian", divisionIds: ["solar"] });
  });
});
