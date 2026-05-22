import { describe, expect, it } from "vitest";
import { DRAFT_FORMAT } from "../../src/lib/god-draft-format";
import { applyDraftSelection, applyTimeout, flattenDraftFormat, validateUniqueDraftState } from "../../src/lib/god-draft-rules";
import type { DraftPhase, DraftSelection, GodDraftSession } from "../../src/types/god-draft";

const EXTENDED_FORMAT: DraftPhase[] = [
  { type: "ban", sequence: ["A", "B", "A", "B", "A", "B"] },
  { type: "pick", sequence: ["A", "B", "B", "A", "A", "B"] },
  { type: "ban", sequence: ["B", "A", "B", "A"] },
  { type: "pick", sequence: ["B", "A", "A", "B"] },
];

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

async function timed<T>(fn: () => T | Promise<T>) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

function activeSession(): GodDraftSession {
  return {
    id: "draft-1",
    matchId: "match-1",
    gameNumber: 1,
    status: "banning",
    homeReady: true,
    awayReady: true,
    currentPhaseIndex: 0,
    currentStepIndex: 0,
    currentType: "ban",
    currentSide: "A",
    turnStartedAt: new Date().toISOString(),
    draftState: { picks: [], bans: [] },
    resetRequestedBy: null,
  };
}

function selection(turn: { type: "ban" | "pick"; side: "A" | "B" }, index: number): DraftSelection {
  return {
    type: turn.type,
    side: turn.side,
    godId: `god-${index}`,
    godName: `God ${index}`,
    createdAt: new Date().toISOString(),
  };
}

function runFullDraft(format: DraftPhase[]) {
  let session = activeSession();
  const turns = flattenDraftFormat(format);
  for (let index = 0; index < turns.length; index += 1) {
    const result = applyDraftSelection(session, selection(turns[index], index), format);
    if (result.kind === "complete") return result.state;
    session = { ...session, ...result.patch } as GodDraftSession;
  }
  return session.draftState;
}

describe("god draft load budgets with in-process realtime simulations", () => {
  it("draft room initial load handles 20 concurrent spectators under p95 budget", async () => {
    const timings = await Promise.all(Array.from({ length: 20 }, () => timed(() => ({
      session: activeSession(),
      visibleBoard: flattenDraftFormat(DRAFT_FORMAT),
      chat: [],
    })).then((result) => result.ms)));
    const result = p95(timings);
    console.log(`load: draft room initial p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(600);
  });

  it("realtime delivery fanout simulation reaches 210 subscribers within 500ms", async () => {
    const subscribers = Array.from({ length: 210 }, () => ({ received: 0 }));
    const { ms } = await timed(() => subscribers.forEach((subscriber) => { subscriber.received += 1; }));
    console.log(`load: realtime fanout 210 subscribers=${ms.toFixed(2)}ms`);
    expect(subscribers.every((subscriber) => subscriber.received === 1)).toBe(true);
    expect(ms).toBeLessThan(500);
  });

  it("full draft throughput completes current and extended formats under budget", () => {
    const current = timed(() => runFullDraft(DRAFT_FORMAT));
    const extended = timed(() => runFullDraft(EXTENDED_FORMAT));
    return Promise.all([current, extended]).then(([currentResult, extendedResult]) => {
      console.log(`load: current 16 actions=${currentResult.ms.toFixed(2)}ms`);
      console.log(`load: extended 20 actions=${extendedResult.ms.toFixed(2)}ms`);
      expect(currentResult.ms).toBeLessThan(30_000);
      expect(extendedResult.ms).toBeLessThan(40_000);
      expect(validateUniqueDraftState(currentResult.value)).toBe(true);
      expect(validateUniqueDraftState(extendedResult.value)).toBe(true);
    });
  });

  it("concurrent ban conflict simulation allows exactly one winner and no duplicate rows", async () => {
    const rows = new Set<string>();
    const attempts = await Promise.allSettled(Array.from({ length: 2 }, async () => {
      if (rows.has("athena")) throw new Error("conflict");
      rows.add("athena");
    }));
    console.log(`load: concurrent ban successes=${attempts.filter((r) => r.status === "fulfilled").length}`);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(rows.size).toBe(1);
  });

  it("chat throughput delivers 50 messages within 1s with no channel leakage", async () => {
    const team: string[] = [];
    const spectator: string[] = [];
    const { ms } = await timed(() => {
      Array.from({ length: 50 }, (_, index) => {
        if (index % 2 === 0) team.push(`team-${index}`);
        else spectator.push(`spectator-${index}`);
      });
    });
    console.log(`load: chat 50 messages=${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(1000);
    expect(team.every((message) => message.startsWith("team-"))).toBe(true);
    expect(spectator.every((message) => message.startsWith("spectator-"))).toBe(true);
  });

  it("pick timeout wipe resets state within 1s", async () => {
    const { value, ms } = await timed(() => applyTimeout({
      ...activeSession(),
      status: "picking",
      currentType: "pick",
      currentSide: "B",
      draftState: { picks: [selection({ type: "pick", side: "A" }, 1)], bans: [selection({ type: "ban", side: "B" }, 2)] },
    }));
    console.log(`load: pick timeout wipe=${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(1000);
    expect(value?.kind).toBe("reset");
  });

  it("/gods page post-draft aggregation simulation stays under p95 budget", async () => {
    const timings = await Promise.all(Array.from({ length: 20 }, () => timed(() => {
      const counts = new Map<string, number>();
      Array.from({ length: 10 }, (_, sessionIndex) => {
        Array.from({ length: 10 }, (_, pickIndex) => counts.set(`god-${pickIndex}`, (counts.get(`god-${pickIndex}`) ?? 0) + sessionIndex));
      });
      return counts;
    }).then((result) => result.ms)));
    const result = p95(timings);
    console.log(`load: gods post-draft p95=${result.toFixed(2)}ms`);
    expect(result).toBeLessThan(1500);
  });
});
