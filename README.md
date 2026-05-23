# Serpent Ascension League

**SAL** is a community-run competitive Smite 2 draft league for players looking to break into the competitive scene. The league is designed for lower-skilled players who want structured team play and a real competitive environment — a place to learn, grow, and eventually ascend into higher lobbies.

SAL is not affiliated with Hi-Rez Studios or the Smite franchise.

**Site:** https://sal-draft-league.vercel.app  
**Discord:** https://discord.gg/qY8uFve4Dd  
**Twitch:** https://twitch.tv/serpentascensionleague

---

## Development

### Prerequisites

- Node.js 20+
- A Supabase project (see `.env.example`)

### Setup

```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and admin secrets
npm install
npm run dev
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Supabase service-role key for admin mutations |
| `ADMIN_SESSION_SECRET` | Yes | Long random string used to sign admin session cookies |
| `ADMIN_PASSWORD` | Optional | Password-based admin login fallback (used when Discord OAuth is not configured) |
| `CAPTAIN_SESSION_SECRET` | Recommended | Separate signing key for captain session cookies; falls back to `ADMIN_SESSION_SECRET` |
| `DISCORD_ADMIN_CLIENT_ID` | Optional | Discord OAuth app client ID for admin login |
| `DISCORD_ADMIN_CLIENT_SECRET` | Optional | Discord OAuth app client secret |
| `DISCORD_ADMIN_REDIRECT_URI` | Optional | Discord OAuth redirect URI |
| `NEXT_PUBLIC_SITE_URL` | Yes | Full site URL (used for OAuth redirects) |

### Testing

```bash
npm run test          # Unit tests (Vitest) — 103 tests
npm run test:e2e      # E2E tests (Playwright) — requires ADMIN_PASSWORD set
npm run test:integration  # RLS integration tests — requires Supabase credentials
npm run test:load     # Load tests (Vitest in-process)
```

**CI pipeline** (`.github/workflows/ci.yml`) runs on every push and PR:
- `lint-and-typecheck` — ESLint + `tsc --noEmit` + service-role exposure check
- `unit-tests` — `npm run test`
- `build` — `next build`
- `e2e-tests` — Playwright suite
- `integration-tests` — RLS integration tests (requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` secrets and Supabase API allowlist to include CI runner IPs)

---

## What the Site Does

The SAL website is the public hub for the league. It covers:

- **Home** — live match status, upcoming matches, recent results, division standings, and league announcements
- **Standings** — win/loss records, games back, and streak per division (Solar, Lunar, Gaia)
- **Schedule** — full season schedule, filterable by division, week, and match status
- **Teams** — all orgs with their rosters, division, and social links
- **Players** — searchable player directory with role/division filters and individual player profiles
- **Watch** — live Twitch stream embed and chat when the league is broadcasting

---

## Who It's For

SAL is open to anyone who comes across an invite link. There is no minimum skill requirement, but there are maximums — the admin team vets players before placements happen to keep the level of play appropriate for the league's goals.

The site is useful for:
- **Players** — tracking standings, viewing their team, watching matches
- **Captains** — managing their roster and participating in drafts
- **Spectators** — following the league, reading announcements, watching streams
- **Admins** — running the league through the admin panel

---

## How to Join

There are two ways to sign up for a season:

### Option 1 — Discord Sign-Up Form
When a new season is announced, a Google Form is shared in the Discord server. This is the primary sign-up method. Fill it out, join the server, and the admin team will handle the rest.

### Option 2 — Site Registration
If sign-ups are live and you missed the Discord announcement, you can register directly on the site:

1. Click **Sign In** in the top navigation
2. Authenticate with your Discord account
3. The site checks whether you're already in the system (from a prior Google Form submission)

**If your Discord username matches an existing player record (Flow A):** You'll see your player profile and can claim it with one click. No form needed — you're already in.

**If you're new to the system (Flow B):** You'll fill out a short registration form with your name, in-game name, tracker.gg profile link, and two roles. Your submission goes into a review queue for the admin team.

> **Important for Flow B registrations:** Make sure you join the Discord server after submitting — https://discord.gg/qY8uFve4Dd. The admin team works through Discord and will need you there to complete your onboarding.

---

## After You Sign Up

- **Existing players (Flow A):** Await the placements phase. The admin team will assign you to a team based on your role, availability, and skill level. You'll be notified in Discord.
- **New registrations (Flow B):** An admin will review your submission and contact you in Discord. Join the server if you haven't already.

Placements are followed by a scouting period where captains evaluate players before the live draft.

---

## Admin Panel

The admin panel lives at `/admin` and is password-protected. It is used by the SAL admin team to run the league.

| Section | What it does |
|---|---|
| **Overview** | League health snapshot — active season, org count, player count, pending matches |
| **Teams** | View all orgs and their captains |
| **Roster** | Edit player details — IGN, Discord, team, role, starter/captain status |
| **Schedule** | Create and edit matches, enter scores, update match status |
| **Standings** | View current standings; trigger a manual recalculation |
| **Draft** | Create and manage draft rooms; control the live draft |
| **Announcements** | Write and publish league news visible on the homepage |
| **Import** | Bulk-import players via CSV or pasted spreadsheet data |
| **Registrations** | Review, approve, or reject player sign-ups from the site |
| **Form Fields** | Customize the player registration form — hide base fields, add new ones for future seasons |

### Managing Registrations

When a player signs up via the site (Flow B), their submission appears in **Admin → Registrations** with a Pending status. From there you can:

- **Approve** — confirms their registration
- **Reject** — rejects with an optional note explaining why

Approved players still need to be added to the system roster manually via Import or the Roster editor.

### Publishing Announcements

Announcements support Markdown. From **Admin → Announcements** you can write posts with headers, bullet lists, bold text, and links. A live preview toggle shows the rendered output before saving. Pinned announcements appear at the top of the homepage feed. Each announcement also gets a full-page article view at `/announcements/[id]`.

### Importing Players

**Admin → Import** accepts CSV or tab-separated data pasted from Google Sheets or exported from Discord bots. The parser auto-detects column headers and maps them to player fields. Preview parsed rows before committing — green rows are ready, yellow have warnings, red have missing required fields. Re-importing a player whose IGN already exists will update their record.

---

## Season Structure

- The league runs in seasons. Season 1 is currently active.
- Each season has three divisions: **Solar**, **Lunar**, and **Gaia**
- Rosters are 6–8 players per org, including a captain
- Captains are selected by the league, represent their org, and are not draftable
- Player identities (IGN, stats, history) persist across seasons
- Org participation is season-based

---

## Links

| | |
|---|---|
| Website | https://sal-draft-league.vercel.app |
| Discord | https://discord.gg/qY8uFve4Dd |
| Twitch | https://twitch.tv/serpentascensionleague |

For local development and technical setup, see [DEVELOPMENT.md](./DEVELOPMENT.md).
