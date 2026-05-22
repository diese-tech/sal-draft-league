import { describe, expect, it, vi } from "vitest";
import { getLeagueGodStats, getPlayerGodStats, getTeamRosterStats } from "../../src/lib/stats-data";

type QueryState = {
  table: string;
  select?: string;
  eqs: Array<[string, unknown]>;
};

class FakeQuery {
  private state: QueryState;

  constructor(table: string, private readonly dataFor: (query: QueryState) => unknown[]) {
    this.state = { table, eqs: [] };
  }

  select(columns: string) {
    this.state.select = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.state.eqs.push([column, value]);
    return this;
  }

  not() {
    return this;
  }

  then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.dataFor(this.state), error: null }).then(onfulfilled, onrejected);
  }
}

let dataForQuery: (query: QueryState) => unknown[] = () => [];

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: (table: string) => new FakeQuery(table, dataForQuery),
  }),
}));

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

async function runConcurrent(count: number, fn: () => Promise<unknown>) {
  const timings = await Promise.all(
    Array.from({ length: count }, async () => {
      const start = performance.now();
      await fn();
      return performance.now() - start;
    }),
  );
  return p95(timings);
}

function statRows(count: number) {
  const gods = ["Athena", "Achilles", "Hecate", "Ymir", "Ra", "Bellona"];
  return Array.from({ length: count }, (_, index) => ({
    player_id: `player-${index % 6}`,
    god_played: gods[index % gods.length],
    kills: index % 12,
    deaths: index % 4,
    assists: index % 18,
    damage_dealt: 10000 + index,
    damage_mitigated: index % 3 === 0 ? null : 5000 + index,
    won: index % 2 === 0,
    matches: {
      scheduled_date: "2026-05-01",
      season_id: "season-1",
      division_id: "solar",
      home_org_id: "org-a",
      away_org_id: "org-b",
      home_org: { id: "org-a", name: "Alpha", tag: "ALP" },
      away_org: { id: "org-b", name: "Beta", tag: "BET" },
    },
    player: { org_id: "org-a", primary_role: "Mid" },
    players: { ign: `Player ${index % 6}`, primary_role: "Mid" },
  }));
}

describe("stats load budgets with mocked Supabase data", () => {
  it("player page cold load stays below p95 budget for 50 concurrent requests and 30 stat rows", async () => {
    dataForQuery = (query) => (query.table === "player_stats" ? statRows(30) : []);

    const result = await runConcurrent(50, () => getPlayerGodStats("player-1", "season-1"));

    console.log(`load: player cold p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(800);
  });

  it("player page warm cache scenario stays below p95 budget for repeated requests", async () => {
    dataForQuery = (query) => (query.table === "player_stats" ? statRows(30) : []);
    await getPlayerGodStats("player-1", "season-1");

    const result = await runConcurrent(50, () => getPlayerGodStats("player-1", "season-1"));

    console.log(`load: player warm p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(100);
  });

  it("god stats page stays below p95 budget with 500 player stat rows", async () => {
    dataForQuery = (query) => (query.table === "gods" ? [] : statRows(500));

    const result = await runConcurrent(20, () => getLeagueGodStats("season-1", "solar"));

    console.log(`load: gods 500 rows p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(1200);
  });

  it("god stats page scale stays below p95 budget with 5000 player stat rows", async () => {
    dataForQuery = (query) => (query.table === "gods" ? [] : statRows(5000));

    const result = await runConcurrent(20, () => getLeagueGodStats("season-1", "solar"));

    console.log(`load: gods 5000 rows p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(2000);
  });

  it("team roster stats stays below p95 budget for 20 concurrent requests", async () => {
    dataForQuery = (query) => (query.table === "player_stats" ? statRows(300) : []);

    const result = await runConcurrent(20, () => getTeamRosterStats("org-a", "season-1"));

    console.log(`load: team roster p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(800);
  });

  it("cache invalidation stampede simulation has no 500s", async () => {
    dataForQuery = (query) => (query.table === "gods" ? [] : statRows(500));

    const results = await Promise.allSettled(Array.from({ length: 50 }, () => getLeagueGodStats("season-1", "solar")));
    const rejected = results.filter((result) => result.status === "rejected");

    console.log(`load: stampede rejected=${rejected.length}`);
    expect(rejected).toHaveLength(0);
  });
});
