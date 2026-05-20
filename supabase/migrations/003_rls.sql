-- Enable RLS on all tables
alter table seasons         enable row level security;
alter table divisions       enable row level security;
alter table orgs            enable row level security;
alter table players         enable row level security;
alter table matches         enable row level security;
alter table standings       enable row level security;
alter table announcements   enable row level security;
alter table draft_rooms     enable row level security;
alter table draft_picks     enable row level security;
alter table captain_tokens  enable row level security;
alter table admin_audit_log enable row level security;

-- Public read for league-facing tables
-- The service_role key bypasses RLS entirely, so server-side mutations still work.
create policy "public read" on seasons       for select using (true);
create policy "public read" on divisions     for select using (true);
create policy "public read" on orgs          for select using (true);
create policy "public read" on players       for select using (true);
create policy "public read" on matches       for select using (true);
create policy "public read" on standings     for select using (true);
create policy "public read" on announcements for select using (true);
create policy "public read" on draft_rooms   for select using (true);
create policy "public read" on draft_picks   for select using (true);

-- admin_audit_log and captain_tokens: no public access (service_role still reads/writes)
