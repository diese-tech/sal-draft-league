import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { DRAFT_FORMAT, getDraftTurn, getNextDraftTurn } from "@/lib/god-draft-format";
import {
  addUsedGodId,
  applyDraftSelection,
  applyResetRequest,
  applyTimeout,
  canRoleSubmitDraftAction,
  canRoleUseChat,
  canCreateGameSession,
  countDraftSlots,
  effectiveChatChannel,
  flattenDraftFormat,
  getVaultedGodIdsFromPicks,
  removeUsedGodId,
  transitionReady,
  validateUniqueDraftState,
  hasVersionConflict,
} from "@/lib/god-draft-rules";
import type { DraftPhase, DraftSelection, DraftSide, GodDraftSession } from "@/types/god-draft";

const EXTENDED_FORMAT: DraftPhase[] = [
  { type: "ban", sequence: ["A", "B", "A", "B", "A", "B"] },
  { type: "pick", sequence: ["A", "B", "B", "A", "A", "B"] },
  { type: "ban", sequence: ["B", "A", "B", "A"] },
  { type: "pick", sequence: ["B", "A", "A", "B"] },
];

function session(overrides: Partial<GodDraftSession> = {}): GodDraftSession {
  return {
    id: "draft-1",
    matchId: "match-1",
    gameNumber: 1,
    status: "lobby",
    homeReady: false,
    awayReady: false,
    currentPhaseIndex: 0,
    currentStepIndex: 0,
    currentType: null,
    currentSide: null,
    turnStartedAt: null,
    draftState: { picks: [], bans: [] },
    resetRequestedBy: null,
    ...overrides,
  };
}

function selection(side: DraftSide, type: "pick" | "ban", godId: string): DraftSelection {
  return { side, type, godId, godName: godId, createdAt: "now" };
}

describe("god draft phase config engine", () => {
  it("produces the current 3-phase 16-step sequence from config only", () => {
    expect(flattenDraftFormat(DRAFT_FORMAT).map((turn) => `${turn.type}:${turn.side}`)).toEqual([
      "ban:A", "ban:B", "ban:A", "ban:B", "ban:A", "ban:B",
      "pick:A", "pick:B", "pick:B", "pick:A", "pick:A", "pick:B",
      "pick:B", "pick:A", "pick:A", "pick:B",
    ]);
  });

  it("produces the extended 4-phase 20-step sequence and starts BANS 2 with team B", () => {
    const turns = flattenDraftFormat(EXTENDED_FORMAT);
    expect(turns).toHaveLength(20);
    expect(turns.slice(12, 16).map((turn) => `${turn.type}:${turn.side}`)).toEqual(["ban:B", "ban:A", "ban:B", "ban:A"]);
    expect(turns.slice(16).map((turn) => `${turn.type}:${turn.side}`)).toEqual(["pick:B", "pick:A", "pick:A", "pick:B"]);
  });

  it("identifies current phase, slot, team, and completion", () => {
    expect(getDraftTurn(EXTENDED_FORMAT, 2, 0)).toEqual({ phaseIndex: 2, stepIndex: 0, type: "ban", side: "B" });
    expect(getNextDraftTurn(EXTENDED_FORMAT, 1, 5)).toEqual({ phaseIndex: 2, stepIndex: 0, type: "ban", side: "B" });
    expect(getNextDraftTurn(DRAFT_FORMAT, 2, 3)).toBeNull();
  });

  it("skips a removed phase by beginning the next configured phase immediately", () => {
    const withoutBans2 = EXTENDED_FORMAT.filter((_, index) => index !== 2);
    expect(getNextDraftTurn(withoutBans2, 1, 5)).toEqual({ phaseIndex: 2, stepIndex: 0, type: "pick", side: "B" });
  });

  it("counts picks and bans per team from any phase arrangement", () => {
    expect(countDraftSlots(EXTENDED_FORMAT, "pick", "A")).toBe(5);
    expect(countDraftSlots(EXTENDED_FORMAT, "pick", "B")).toBe(5);
    expect(countDraftSlots(EXTENDED_FORMAT, "ban", "A")).toBe(5);
    expect(countDraftSlots(EXTENDED_FORMAT, "ban", "B")).toBe(5);
    expect(countDraftSlots(DRAFT_FORMAT, "ban", "A")).toBe(3);
    expect(countDraftSlots(DRAFT_FORMAT, "ban", "B")).toBe(3);
  });

  it("handles only-pick, only-ban, and single-phase configs without crashing", () => {
    const picksOnly: DraftPhase[] = [{ type: "pick", sequence: ["A", "B"] }];
    const bansOnly: DraftPhase[] = [{ type: "ban", sequence: ["A"] }];
    expect(flattenDraftFormat(picksOnly)).toHaveLength(2);
    expect(applyDraftSelection(session({ status: "picking", currentType: "pick", currentSide: "A" }), selection("A", "pick", "athena"), picksOnly).kind).toBe("advance");
    expect(applyDraftSelection(session({ status: "banning", currentType: "ban", currentSide: "A" }), selection("A", "ban", "athena"), bansOnly).kind).toBe("complete");
  });
});

describe("god draft timer and state machine rules", () => {
  it("ban timeout skips the slot and advances, including the final ban slot of a phase", () => {
    const midBan = applyTimeout(session({ status: "banning", currentType: "ban", currentSide: "A" }));
    expect(midBan?.kind).toBe("advance");
    if (midBan?.kind === "advance") expect(midBan.patch.currentStepIndex).toBe(1);

    const finalBan = applyTimeout(session({ status: "banning", currentPhaseIndex: 0, currentStepIndex: 5, currentType: "ban", currentSide: "B" }));
    expect(finalBan?.kind).toBe("advance");
    if (finalBan?.kind === "advance") expect(finalBan.patch.currentType).toBe("pick");
  });

  it("pick timeout wipes first, mid, and last pick slots back to clean lobby", () => {
    for (const [phaseIndex, stepIndex, side] of [[1, 0, "A"], [1, 3, "A"], [2, 3, "B"]] as const) {
      const result = applyTimeout(session({
        status: "picking",
        homeReady: true,
        awayReady: true,
        currentPhaseIndex: phaseIndex,
        currentStepIndex: stepIndex,
        currentType: "pick",
        currentSide: side,
        draftState: { picks: [selection("A", "pick", "athena")], bans: [selection("B", "ban", "ymir")] },
      }));
      expect(result?.kind).toBe("reset");
      if (result?.kind === "reset") {
        expect(result.patch.status).toBe("lobby");
        expect(result.patch.homeReady).toBe(false);
        expect(result.patch.awayReady).toBe(false);
        expect(result.patch.draftState).toEqual({ picks: [], bans: [] });
      }
    }
  });

  it("timer does not fire in lobby or complete", () => {
    expect(applyTimeout(session({ status: "lobby" }))).toBeNull();
    expect(applyTimeout(session({ status: "complete" }))).toBeNull();
  });

  it("requires lobby and both ready flags before starting, then resets readiness on wipe", () => {
    const oneReady = transitionReady(session(), "A", true);
    expect(oneReady.status).toBe("lobby");
    expect(oneReady.currentType).toBeNull();
    const bothReady = transitionReady(session({ homeReady: true }), "B", true);
    expect(bothReady.status).toBe("banning");
    expect(bothReady.currentSide).toBe("A");
    const afterWipe = applyTimeout(session({ status: "picking", homeReady: true, awayReady: true, currentType: "pick", currentSide: "A" }));
    expect(afterWipe?.kind).toBe("reset");
  });

  it("blocks complete state actions and requires bilateral manual reset consent", () => {
    expect(() => applyDraftSelection(session({ status: "complete", currentType: "pick", currentSide: "A" }), selection("A", "pick", "athena"))).toThrow("complete");
    expect(applyResetRequest(session(), "A")).toEqual({ resetRequestedBy: "A" });
    expect(applyResetRequest(session({ resetRequestedBy: "A" }), "B")).toMatchObject({ status: "lobby", draftState: { picks: [], bans: [] } });
  });
});

describe("god draft vault and uniqueness rules", () => {
  it("vaults only prior-game picks, never bans, and deduplicates", () => {
    const vault = getVaultedGodIdsFromPicks([
      { god_id: "athena", game_number: 1 },
      { god_id: "athena", game_number: 1 },
      { god_id: "ymir", game_number: 2 },
    ], 2);
    expect(vault).toEqual(["athena"]);
    expect(addUsedGodId(["athena"], "athena")).toEqual(["athena"]);
    expect(removeUsedGodId(["athena", "ymir"], "athena", [{ godId: "athena" }])).toEqual(["athena", "ymir"]);
    expect(removeUsedGodId(["athena", "ymir"], "athena", [])).toEqual(["ymir"]);
  });

  it("allows game-1 bans to be picked or banned again in game 2 while all 10 picks are unavailable", () => {
    const game1Picks = Array.from({ length: 10 }, (_, index) => ({ god_id: `pick-${index}`, game_number: 1 }));
    const vault = getVaultedGodIdsFromPicks(game1Picks, 2);
    expect(vault).toHaveLength(10);
    expect(vault).not.toContain("game-1-ban");
  });

  it("detects same-session duplicates across picks and bans", () => {
    expect(validateUniqueDraftState({ picks: [selection("A", "pick", "athena")], bans: [selection("B", "ban", "ymir")] })).toBe(true);
    expect(validateUniqueDraftState({ picks: [selection("A", "pick", "athena"), selection("B", "pick", "athena")], bans: [] })).toBe(false);
    expect(validateUniqueDraftState({ picks: [selection("A", "pick", "athena")], bans: [selection("B", "ban", "athena")] })).toBe(false);
  });

  it("models concurrent submission conflicts and duplicate session gating", () => {
    expect(hasVersionConflict(4, 5)).toBe(true);
    expect(hasVersionConflict(5, 5)).toBe(false);
    expect(canCreateGameSession({ gameNumber: 2, matchStatus: "scheduled", previousSessionStatus: "banning" })).toBe(false);
    expect(canCreateGameSession({ gameNumber: 2, matchStatus: "scheduled", previousSessionStatus: "complete" })).toBe(true);
    expect(canCreateGameSession({ gameNumber: 1, matchStatus: "completed" })).toBe(false);
    expect(canCreateGameSession({ gameNumber: 1, matchStatus: "postponed" })).toBe(false);
    expect(canCreateGameSession({ gameNumber: 1, matchStatus: "scheduled", existingSession: { gameNumber: 1, status: "pending" } })).toBe(false);
  });
});

describe("god draft chat and auth redirect rules", () => {
  it("matches draft action controls to server-side captain and admin authorization", () => {
    expect(canRoleSubmitDraftAction("admin", null, "A")).toBe(true);
    expect(canRoleSubmitDraftAction("home_captain", "A", "A")).toBe(true);
    expect(canRoleSubmitDraftAction("away_captain", "B", "B")).toBe(true);
    expect(canRoleSubmitDraftAction("home_captain", "A", "B")).toBe(false);
    expect(canRoleSubmitDraftAction("team", "A", "A")).toBe(false);
    expect(canRoleSubmitDraftAction("spectator", null, "A")).toBe(false);
    expect(canRoleSubmitDraftAction(null, null, "A")).toBe(false);
    expect(canRoleSubmitDraftAction("admin", null, null)).toBe(false);
  });

  it("enforces team/spectator/admin chat access at API decision level", () => {
    expect(canRoleUseChat("team", "team")).toBe(true);
    expect(canRoleUseChat("spectator", "team")).toBe(false);
    expect(canRoleUseChat("spectator", "spectator")).toBe(true);
    expect(canRoleUseChat(null, "spectator")).toBe(false);
    expect(canRoleUseChat("admin", "team")).toBe(true);
    expect(canRoleUseChat("admin", "spectator")).toBe(true);
    expect(effectiveChatChannel("team", "spectator")).toBe("team");
  });

  it("preserves draft URL through OAuth and rejects external redirect targets", () => {
    expect(safeRedirectPath("/draft/god/match-1")).toBe("/draft/god/match-1");
    expect(safeRedirectPath("https://evil.example/draft")).toBe("/register");
    expect(safeRedirectPath("//evil.example")).toBe("/register");
  });
});
