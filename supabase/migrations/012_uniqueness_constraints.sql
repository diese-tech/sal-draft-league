-- P1-08: Enforce unique player IGNs at the database level.
-- Allows NULL (players without an IGN assigned yet are still permitted).
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_ign_unique
  ON players (ign)
  WHERE ign IS NOT NULL;

-- P2-05: Enforce unique org names and tags at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_name_unique ON orgs (name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_tag_unique  ON orgs (tag);
