# SAL-Site Production Readiness Audit
**Date:** 2026-05-23  
**Branch audited:** `main`  
**Scope:** Auth/security, product completeness, edge cases, data integrity, draft lifecycle, registration flows, season lifecycle, test coverage, CI/CD, and operational readiness.

---

## Executive Summary

The SAL-site codebase is a well-structured Next.js 14 / Supabase application with solid public-page coverage and a coherent admin shell. The team has made real architectural choices (soft-delete workflow, audit logs, service-role isolation, typed data layer) that demonstrate intentional design. However, **the app is not safe to ship to production in its current state.** Three classes of problem stand out:

**Security:** The captain session cookie is unsigned plain-text, meaning any visitor who knows a draft-room ID and org ID can forge a captain identity and submit picks. The rate-limiter module exists but is never imported. The admin session can be forged if `ADMIN_PASSWORD` is weak and `ADMIN_SESSION_SECRET` is not set. A `javascript:` URL in any announcement body will execute in the visitor's browser.

**Data integrity:** Standings silently drops tied matches (no winner assigned, no point split). There is no database-level constraint preventing two simultaneously active seasons. The standings recalculation function has no season filter — callers must pre-filter or cross-season data corrupts the table. Draft undo and pick submission are not atomic and can corrupt pick state under concurrent load.

**Operational:** Zero test suites run in CI. Three critical modules — `standings.ts`, `rate-limit.ts`, `captain-auth.ts` — have no unit tests at all. No error monitoring is wired. The `.env.example` hardcodes the production Supabase URL and omits `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The AI match-report extraction and the CSV player-import features are stubs.

---

## P0 / P1 / P2 Gap Table

### P0 — Blocks launch; exploit or data-loss risk

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| P0-01 | Security | Captain session cookie is unsigned plain text — any party who knows `draftRoomId` and `orgId` can set the cookie and submit picks as that captain | `src/lib/captain-auth.ts:13-22` |
| P0-02 | Security | Admin session secret falls back to `ADMIN_PASSWORD`; low-entropy password → forgeable HMAC sessions | `src/lib/admin-auth.ts:9-13` |
| P0-03 | Security | Rate-limit module is fully implemented but never imported anywhere; all registration, claim, and OAuth endpoints are unprotected from brute-force | `src/lib/rate-limit.ts` (unused) |
| P0-04 | Security | Player claim endpoint has no identity verification; any authenticated Discord user can claim any player profile by sending a different `playerId` | `src/app/api/auth/claim/route.ts` |
| P0-05 | Data | Standings: tied matches (equal scores) are silently skipped — no point, no draw record; standings are incorrect for any season with ties | `src/lib/standings.ts:33-43` |
| P0-06 | Data | `recalcStandings()` has no season filter; if the caller passes all-time matches, every season's data corrupts the current standings | `src/lib/standings.ts:3-56` |
| P0-07 | Data | No database UNIQUE constraint or application guard prevents two active seasons simultaneously; public pages pick "latest" with undefined behavior | `src/lib/league-data.ts:347-360` |
| P0-08 | Data | Draft undo (`undoLastPick`) is non-atomic: deletes last pick then updates room index in separate queries; a concurrent pick between those two writes corrupts draft state | `src/lib/draft-data.ts:325-353` |
| P0-09 | Product | Draft completion does not propagate picks to team rosters; admin must manually re-enter every pick into the player assignment screen | `src/lib/draft-data.ts`, `AdminDraftRoomClient.tsx` |
| P0-10 | Product | Registration approval does not create a player record; approved registrations are informational only | `src/components/admin/AdminRegistrationsClient.tsx` |
| P0-11 | CI | Unit tests (`npm run test`) are not executed in any CI step; broken logic can merge | `.github/workflows/lighthouse.yml` |
| P0-12 | CI | E2E tests are not executed in CI | `.github/workflows/lighthouse.yml` |

### P1 — Must fix before launch; degrades correctness or enables abuse

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| P1-01 | Security | XSS: `MarkdownBody.tsx` renders `href` from Markdown links without validation; `javascript:alert(1)` in any announcement executes on click | `src/components/ui/MarkdownBody.tsx:31` |
| P1-02 | Security | Captain tokens are not invalidated after the first exchange; a leaked token remains valid for 30 days | `src/lib/draft-data.ts:192-204` |
| P1-03 | Security | `sameSite="lax"` on both admin and captain cookies; cross-site POST form submissions can carry the cookie | `src/lib/admin-auth.ts:89`, `captain-auth.ts:17` |
| P1-04 | Security | Middleware does not check admin session; `/admin/*` protection relies entirely on per-page `requireAdmin()` calls — a missed call in any future page leaves it open | `src/middleware.ts` |
| P1-05 | Data | Simultaneous pick submission race: two picks arriving for the same slot both read the same `currentPickIndex`, both pass turn validation, both call `recordPick()` before the index increments | `src/app/api/draft/[id]/pick/route.ts:62-74` |
| P1-06 | Data | Standings recalculation is non-atomic: upserts new standings then deletes orphans in separate queries; concurrent reads see mixed old/new data | `src/lib/league-data.ts:597-620` |
| P1-07 | Data | Match report concurrent submission: second admin's DELETE wipes first admin's inserts before second admin's INSERT completes | `src/app/api/admin/match-reports/[id]/submit/route.ts:105-117` |
| P1-08 | Data | No IGN uniqueness constraint at DB level; duplicate IGNs can be created via upsert with different player IDs | `src/lib/league-data.ts:569` |
| P1-09 | Data | Standings `recalculateAndPersistStandings()` re-queries all matches and orgs every call with no caching; hot under admin load | `src/lib/league-data.ts:597` |
| P1-10 | Product | Admin Import page is a stub; bulk player import is non-functional | `src/app/admin/import/page.tsx` |
| P1-11 | Product | Admin Match Report AI extraction is a placeholder; the entire OCR/result pipeline is non-functional | `src/app/api/admin/match-reports/[id]/extract/route.ts` |
| P1-12 | Product | Pick timer is client-calculated from `pickStartedAt`; the server never enforces a pick timeout | `src/components/admin/AdminDraftRoomClient.tsx` |
| P1-13 | Env | `.env.example` hardcodes the production Supabase project URL; developers will accidentally use the prod database during local development | `.env.example` |
| P1-14 | Env | `NEXT_PUBLIC_SUPABASE_ANON_KEY` is documented in `DEVELOPMENT.md` but absent from `.env.example`; app fails silently without it | `.env.example` |
| P1-15 | Tests | `standings.ts` has zero unit tests; the most complex calculation in the product is unverified | (no file) |
| P1-16 | Tests | `captain-auth.ts` has zero unit tests; unsigned cookie parsing and token exchange logic are unverified | (no file) |
| P1-17 | Tests | `rate-limit.ts` has zero unit tests | (no file) |
| P1-18 | Tests | No integration tests exercise RLS policies; unauthenticated access to sensitive tables is untested | (no file) |
| P1-19 | Ops | No error monitoring (Sentry or equivalent); draft pick failures, standings errors, and auth rejections are silent in production | (no file) |

### P2 — Should fix before or shortly after launch; polish and robustness

| # | Area | Issue | File(s) |
|---|------|-------|---------|
| P2-01 | Security | Discord OAuth state comparison uses `===` instead of `timingSafeEqual` | `src/app/api/admin/discord/callback/route.ts:31` |
| P2-02 | Security | `admin_users` table RLS status is not confirmed in migrations; could expose admin Discord IDs to unauthenticated SELECT | `supabase/migrations/003_rls.sql` |
| P2-03 | Security | `captain_shortlists` and `captain_tokens` tables have RLS enabled but no explicit policy defined; depend on fragile default-deny | `supabase/migrations/003_rls.sql` |
| P2-04 | Data | No forfeit match status; standings treats all losses equally | `src/types/league.ts:74-91`, `src/lib/standings.ts` |
| P2-05 | Data | Org name and tag uniqueness not enforced at DB level | `src/lib/league-data.ts:375-381` |
| P2-06 | Data | Player import is not transactional; partial failure leaves partially-inserted data with no rollback | `src/app/api/admin/import/players/route.ts:44-59` |
| P2-07 | Data | Match `scheduledDate` field accepts past dates without validation | `src/app/api/admin/matches/route.ts:12` |
| P2-08 | Data | Season status transitions are not guarded; can jump from `pre-season` to `offseason` directly | `src/app/admin/seasons/page.tsx` |
| P2-09 | Data | `Match` type has no `seasonId`; matches are tied to `divisionId` only, making multi-season standings isolation the caller's responsibility | `src/types/league.ts` |
| P2-10 | Product | Historical season browsing is not supported on any public page | `src/lib/league-data.ts:221-268` |
| P2-11 | Product | No guard preventing creation of two concurrent draft rooms for the same division | `src/app/api/admin/draft/route.ts` |
| P2-12 | Product | `baseOrder` validation does not verify that listed org IDs are real or belong to the correct division | `src/app/api/admin/draft/[id]/start/route.ts` |
| P2-13 | Product | Draft picks (undo double-call) and player claim (concurrent requests) lack idempotency keys | Multiple routes |
| P2-14 | Product | No duplicate registration prevention; user can submit the registration form twice | `src/components/auth/RegisterClient.tsx` |
| P2-15 | CI | TypeScript type-check (`tsc --noEmit`) not in CI | `.github/workflows/lighthouse.yml` |
| P2-16 | CI | ESLint not in CI | `.github/workflows/lighthouse.yml` |
| P2-17 | CI | Lighthouse thresholds set to `warn`; PRs can merge at sub-70 performance score | `.lighthouserc.json` |
| P2-18 | Ops | In-memory rate limiter is per-Vercel-instance; cross-instance brute force is not throttled | `src/lib/rate-limit.ts` |
| P2-19 | Ops | No `/api/health` endpoint for uptime monitoring | (no file) |
| P2-20 | Ops | No `robots.txt` or `sitemap.xml` | `/public` |

---

## Security Risk Register

| ID | Severity | Vulnerability | Exploit Scenario | File / Line |
|----|----------|---------------|------------------|-------------|
| SEC-01 | **CRITICAL** | Unsigned captain session cookie | Attacker sets `sal_captain_session=<draftRoomId>:<orgId>` in DevTools and submits picks as any captain | `captain-auth.ts:13-22` |
| SEC-02 | **CRITICAL** | Admin session HMAC key falls back to `ADMIN_PASSWORD` | Attacker captures session cookie, brute-forces HMAC with common passwords, forges superadmin session | `admin-auth.ts:9-13` |
| SEC-03 | **CRITICAL** | Rate limiter never invoked | Attacker scripts unlimited requests to `/api/auth/claim` or `/api/auth/register`; no throttle | `rate-limit.ts` (no import sites) |
| SEC-04 | **CRITICAL** | Player claim — no identity verification | Alice calls `POST /api/auth/claim` with Bob's `playerId`; overwrites Bob's `discord_id` with Alice's | `api/auth/claim/route.ts` |
| SEC-05 | **HIGH** | XSS via Markdown `href` | Admin publishes `[Click here](javascript:alert(document.cookie))`; all visitors who click execute attacker JS | `MarkdownBody.tsx:31` |
| SEC-06 | **HIGH** | Captain token reusable for 30 days | Token leaked via Discord DM; adversary exchanges it repeatedly to hijack captain session | `draft-data.ts:192-204` |
| SEC-07 | **HIGH** | No CSRF protection beyond `sameSite=lax` | Attacker hosts form on `evil.com` that auto-submits POST to `/api/admin/matches` while admin is logged in | `admin-auth.ts:89`, `captain-auth.ts:17` |
| SEC-08 | **HIGH** | Admin route protection only at handler level | A new admin page that forgets `await requireAdmin()` is immediately accessible to unauthenticated users | `middleware.ts` |
| SEC-09 | **MEDIUM** | `captain_shortlists`/`captain_tokens` have no explicit RLS policy | A future migration that grants a SELECT policy exposes one captain's shortlist to another | `migrations/003_rls.sql` |
| SEC-10 | **MEDIUM** | Discord OAuth state compared with `===` | Timing oracle on 32-hex-char state assists CSRF against admin OAuth flow | `discord/callback/route.ts:31` |
| SEC-11 | **MEDIUM** | `admin_users` RLS not confirmed | Unauthenticated Supabase anon client can enumerate all admin Discord IDs if RLS is missing | `migrations/003_rls.sql` |
| SEC-12 | **LOW** | `secure` cookie flag absent in development | Admin session cookie transmits unencrypted if dev server is accidentally exposed | `admin-auth.ts:90` |

---

## Edge-Case Matrix

| Scenario | Current Behavior | Expected Behavior | Severity |
|----------|-----------------|-------------------|----------|
| Match ends in a tie (equal scores) | Silently skipped; neither team's record updated | Award draw; both streaks updated | CRITICAL |
| Two seasons set to `active` simultaneously | Undefined; public pages use `LIMIT 1` whichever is "latest" | DB UNIQUE constraint; admin UI prevents second activation | CRITICAL |
| Standings called with mixed-season matches | Cross-season data corrupts standings | Caller enforces season filter, or function filters internally | CRITICAL |
| Captain and admin both call undo simultaneously | Race; pick may be double-deleted or re-inserted with wrong index | DB transaction wrapping delete + index update | CRITICAL |
| Two captains submit a pick at the same slot | Both pass turn check; race on `currentPickIndex` increment | Serializable isolation on pick insert; second request gets conflict error | CRITICAL |
| User submits registration form twice (double-click) | Two pending registrations created | Idempotency key or duplicate check on `discord_id` before insert | HIGH |
| Admin claims another player's profile | Overwrites existing `discord_id` without warning | Check `profile_claimed` flag; reject if already claimed | HIGH |
| CSV import row fails midway | Rows 1…N-1 committed; no rollback | Wrap import in DB transaction; rollback all on any row failure | HIGH |
| Draft `undo` called twice rapidly | May delete wrong picks due to race | Optimistic lock (version field) on `draft_rooms`; reject stale undo | HIGH |
| Season closed while draft is active | Draft continues; season state inconsistent | Guard season close behind draft-complete check | HIGH |
| No active season exists | Public pages silently serve mock data | Explicit empty-state message; mock data only in `NODE_ENV=development` | MEDIUM |
| Draft started with orgs not in the division | Draft proceeds with invalid org IDs | Validate `baseOrder` org IDs against division membership | MEDIUM |
| Match rescheduled to past date | Accepted silently | Warn admin; require explicit override | MEDIUM |
| Org archived mid-season | Players and matches remain; standings may include archived org | Guard archive behind match-complete check or show warning | MEDIUM |
| `gamesBack` calculation on empty division | Empty array; arithmetic skipped silently | Return explicit 0 for all teams; log warning | LOW |
| Import CSV with duplicate IGN across rows | Last row wins; no error reported | Report per-row conflict; reject duplicates | MEDIUM |
| Draft pick submitted while draft is paused | Rejected (`status !== 'active'`) | Correct — but confirm pause status update is atomic | LOW |

---

## Test Coverage Gap Matrix

### Existing meaningful tests

| File | Type | What it covers |
|------|------|----------------|
| `src/lib/god-draft-rules.test.ts` | Unit | Draft state machine: phases, timeouts, bans/picks, deduplication, concurrent conflicts, auth/chat rules |
| `src/lib/stats-data.test.ts` | Unit | God aggregation, KDA, per-game tracking, season filtering, org tendencies |
| `src/components/league/GodsPageClient.test.ts` | Unit | Win-rate qualification filter (superficial) |
| `tests/e2e/site.spec.ts` | E2E | Public routes, nav, assets, responsive viewports, division tabs |
| `tests/e2e/lab-editor.spec.ts` | E2E | Design lab controls, JSON import/export |
| `tests/e2e/canvas-clipping.spec.ts` | E2E | Org card canvas clipping regression at multiple resolutions |
| `tests/load/god-draft-load.test.ts` | Load | Draft room load p95 budget, realtime fanout simulation |
| `tests/load/stats-load.test.ts` | Load | Concurrent stats query p95 budget |

### Unit test gaps

| Module | Coverage | Missing scenarios | Priority |
|--------|----------|-------------------|----------|
| `standings.ts` | **0%** | Basic W/L, points-for/against, streak (last 5), games-back per division, tied match, empty season, forfeit, bye-week org, cross-season contamination, stale-row removal | P0 |
| `captain-auth.ts` | **0%** | Cookie set/get round-trip, malformed cookie → null, missing cookie → null, `NODE_ENV`-gated secure flag, token exchange delegates to `verifyCaptainToken` | P0 |
| `rate-limit.ts` | **0%** | 10 calls allowed → 11th blocked, window resets after 15 min (fake timers), per-key isolation, `clearRateLimit` resets state | P0 |
| `god-draft-rules.ts` | ~70% | Skipped-ban persistence, undo removes skipped ban, pause→resume preserves `turnStartedAt`, concurrent version-conflict rejection, bilateral reset, empty format array | P1 |
| `league-data.ts` standings path | 0% | `recalculateAndPersistStandings` with known match set produces expected standings rows | P1 |

### E2E test gaps

| Journey | Status | Priority |
|---------|--------|----------|
| Admin login (password → session cookie → dashboard) | Missing | P0 |
| Captain token exchange → draft room redirect | Missing | P0 |
| Captain ban/pick full cycle → draft complete | Missing | P0 |
| Player registration Flow A (Discord OAuth → form → submit) | Missing | P1 |
| Standings update after match score edit + Recalculate | Missing | P1 |
| Announcement create (admin) → visible on public home | Missing | P1 |
| Admin logout → cookie cleared → redirect to login | Missing | P2 |

### Integration test gaps (against real Supabase + RLS)

| Scenario | Priority |
|----------|----------|
| Anon client: SELECT `orgs`, `players`, `matches`, `standings` → 200 | P0 |
| Anon client: INSERT `orgs` → 403 | P0 |
| Anon client: SELECT `admin_audit_log` → 403 | P0 |
| Anon client: SELECT `registrations` → 403 | P0 |
| Anon client: INSERT `registrations` → 200 | P0 |
| Service-role client: SELECT/INSERT any admin table → 200 | P0 |
| Captain token: valid hash lookup → session granted | P1 |
| Captain token: expired token → rejected | P1 |
| Full pick flow: create room → issue token → submit pick → verify `draft_picks` row + index increment | P1 |
| Standings recalc: seed 5 orgs + 6 matches → call API → verify `standings` table | P1 |
| Season filter isolation: seed two seasons → query season 1 → season 2 stats excluded | P1 |

---

## Issues Filed

See the GitHub Issues tab for the full list of 29 concrete issues derived from this audit, labeled by area and priority.
