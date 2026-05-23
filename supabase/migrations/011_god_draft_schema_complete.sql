-- ============================================================
-- 1. Fix org_brands: enable RLS + public read
--    Was the only table in the schema with RLS fully disabled.
-- ============================================================
ALTER TABLE public.org_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read"
  ON public.org_brands
  FOR SELECT
  TO public
  USING (true);


-- ============================================================
-- 2. Fix god_draft_sessions
--    Migration 010 was never applied; the table was created from
--    schema.sql with an older definition missing 11 columns and
--    using the wrong status enum values.
-- ============================================================

-- Replace the old status constraint (pending/in_progress/completed)
-- with values the application actually uses.
ALTER TABLE public.god_draft_sessions
  DROP CONSTRAINT god_draft_sessions_status_check;

ALTER TABLE public.god_draft_sessions
  ADD CONSTRAINT god_draft_sessions_status_check
    CHECK (status IN ('pending', 'lobby', 'banning', 'picking', 'complete'));

-- Add the 11 columns the application expects but the DB is missing.
ALTER TABLE public.god_draft_sessions
  ADD COLUMN IF NOT EXISTS home_ready          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS away_ready          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_phase_index integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step_index  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_type        text        CHECK (current_type IN ('ban', 'pick')),
  ADD COLUMN IF NOT EXISTS current_side        text        CHECK (current_side IN ('A', 'B')),
  ADD COLUMN IF NOT EXISTS turn_started_at     timestamptz,
  ADD COLUMN IF NOT EXISTS draft_state         jsonb       NOT NULL DEFAULT '{"picks":[],"bans":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS reset_requested_by  text        CHECK (reset_requested_by IN ('A', 'B')),
  ADD COLUMN IF NOT EXISTS completed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS god_draft_sessions_match_idx
  ON public.god_draft_sessions (match_id, game_number);

-- Public read needed for Supabase Realtime to deliver postgres_changes
-- events to the anon browser client in GodDraftRoomClient.tsx.
CREATE POLICY "public read"
  ON public.god_draft_sessions
  FOR SELECT
  TO public
  USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.god_draft_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 3. Rebuild god_picks with the schema the application expects.
--    Old schema used draft_session_id/pick_order; code writes
--    session_id/match_id/game_number/god_name/slot.
--    Table has 0 rows so dropping is safe.
-- ============================================================
DROP TABLE IF EXISTS public.god_picks;

CREATE TABLE public.god_picks (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  text        NOT NULL REFERENCES public.god_draft_sessions(id) ON DELETE CASCADE,
  match_id    text        NOT NULL REFERENCES public.matches(id)            ON DELETE CASCADE,
  game_number integer     NOT NULL,
  org_id      text        NOT NULL REFERENCES public.orgs(id)               ON DELETE CASCADE,
  god_id      text        NOT NULL REFERENCES public.gods(id),
  god_name    text        NOT NULL,
  slot        integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Supports getVaultedGodIds() which filters on match_id + game_number
-- and returns god_id values.
CREATE INDEX IF NOT EXISTS god_picks_vault_idx
  ON public.god_picks (match_id, game_number, god_id);

ALTER TABLE public.god_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read"
  ON public.god_picks
  FOR SELECT
  TO public
  USING (true);


-- ============================================================
-- 4. Rebuild god_bans with the schema the application expects.
--    Old schema used draft_session_id/ban_order; code writes
--    session_id/match_id/game_number/god_name/slot.
--    Table has 0 rows so dropping is safe.
-- ============================================================
DROP TABLE IF EXISTS public.god_bans;

CREATE TABLE public.god_bans (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  text        NOT NULL REFERENCES public.god_draft_sessions(id) ON DELETE CASCADE,
  match_id    text        NOT NULL REFERENCES public.matches(id)            ON DELETE CASCADE,
  game_number integer     NOT NULL,
  org_id      text        NOT NULL REFERENCES public.orgs(id)               ON DELETE CASCADE,
  god_id      text        NOT NULL REFERENCES public.gods(id),
  god_name    text        NOT NULL,
  slot        integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS god_bans_session_idx
  ON public.god_bans (session_id);

ALTER TABLE public.god_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read"
  ON public.god_bans
  FOR SELECT
  TO public
  USING (true);


-- ============================================================
-- 5. Create draft_chat_messages.
--    Table did not exist in the DB despite being referenced by
--    GodDraftRoomClient.tsx Realtime subscription and the
--    sendGodDraftChatMessage / getChatMessages server functions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.draft_chat_messages (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  text        NOT NULL REFERENCES public.god_draft_sessions(id) ON DELETE CASCADE,
  channel     text        NOT NULL CHECK (channel IN ('team', 'spectator')),
  sender_name text        NOT NULL,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Supports getChatMessages() which filters by session_id and orders by created_at.
CREATE INDEX IF NOT EXISTS draft_chat_messages_session_idx
  ON public.draft_chat_messages (session_id, created_at);

ALTER TABLE public.draft_chat_messages ENABLE ROW LEVEL SECURITY;

-- Public read so the anon-key Realtime subscription in GodDraftRoomClient.tsx
-- receives INSERT events for new chat messages.
CREATE POLICY "public read"
  ON public.draft_chat_messages
  FOR SELECT
  TO public
  USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 6. Create complete_god_draft stored procedure.
--    Called by completeDraft() in god-draft-data.ts when all
--    picks/bans are submitted. Did not exist in the DB.
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_god_draft(
  p_session_id  text,
  p_match_id    text,
  p_game_number integer,
  p_draft_state jsonb,
  p_bans        jsonb,
  p_picks       jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM god_bans  WHERE session_id = p_session_id;
  DELETE FROM god_picks WHERE session_id = p_session_id;

  INSERT INTO god_bans (session_id, match_id, game_number, org_id, god_id, god_name, slot)
  SELECT p_session_id, p_match_id, p_game_number,
         item.org_id, item.god_id, item.god_name, item.slot
  FROM jsonb_to_recordset(p_bans)
    AS item(org_id text, god_id text, god_name text, slot integer);

  INSERT INTO god_picks (session_id, match_id, game_number, org_id, god_id, god_name, slot)
  SELECT p_session_id, p_match_id, p_game_number,
         item.org_id, item.god_id, item.god_name, item.slot
  FROM jsonb_to_recordset(p_picks)
    AS item(org_id text, god_id text, god_name text, slot integer);

  UPDATE god_draft_sessions
    SET status          = 'complete',
        current_type    = NULL,
        current_side    = NULL,
        turn_started_at = NULL,
        draft_state     = p_draft_state,
        completed_at    = now(),
        updated_at      = now()
    WHERE id = p_session_id;
END;
$$;
