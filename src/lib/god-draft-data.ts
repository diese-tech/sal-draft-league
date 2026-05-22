import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { getFirstDraftTurn, getNextDraftTurn, DRAFT_FORMAT, emptyDraftState } from "@/lib/god-draft-format";
import { canRoleUseChat, effectiveChatChannel } from "@/lib/god-draft-rules";
import { getLeagueData, getPlayerByDiscordId } from "@/lib/league-data";
import { getAuthUser, getDiscordDisplayName, getDiscordId } from "@/lib/supabase-auth-server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type {
  DraftActionType,
  DraftChatChannel,
  DraftChatMessage,
  DraftGod,
  DraftRole,
  DraftSelection,
  DraftSide,
  DraftState,
  GodDraftRoomData,
  GodDraftSession,
} from "@/types/god-draft";
import type { LeaguePlayer, Match, Org } from "@/types/league";

const FALLBACK_GODS: DraftGod[] = [
  { id: "achilles", name: "Achilles", class: "Warrior", damageType: "physical" },
  { id: "anhur", name: "Anhur", class: "Hunter", damageType: "physical" },
  { id: "athena", name: "Athena", class: "Guardian", damageType: "magical" },
  { id: "baron-samedi", name: "Baron Samedi", class: "Mage", damageType: "magical" },
  { id: "bellona", name: "Bellona", class: "Warrior", damageType: "physical" },
  { id: "cerberus", name: "Cerberus", class: "Guardian", damageType: "magical" },
  { id: "danzaburou", name: "Danzaburou", class: "Hunter", damageType: "physical" },
  { id: "fenrir", name: "Fenrir", class: "Assassin", damageType: "physical" },
  { id: "isis", name: "Isis", class: "Mage", damageType: "magical" },
  { id: "merlin", name: "Merlin", class: "Mage", damageType: "magical" },
  { id: "nemesis", name: "Nemesis", class: "Assassin", damageType: "physical" },
  { id: "ymir", name: "Ymir", class: "Guardian", damageType: "magical" },
];

interface Identity {
  discordId: string | null;
  displayName: string;
  player: LeaguePlayer | null;
  isAdmin: boolean;
}

function normalizeDraftState(value: unknown): DraftState {
  if (!value || typeof value !== "object") return emptyDraftState();
  const state = value as Partial<DraftState>;
  return {
    picks: Array.isArray(state.picks) ? state.picks : [],
    bans: Array.isArray(state.bans) ? state.bans : [],
  };
}

function fromSessionRow(row: Record<string, unknown>): GodDraftSession {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    gameNumber: Number(row.game_number ?? 1),
    status: String(row.status ?? "pending") as GodDraftSession["status"],
    homeReady: Boolean(row.home_ready),
    awayReady: Boolean(row.away_ready),
    currentPhaseIndex: Number(row.current_phase_index ?? 0),
    currentStepIndex: Number(row.current_step_index ?? 0),
    currentType: (row.current_type as DraftActionType | null) ?? null,
    currentSide: (row.current_side as DraftSide | null) ?? null,
    turnStartedAt: (row.turn_started_at as string | null) ?? null,
    draftState: normalizeDraftState(row.draft_state),
    resetRequestedBy: (row.reset_requested_by as DraftSide | null) ?? null,
  };
}

function fromChatRow(row: Record<string, unknown>): DraftChatMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    channel: String(row.channel) as DraftChatChannel,
    senderName: String(row.sender_name ?? "Player"),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at),
  };
}

function fallbackSession(sessionId: string, match: Match): GodDraftSession {
  return {
    id: sessionId,
    matchId: match.id,
    gameNumber: 1,
    status: "pending",
    homeReady: false,
    awayReady: false,
    currentPhaseIndex: 0,
    currentStepIndex: 0,
    currentType: null,
    currentSide: null,
    turnStartedAt: null,
    draftState: emptyDraftState(),
    resetRequestedBy: null,
  };
}

function sideForRole(role: DraftRole | null): DraftSide | null {
  if (role === "home_captain") return "A";
  if (role === "away_captain") return "B";
  return null;
}

async function getIdentity(): Promise<Identity> {
  const [user, admin] = await Promise.all([getAuthUser(), getAdminSession()]);
  const discordId = user ? getDiscordId(user) : admin?.discordId ?? null;
  const player = discordId ? await getPlayerByDiscordId(discordId) : null;
  return {
    discordId,
    displayName: user ? getDiscordDisplayName(user) : admin ? "Admin" : "Spectator",
    player,
    isAdmin: Boolean(admin),
  };
}

function resolveRole(identity: Identity, match: Match, homeOrg: Org, awayOrg: Org): { role: DraftRole | null; side: DraftSide | null } {
  if (identity.isAdmin) return { role: "admin", side: null };
  if (!identity.player) return { role: identity.discordId ? "spectator" : null, side: null };
  if (identity.player.isCaptain && (identity.player.orgId === homeOrg.id || homeOrg.captainId === identity.player.id)) {
    return { role: "home_captain", side: "A" };
  }
  if (identity.player.isCaptain && (identity.player.orgId === awayOrg.id || awayOrg.captainId === identity.player.id)) {
    return { role: "away_captain", side: "B" };
  }
  if (identity.player.orgId === match.homeOrgId || identity.player.orgId === match.awayOrgId) {
    return { role: "team", side: identity.player.orgId === match.homeOrgId ? "A" : "B" };
  }
  return { role: "spectator", side: null };
}

async function getSession(sessionId: string, match: Match) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return fallbackSession(sessionId, match);
  const { data } = await supabase
    .from("god_draft_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  return data ? fromSessionRow(data) : fallbackSession(sessionId, match);
}

export async function getGodDraftRoomData(sessionId: string): Promise<GodDraftRoomData | null> {
  const [leagueData, identity] = await Promise.all([getLeagueData(), getIdentity()]);
  const match = leagueData.matches.find((m) => m.id === sessionId) ?? leagueData.matches[0];
  if (!match) return null;
  const homeOrg = leagueData.orgs.find((o) => o.id === match.homeOrgId);
  const awayOrg = leagueData.orgs.find((o) => o.id === match.awayOrgId);
  if (!homeOrg || !awayOrg) return null;

  const [session, gods, chatMessages, vaultedGodIds] = await Promise.all([
    getSession(sessionId, match),
    getGodPool(),
    getChatMessages(sessionId),
    getVaultedGodIds(match.id, 1),
  ]);
  const { role, side } = resolveRole(identity, match, homeOrg, awayOrg);

  return {
    session,
    match,
    homeOrg,
    awayOrg,
    gods,
    vaultedGodIds,
    chatMessages,
    role,
    side,
    canChatTeam: role === "home_captain" || role === "away_captain" || role === "team" || role === "admin",
    canChatSpectator: role === "spectator" || role === "admin",
    isAuthenticated: Boolean(identity.discordId),
  };
}

export async function getGodPool(): Promise<DraftGod[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return FALLBACK_GODS;
  const { data, error } = await supabase.from("gods").select("id,name,class,damage_type").order("name");
  if (error || !data?.length) return FALLBACK_GODS;
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    class: (row.class as string | null) ?? null,
    damageType: (row.damage_type as DraftGod["damageType"]) ?? null,
  }));
}

async function getChatMessages(sessionId: string): Promise<DraftChatMessage[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("draft_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []).map(fromChatRow);
}

async function getVaultedGodIds(matchId: string, gameNumber: number): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase || gameNumber <= 1) return [];
  const { data } = await supabase
    .from("god_picks")
    .select("god_id")
    .eq("match_id", matchId)
    .lt("game_number", gameNumber);
  return [...new Set((data ?? []).map((row) => String(row.god_id)))];
}

async function requireSessionActor(sessionId: string) {
  const room = await getGodDraftRoomData(sessionId);
  if (!room) throw new Error("Draft session not found.");
  if (!room.isAuthenticated && room.role !== "admin") throw new Error("Sign in is required.");
  return room;
}

function activeStatus(type: DraftActionType) {
  return type === "ban" ? "banning" : "picking";
}

export async function setGodDraftReady(sessionId: string, ready: boolean) {
  const room = await requireSessionActor(sessionId);
  const side = sideForRole(room.role);
  if (!side && room.role !== "admin") throw new Error("Only captains can ready a draft.");
  const homeReady = side === "A" ? ready : room.session.homeReady;
  const awayReady = side === "B" ? ready : room.session.awayReady;
  const firstTurn = homeReady && awayReady ? getFirstDraftTurn(DRAFT_FORMAT) : null;
  const patch = firstTurn
    ? {
        status: activeStatus(firstTurn.type),
        home_ready: homeReady,
        away_ready: awayReady,
        current_phase_index: firstTurn.phaseIndex,
        current_step_index: firstTurn.stepIndex,
        current_type: firstTurn.type,
        current_side: firstTurn.side,
        turn_started_at: new Date().toISOString(),
        reset_requested_by: null,
      }
    : {
        status: "lobby",
        home_ready: homeReady,
        away_ready: awayReady,
        current_type: null,
        current_side: null,
        turn_started_at: null,
      };
  await upsertSession(room.session, patch);
}

export async function submitGodDraftAction(sessionId: string, godId: string, timeout = false) {
  const room = await requireSessionActor(sessionId);
  const turnSide = room.session.currentSide;
  const turnType = room.session.currentType;
  if (!turnSide || !turnType) throw new Error("Draft is not in an active turn.");
  if (!timeout && room.role !== "admin" && sideForRole(room.role) !== turnSide) {
    throw new Error("It is not your turn.");
  }
  if (timeout && turnType === "pick") {
    await upsertSession(room.session, resetLobbyPatch());
    return;
  }

  const gods = await getGodPool();
  const god = gods.find((g) => g.id === godId);
  if (!timeout && !god) throw new Error("God not found.");
  const usedIds = new Set([
    ...room.session.draftState.picks.map((p) => p.godId),
    ...room.session.draftState.bans.map((b) => b.godId),
  ]);
  if (!timeout && usedIds.has(godId)) throw new Error("That god is already drafted.");
  if (!timeout && turnType === "pick" && room.vaultedGodIds.includes(godId)) {
    throw new Error("That god is vaulted from a previous game.");
  }

  const selection: DraftSelection = {
    side: turnSide,
    type: turnType,
    godId: timeout ? `skipped-${Date.now()}` : godId,
    godName: timeout ? "Skipped" : god?.name ?? "Skipped",
    skipped: timeout,
    createdAt: new Date().toISOString(),
  };
  const draftState: DraftState = {
    picks: turnType === "pick" ? [...room.session.draftState.picks, selection] : room.session.draftState.picks,
    bans: turnType === "ban" ? [...room.session.draftState.bans, selection] : room.session.draftState.bans,
  };
  const nextTurn = getNextDraftTurn(DRAFT_FORMAT, room.session.currentPhaseIndex, room.session.currentStepIndex);
  if (!nextTurn) {
    await completeDraft(room, draftState);
    return;
  }
  await upsertSession(room.session, {
    status: activeStatus(nextTurn.type),
    current_phase_index: nextTurn.phaseIndex,
    current_step_index: nextTurn.stepIndex,
    current_type: nextTurn.type,
    current_side: nextTurn.side,
    turn_started_at: new Date().toISOString(),
    draft_state: draftState,
  });
}

export async function requestGodDraftReset(sessionId: string) {
  const room = await requireSessionActor(sessionId);
  const side = sideForRole(room.role);
  if (!side && room.role !== "admin") throw new Error("Only captains can request a reset.");
  if (room.role === "admin" || (room.session.resetRequestedBy && room.session.resetRequestedBy !== side)) {
    await upsertSession(room.session, resetLobbyPatch());
    return;
  }
  await upsertSession(room.session, { reset_requested_by: side });
}

export async function sendGodDraftChatMessage(sessionId: string, channel: DraftChatChannel, body: string) {
  const room = await requireSessionActor(sessionId);
  const routedChannel = effectiveChatChannel(room.role, channel);
  const allowed = canRoleUseChat(room.role, routedChannel);
  if (!allowed) throw new Error("You cannot send messages to that channel.");
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) throw new Error("Message is required.");
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  await supabase.from("draft_chat_messages").insert({
    session_id: sessionId,
    channel: routedChannel,
    sender_name: room.role === "admin" ? "Admin" : room.isAuthenticated ? "Player" : "Spectator",
    body: trimmed,
  });
}

async function completeDraft(room: GodDraftRoomData, draftState: DraftState) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const bans = draftState.bans.filter((b) => !b.skipped).map((ban, slot) => ({
    org_id: ban.side === "A" ? room.homeOrg.id : room.awayOrg.id,
    god_id: ban.godId,
    god_name: ban.godName,
    slot,
  }));
  const picks = draftState.picks.map((pick, slot) => ({
    org_id: pick.side === "A" ? room.homeOrg.id : room.awayOrg.id,
    god_id: pick.godId,
    god_name: pick.godName,
    slot,
  }));
  const { error } = await supabase.rpc("complete_god_draft", {
    p_session_id: room.session.id,
    p_match_id: room.match.id,
    p_game_number: room.session.gameNumber,
    p_draft_state: draftState,
    p_bans: bans,
    p_picks: picks,
  });
  if (error) throw error;
  revalidatePath(`/draft/god/${room.session.id}`);
}

function resetLobbyPatch() {
  return {
    status: "lobby",
    home_ready: false,
    away_ready: false,
    current_phase_index: 0,
    current_step_index: 0,
    current_type: null,
    current_side: null,
    turn_started_at: null,
    reset_requested_by: null,
    draft_state: emptyDraftState(),
  };
}

async function upsertSession(session: GodDraftSession, patch: Record<string, unknown>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const payload = {
    id: session.id,
    match_id: session.matchId,
    game_number: session.gameNumber,
    draft_state: session.draftState,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("god_draft_sessions").upsert(payload);
  if (error) throw error;
  revalidatePath(`/draft/god/${session.id}`);
}
