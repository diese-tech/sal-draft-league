CREATE TABLE IF NOT EXISTS captain_shortlists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  draft_room_id TEXT NOT NULL REFERENCES draft_rooms(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draft_room_id, org_id, player_id)
);

ALTER TABLE captain_shortlists ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS
