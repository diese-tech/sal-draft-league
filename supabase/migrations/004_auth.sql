-- Discord OAuth identity fields on players
ALTER TABLE players ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Player self-registration submissions
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  discord_display_name TEXT,
  season_id TEXT REFERENCES seasons(id) ON DELETE SET NULL,
  player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT
);

-- Admin-configurable form field schema
CREATE TABLE IF NOT EXISTS form_fields (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'url', 'select', 'multiselect', 'checkbox', 'textarea')),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  field_order INT NOT NULL,
  options JSONB,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  placeholder TEXT,
  validation_hint TEXT
);

-- Seed base form fields (locked — admins can hide but not delete)
INSERT INTO form_fields (id, key, label, field_type, required, field_order, locked, placeholder, validation_hint)
VALUES
  ('ff-name',           'name',           'Name',             'text', TRUE, 1, TRUE, 'Your name or preferred name', NULL),
  ('ff-ign',            'ign',            'In-Game Name',     'text', TRUE, 2, TRUE, 'Your SMITE IGN', NULL),
  ('ff-tracker',        'tracker_url',    'Tracker.gg Profile', 'url', TRUE, 3, TRUE, 'https://tracker.gg/smite/profile/...', 'Must be a tracker.gg link'),
  ('ff-primary-role',   'primary_role',   'Primary Role',     'select', TRUE, 4, TRUE, NULL, NULL),
  ('ff-secondary-role', 'secondary_role', 'Secondary Role',   'select', TRUE, 5, TRUE, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

UPDATE form_fields
SET options = '["Solo","Jungle","Mid","Carry","Support"]'::jsonb
WHERE id IN ('ff-primary-role', 'ff-secondary-role');

-- RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

-- Anyone can read form field config (needed to render the public sign-up form)
CREATE POLICY "public read" ON form_fields FOR SELECT USING (true);

-- Anyone can submit a registration (anon INSERT)
CREATE POLICY "anon insert" ON registrations FOR INSERT WITH CHECK (true);
-- service_role bypasses RLS for admin reads/updates
