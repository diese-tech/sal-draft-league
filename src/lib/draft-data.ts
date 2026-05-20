import { createHash, randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { buildPickSequence, type DraftPick, type DraftRoom, type DraftState } from "@/types/draft";
import type { DivisionId } from "@/types/league";

// ---- DB row types --------------------------------------------------------

type DbDraftRoom = {
  id: string;
  season_id: string;
  division_id: string;
  status: string;
  rounds: number;
  pick_timer_seconds: number;
  base_order: string[];
  current_pick_index: number;
  pick_started_at: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type DbDraftPick = {
  id: number;
  draft_room_id: string;
  pick_number: number;
  org_id: string;
  player_id: string;
  picked_at: string;
};

// ---- Converters ----------------------------------------------------------

function fromDbRoom(row: DbDraftRoom): DraftRoom {
  return {
    id: row.id,
    seasonId: row.season_id,
    divisionId: row.division_id as DivisionId,
    status: row.status as DraftRoom["status"],
    rounds: row.rounds,
    pickTimerSeconds: row.pick_timer_seconds,
    baseOrder: row.base_order,
    currentPickIndex: row.current_pick_index,
    pickStartedAt: row.pick_started_at ?? undefined,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

function fromDbPick(row: DbDraftPick): DraftPick {
  return {
    id: row.id,
    draftRoomId: row.draft_room_id,
    pickNumber: row.pick_number,
    orgId: row.org_id,
    playerId: row.player_id,
    pickedAt: row.picked_at,
  };
}

// ---- Read ----------------------------------------------------------------

export async function getDraftRooms(seasonId?: string): Promise<DraftRoom[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  let q = supabase.from("draft_rooms").select("*").order("created_at", { ascending: false });
  if (seasonId) q = q.eq("season_id", seasonId);
  const { data, error } = await q;
  if (error) { console.error("getDraftRooms:", error.message); return []; }
  return (data as DbDraftRoom[]).map(fromDbRoom);
}

export async function getDraftRoom(id: string): Promise<DraftRoom | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("draft_rooms").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromDbRoom(data as DbDraftRoom);
}

export async function getDraftPicks(draftRoomId: string): Promise<DraftPick[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("draft_room_id", draftRoomId)
    .order("pick_number");
  if (error) { console.error("getDraftPicks:", error.message); return []; }
  return (data as DbDraftPick[]).map(fromDbPick);
}

export async function buildDraftState(draftRoomId: string): Promise<DraftState | null> {
  const [room, picks] = await Promise.all([getDraftRoom(draftRoomId), getDraftPicks(draftRoomId)]);
  if (!room) return null;

  const pickSequence = buildPickSequence(room.baseOrder, room.rounds);
  const totalPicks = pickSequence.length;
  const currentOrgId = room.status === "active" && room.currentPickIndex < totalPicks
    ? (pickSequence[room.currentPickIndex] ?? null)
    : null;

  let secondsRemaining: number | null = null;
  if (room.status === "active" && room.pickStartedAt) {
    const elapsed = (Date.now() - new Date(room.pickStartedAt).getTime()) / 1000;
    secondsRemaining = Math.max(0, room.pickTimerSeconds - elapsed);
  }

  return { room, picks, pickSequence, currentOrgId, totalPicks, secondsRemaining };
}

// ---- Write ---------------------------------------------------------------

export async function createDraftRoom(input: {
  id: string;
  seasonId: string;
  divisionId: DivisionId;
  rounds?: number;
  pickTimerSeconds?: number;
}): Promise<DraftRoom> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const row = {
    id: input.id,
    season_id: input.seasonId,
    division_id: input.divisionId,
    rounds: input.rounds ?? 5,
    pick_timer_seconds: input.pickTimerSeconds ?? 120,
  };
  const { data, error } = await supabase.from("draft_rooms").insert(row).select().single();
  if (error) throw error;
  return fromDbRoom(data as DbDraftRoom);
}

export async function updateDraftRoom(id: string, patch: Partial<{
  status: DraftRoom["status"];
  baseOrder: string[];
  currentPickIndex: number;
  pickStartedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rounds: number;
  pickTimerSeconds: number;
}>): Promise<DraftRoom> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.baseOrder !== undefined) dbPatch.base_order = patch.baseOrder;
  if (patch.currentPickIndex !== undefined) dbPatch.current_pick_index = patch.currentPickIndex;
  if (Object.prototype.hasOwnProperty.call(patch, "pickStartedAt")) dbPatch.pick_started_at = patch.pickStartedAt;
  if (Object.prototype.hasOwnProperty.call(patch, "startedAt")) dbPatch.started_at = patch.startedAt;
  if (Object.prototype.hasOwnProperty.call(patch, "completedAt")) dbPatch.completed_at = patch.completedAt;
  if (patch.rounds !== undefined) dbPatch.rounds = patch.rounds;
  if (patch.pickTimerSeconds !== undefined) dbPatch.pick_timer_seconds = patch.pickTimerSeconds;
  const { data, error } = await supabase.from("draft_rooms").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return fromDbRoom(data as DbDraftRoom);
}

export async function recordPick(draftRoomId: string, pickNumber: number, orgId: string, playerId: string): Promise<DraftPick> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const { data, error } = await supabase
    .from("draft_picks")
    .insert({ draft_room_id: draftRoomId, pick_number: pickNumber, org_id: orgId, player_id: playerId })
    .select()
    .single();
  if (error) throw error;
  return fromDbPick(data as DbDraftPick);
}

// ---- Captain tokens ------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function generateCaptainToken(draftRoomId: string, orgId: string): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  await supabase
    .from("captain_tokens")
    .upsert({ id: token, draft_room_id: draftRoomId, org_id: orgId, token_hash: tokenHash, expires_at: expiresAt });
  return token;
}

export async function verifyCaptainToken(token: string): Promise<{ draftRoomId: string; orgId: string } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from("captain_tokens")
    .select("draft_room_id, org_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at as string) < new Date()) return null;
  return { draftRoomId: data.draft_room_id as string, orgId: data.org_id as string };
}

// ---- Shortlist -----------------------------------------------------------

export interface ShortlistEntry {
  playerId: string;
  position: number;
}

export async function getShortlist(draftRoomId: string, orgId: string): Promise<ShortlistEntry[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("captain_shortlists")
    .select("player_id, position")
    .eq("draft_room_id", draftRoomId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });
  if (error) { console.error("getShortlist:", error.message); return []; }
  return (data as Array<{ player_id: string; position: number }>).map((r) => ({
    playerId: r.player_id,
    position: r.position,
  }));
}

export async function addToShortlist(draftRoomId: string, orgId: string, playerId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  // Get next position
  const { data } = await supabase
    .from("captain_shortlists")
    .select("position")
    .eq("draft_room_id", draftRoomId)
    .eq("org_id", orgId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = data && data.length > 0 ? (data[0] as { position: number }).position + 1 : 0;
  const { error } = await supabase.from("captain_shortlists").insert({
    draft_room_id: draftRoomId,
    org_id: orgId,
    player_id: playerId,
    position: nextPos,
  });
  if (error) throw error;
}

export async function removeFromShortlist(draftRoomId: string, orgId: string, playerId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  await supabase
    .from("captain_shortlists")
    .delete()
    .eq("draft_room_id", draftRoomId)
    .eq("org_id", orgId)
    .eq("player_id", playerId);
  // Renumber remaining
  const { data } = await supabase
    .from("captain_shortlists")
    .select("id, position")
    .eq("draft_room_id", draftRoomId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });
  if (data) {
    for (let i = 0; i < data.length; i++) {
      await supabase
        .from("captain_shortlists")
        .update({ position: i })
        .eq("id", (data[i] as { id: string }).id);
    }
  }
}

export async function reorderShortlist(draftRoomId: string, orgId: string, playerIds: string[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");
  for (let i = 0; i < playerIds.length; i++) {
    await supabase
      .from("captain_shortlists")
      .update({ position: i })
      .eq("draft_room_id", draftRoomId)
      .eq("org_id", orgId)
      .eq("player_id", playerIds[i]);
  }
}

export async function removePlayerFromAllShortlists(draftRoomId: string, playerId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("captain_shortlists")
    .delete()
    .eq("draft_room_id", draftRoomId)
    .eq("player_id", playerId);
}

export async function getTopShortlistPick(draftRoomId: string, orgId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  // Get shortlist ordered by position
  const { data: shortlist } = await supabase
    .from("captain_shortlists")
    .select("player_id")
    .eq("draft_room_id", draftRoomId)
    .eq("org_id", orgId)
    .order("position", { ascending: true });
  if (!shortlist || shortlist.length === 0) return null;
  // Get already-drafted player IDs
  const { data: picks } = await supabase
    .from("draft_picks")
    .select("player_id")
    .eq("draft_room_id", draftRoomId);
  const draftedIds = new Set((picks ?? []).map((p: { player_id: string }) => p.player_id));
  // Return first shortlisted player not yet drafted
  for (const entry of shortlist as Array<{ player_id: string }>) {
    if (!draftedIds.has(entry.player_id)) return entry.player_id;
  }
  return null;
}

// ---- Undo ----------------------------------------------------------------

export async function undoLastPick(draftRoomId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase env is missing.");

  const room = await getDraftRoom(draftRoomId);
  if (!room) throw new Error("Draft room not found.");
  if (room.currentPickIndex === 0) throw new Error("No picks to undo.");
  if (room.status !== "active") throw new Error("Draft is not active.");

  // Get last pick
  const { data: lastPick, error: pickError } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("draft_room_id", draftRoomId)
    .order("pick_number", { ascending: false })
    .limit(1)
    .single();
  if (pickError || !lastPick) throw new Error("No picks found to undo.");

  // Delete the last pick
  await supabase.from("draft_picks").delete().eq("id", (lastPick as { id: number }).id);

  // Rewind the pick index and reset timer
  const prevIndex = room.currentPickIndex - 1;
  await updateDraftRoom(draftRoomId, {
    currentPickIndex: prevIndex,
    pickStartedAt: new Date().toISOString(),
  });
}
