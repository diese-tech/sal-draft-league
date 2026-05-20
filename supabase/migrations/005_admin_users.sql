CREATE TABLE IF NOT EXISTS admin_users (
  discord_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  discord_username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS for all admin reads/writes
-- No public access to admin_users
