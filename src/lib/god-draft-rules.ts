import { DRAFT_FORMAT, getFirstDraftTurn, getNextDraftTurn } from "@/lib/god-draft-format";
import type { DraftActionType, DraftChatChannel, DraftPhase, DraftRole, DraftSelection, DraftSide, DraftState, GodDraftSession } from "@/types/god-draft";

export type DraftTransition =
  | { kind: "advance"; patch: Partial<GodDraftSession> }
  | { kind: "complete"; state: DraftState }
  | { kind: "reset"; patch: Partial<GodDraftSession> };

export function flattenDraftFormat(format: DraftPhase[]) {
  const turns: Array<{ phaseIndex: number; stepIndex: number; type: DraftActionType; side: DraftSide }> = [];
  format.forEach((phase, phaseIndex) => {
    phase.sequence.forEach((side, stepIndex) => turns.push({ phaseIndex, stepIndex, type: phase.type, side }));
  });
  return turns;
}

export function countDraftSlots(format: DraftPhase[], type: DraftActionType, side?: DraftSide) {
  return flattenDraftFormat(format).filter((turn) => turn.type === type && (!side || turn.side === side)).length;
}

export function resetLobbyPatch(): Partial<GodDraftSession> {
  return {
    status: "lobby",
    homeReady: false,
    awayReady: false,
    currentPhaseIndex: 0,
    currentStepIndex: 0,
    currentType: null,
    currentSide: null,
    turnStartedAt: null,
    resetRequestedBy: null,
    draftState: { picks: [], bans: [] },
  };
}

export function activeStatus(type: DraftActionType) {
  return type === "ban" ? "banning" : "picking";
}

export function transitionReady(session: GodDraftSession, side: DraftSide, ready: boolean, format: DraftPhase[] = DRAFT_FORMAT): Partial<GodDraftSession> {
  const homeReady = side === "A" ? ready : session.homeReady;
  const awayReady = side === "B" ? ready : session.awayReady;
  const firstTurn = homeReady && awayReady ? getFirstDraftTurn(format) : null;
  if (!firstTurn) {
    return {
      status: "lobby",
      homeReady,
      awayReady,
      currentType: null,
      currentSide: null,
      turnStartedAt: null,
    };
  }
  return {
    status: activeStatus(firstTurn.type),
    homeReady,
    awayReady,
    currentPhaseIndex: firstTurn.phaseIndex,
    currentStepIndex: firstTurn.stepIndex,
    currentType: firstTurn.type,
    currentSide: firstTurn.side,
    turnStartedAt: "now",
    resetRequestedBy: null,
  };
}

export function applyDraftSelection(session: GodDraftSession, selection: DraftSelection, format: DraftPhase[] = DRAFT_FORMAT): DraftTransition {
  if (session.status === "complete") throw new Error("Draft is complete.");
  if (!session.currentType || !session.currentSide) throw new Error("Draft is not active.");
  const nextState = {
    picks: session.currentType === "pick" ? [...session.draftState.picks, selection] : session.draftState.picks,
    bans: session.currentType === "ban" ? [...session.draftState.bans, selection] : session.draftState.bans,
  };
  const nextTurn = getNextDraftTurn(format, session.currentPhaseIndex, session.currentStepIndex);
  if (!nextTurn) return { kind: "complete", state: nextState };
  return {
    kind: "advance",
    patch: {
      status: activeStatus(nextTurn.type),
      currentPhaseIndex: nextTurn.phaseIndex,
      currentStepIndex: nextTurn.stepIndex,
      currentType: nextTurn.type,
      currentSide: nextTurn.side,
      turnStartedAt: "now",
      draftState: nextState,
    },
  };
}

export function applyTimeout(session: GodDraftSession, format: DraftPhase[] = DRAFT_FORMAT): DraftTransition | null {
  if (session.status === "lobby" || session.status === "complete" || !session.currentType || !session.currentSide) return null;
  if (session.currentType === "pick") return { kind: "reset", patch: resetLobbyPatch() };
  const selection: DraftSelection = {
    side: session.currentSide,
    type: "ban",
    godId: `skipped-${session.currentPhaseIndex}-${session.currentStepIndex}`,
    godName: "Skipped",
    skipped: true,
    createdAt: "timeout",
  };
  return applyDraftSelection(session, selection, format);
}

export function applyResetRequest(session: GodDraftSession, side: DraftSide): Partial<GodDraftSession> {
  if (session.resetRequestedBy && session.resetRequestedBy !== side) return resetLobbyPatch();
  return { resetRequestedBy: side };
}

export function getVaultedGodIdsFromPicks(picks: Array<{ god_id: string; game_number: number }>, gameNumber: number) {
  return [...new Set(picks.filter((pick) => pick.game_number < gameNumber).map((pick) => pick.god_id))];
}

export function addUsedGodId(ids: string[], godId: string) {
  return ids.includes(godId) ? ids : [...ids, godId];
}

export function removeUsedGodId(ids: string[], godId: string, remainingSelections: Array<{ godId: string }>) {
  if (remainingSelections.some((selection) => selection.godId === godId)) return ids;
  return ids.filter((id) => id !== godId);
}

export function canRoleUseChat(role: DraftRole | null, channel: DraftChatChannel) {
  if (!role) return false;
  if (role === "admin") return true;
  if (channel === "team") return role === "home_captain" || role === "away_captain" || role === "team";
  return role === "spectator";
}

export function canRoleSubmitDraftAction(role: DraftRole | null, actorSide: DraftSide | null, turnSide: DraftSide | null) {
  if (!turnSide) return false;
  if (role === "admin") return true;
  if (role === "home_captain" || role === "away_captain") return actorSide === turnSide;
  return false;
}

export function effectiveChatChannel(role: DraftRole | null, requested: DraftChatChannel): DraftChatChannel {
  if (role === "home_captain" || role === "away_captain" || role === "team") return "team";
  return requested;
}

export function validateUniqueDraftState(state: DraftState) {
  const picked = new Set<string>();
  const banned = new Set<string>();
  for (const pick of state.picks) {
    if (picked.has(pick.godId)) return false;
    picked.add(pick.godId);
  }
  for (const ban of state.bans) {
    if (banned.has(ban.godId)) return false;
    banned.add(ban.godId);
    if (picked.has(ban.godId)) return false;
  }
  return true;
}

export function canCreateGameSession(params: {
  gameNumber: number;
  matchStatus: "scheduled" | "live" | "completed" | "postponed";
  existingSession?: { gameNumber: number; status: string } | null;
  previousSessionStatus?: string | null;
}) {
  if (params.matchStatus === "completed" || params.matchStatus === "postponed") return false;
  if (params.existingSession?.gameNumber === params.gameNumber) return false;
  if (params.gameNumber > 1 && params.previousSessionStatus !== "complete") return false;
  return true;
}

export function hasVersionConflict(expectedVersion: number, actualVersion: number) {
  return expectedVersion !== actualVersion;
}
