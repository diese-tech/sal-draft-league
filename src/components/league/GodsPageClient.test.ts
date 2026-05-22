import { describe, expect, it } from "vitest";
import { getQualifiedHighestWinRateStats } from "./GodsPageClient";
import type { PlayerGodStats } from "@/types/league";

function god(overrides: Partial<PlayerGodStats>): PlayerGodStats {
  return {
    godPlayed: "Athena",
    gamesPlayed: 1,
    wins: 1,
    winRate: 100,
    kills: 1,
    deaths: 1,
    assists: 1,
    kda: 2,
    avgDamage: 100,
    avgMitigated: null,
    ...overrides,
  };
}

describe("Highest Win Rate qualification", () => {
  it("excludes one-game 100% win-rate gods", () => {
    const qualified = getQualifiedHighestWinRateStats([
      god({ godPlayed: "One Game Wonder", gamesPlayed: 1, winRate: 100 }),
      god({ godPlayed: "Steady Pick", gamesPlayed: 3, wins: 2, winRate: 67 }),
    ]);

    expect(qualified.map((stat) => stat.godPlayed)).toEqual(["Steady Pick"]);
  });

  it("excludes gods with zero games", () => {
    const qualified = getQualifiedHighestWinRateStats([
      god({ godPlayed: "Unplayed", gamesPlayed: 0, wins: 0, winRate: 0 }),
      god({ godPlayed: "Qualified", gamesPlayed: 4, wins: 2, winRate: 50 }),
    ]);

    expect(qualified.map((stat) => stat.godPlayed)).toEqual(["Qualified"]);
  });
});
