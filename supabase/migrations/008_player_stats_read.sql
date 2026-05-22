-- RLS read policies: player_stats and gods
-- Both tables are created by the salbot migration with RLS enabled but no SELECT policy.
-- Without these, every anon query returns zero rows with no error — a silent data black hole.
-- Note: CREATE POLICY IF NOT EXISTS is not available in this PostgreSQL build; DO block used.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_stats' AND policyname = 'player_stats_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "player_stats_public_read" ON player_stats FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gods' AND policyname = 'gods_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "gods_public_read" ON gods FOR SELECT USING (true)';
  END IF;
END $$;
