-- Archive and soft-delete columns for players, orgs, matches.
-- archived_at       → hidden from public queries; admin sees all
-- deletion_scheduled_at → queued for hard delete; only superadmins can confirm

ALTER TABLE players     ADD COLUMN IF NOT EXISTS archived_at           TIMESTAMPTZ;
ALTER TABLE players     ADD COLUMN IF NOT EXISTS deletion_scheduled_at  TIMESTAMPTZ;

ALTER TABLE orgs        ADD COLUMN IF NOT EXISTS archived_at           TIMESTAMPTZ;
ALTER TABLE orgs        ADD COLUMN IF NOT EXISTS deletion_scheduled_at  TIMESTAMPTZ;

ALTER TABLE matches     ADD COLUMN IF NOT EXISTS archived_at           TIMESTAMPTZ;
ALTER TABLE matches     ADD COLUMN IF NOT EXISTS deletion_scheduled_at  TIMESTAMPTZ;

-- Partial indexes for the pending-deletes audit query
CREATE INDEX IF NOT EXISTS idx_players_pending_delete ON players (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_pending_delete    ON orgs    (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_pending_delete ON matches (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
