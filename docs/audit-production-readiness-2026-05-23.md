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

---

## Test Coverage Gap Analysis
**Addendum date:** 2026-05-23  
**Method:** Full read of every test file, CI workflow, package.json scripts, and corresponding source modules. Coverage claims cite specific file paths and line numbers. Nothing is assumed.

---

### 1. Existing Test Inventory

#### Package.json test scripts

| Script | Command | Runs in CI? |
|--------|---------|-------------|
| `test` | `vitest run` | ❌ No |
| `test:load` | `vitest run tests/load` | ❌ No |
| `test:e2e` | `playwright test` | ❌ No |
| `lint` | `eslint` | ❌ No |
| `build` | `next build` | ✅ Yes (lighthouse.yml) |

**CI pipeline** (`.github/workflows/lighthouse.yml`): runs `npm run build` then `npx lhci autorun`. No test step of any kind. Zero test failures can block a merge.

#### All test files

| File | Type | Lines | Test blocks | Assessment |
|------|------|-------|-------------|------------|
| `src/lib/god-draft-rules.test.ts` | Unit | 218 | 16 | **Meaningful.** Covers phase config engine, state-machine timers, ban/pick vault deduplication, concurrent conflict detection, auth/chat authorization rules, OAuth redirect security. Pure-function tests; no mocks needed. |
| `src/lib/stats-data.test.ts` | Unit | 331 | 14 | **Meaningful.** God aggregation, KDA with zero deaths, per-game pools, opponent derivation (home/away sides), season filter, division inclusion, mitigation null handling, multi-division roster averages, brand/league god stats, org tendencies. Uses a hand-rolled FakeQuery Supabase mock. |
| `src/components/league/GodsPageClient.test.ts` | Unit | 39 | 2 | **Shallow.** Tests a single filter utility (`getQualifiedHighestWinRateStats`): excludes 100%-win-rate gods below minimum games, excludes 0-game gods. No component rendering, no data fetching. |
| `tests/e2e/site.spec.ts` | E2E | 957 | ~95 | **Meaningful and wide.** Covers public routes, admin login/logout, unauthenticated redirect/rejection, CRUD workflows, Zod validation rejection, login rate-limit 429, announcements CRUD with confirmation, registrations page, form-fields page, import preview+send, draft list page, player profiles, captain badge, watch page offline state, mobile overflow. Runs against a real Next.js build with mocked env vars; hits the actual API routes. |
| `tests/e2e/lab-editor.spec.ts` | E2E | 447 | ~40 | **Meaningful within scope.** Stress-tests the design lab configurator (sliders, toggles, selects, JSON import/export). Production-gated (`NODE_ENV=production` redirects away), so this suite is regression insurance for a dev tool, not a league-critical surface. |
| `tests/e2e/canvas-clipping.spec.ts` | E2E | 695 | ~26 groups (~85 scenarios) | **Meaningful within scope.** Parameterized regression suite for org-roster card canvas geometry across roster sizes, team counts, viewport sizes, and view modes (spectator/captain/caster). Guards against layout overflow bugs. No data logic coverage. |
| `tests/load/god-draft-load.test.ts` | Load | 147 | 6 | **Meaningful but uses in-process simulation.** Tests draft room load at 20 concurrent spectators (p95 <600 ms), realtime fanout at 210 subscribers (<500 ms), full-format draft throughput, concurrent ban conflict (one winner, no duplicates), chat throughput (50 messages/1 s), and pick timeout wipe (<1 s). Uses real `god-draft-rules.ts` logic but simulates database calls in-process — not a real Supabase load test. |
| `tests/load/stats-load.test.ts` | Load | 144 | 6 | **Meaningful but mocked.** Tests player cold/warm cache (50 concurrent, 30 rows), god stats at 500 and 5,000 stat rows (p95 budgets), team roster (20 concurrent), and cache invalidation stampede (no 500s). Supabase client is mocked; tests aggregation-algorithm performance, not database I/O. |

**Seed / fixtures:** `scripts/seed-supabase.mjs` — seeds seasons, divisions, orgs, players, matches, and standings from `MOCK_LEAGUE_DATA`. No captain tokens, no registrations, no draft rooms. Only covers the happy-path public data shape; no edge-case data (forfeits, ties, multi-season, archived orgs).

**Mocks/fixtures:** `FakeQuery` in `stats-data.test.ts` (inline, not exported). No shared fixture factories. Each test file constructs its own minimal data inline.

---

### 2. Critical Missing Test Areas

#### A. Auth / Security Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|------------------|-----|----------|
| Unauthenticated user cannot access admin pages | ✅ `site.spec.ts:122` — parameterized test verifies every `/admin/*` route redirects to `/admin/login` when no session | — | — |
| Unauthenticated user cannot call admin mutation API routes | ✅ `site.spec.ts:254` and `site.spec.ts:808-814` — parameterized list of POST/PATCH/DELETE endpoints returns 401 without session | — | — |
| Expired admin cookie is rejected | ❌ No test. `verifyAdminSession()` (`admin-auth.ts:30-50`) checks `exp <= Date.now()` but this path is never exercised in any test. | Unit test: craft a token with `exp` in the past, call `verifyAdminSession()`, assert returns null | P0 |
| Tampered admin cookie is rejected | ❌ No test. `verifyAdminSession()` uses `timingSafeEqual` to compare HMAC signatures but this is untested. | Unit test: modify a valid token's payload byte, assert `verifyAdminSession()` returns null | P0 |
| Normal Discord/player user cannot access admin | ✅ Implicitly covered — admin session is password-based, not Discord OAuth; Discord auth cannot produce an admin cookie | — | — |
| Superadmin actions blocked for regular admins | ❌ No test. Several routes call `isSuperAdminRequest()` (`admin-auth.ts`) but no test verifies a regular-admin cookie is rejected by superadmin-only endpoints (e.g., `DELETE /api/admin/orgs/[id]`, `DELETE /api/admin/players/[id]`). | E2E or unit: log in as regular admin, call a superadmin-only route, assert 403 | P1 |
| Admin login brute-force rate limit | ✅ `site.spec.ts:449` — verifies the 12th failed login attempt returns HTTP 429. **However:** the rate-limiter is in-memory and per-Vercel-instance; the test proves the mechanism works but not that it survives a distributed attack. | Integration test on real serverless: document the known limitation | P2 |
| CSRF / origin protection on admin mutations | ❌ No test. Cookies use `sameSite="lax"`; no CSRF tokens exist. No test sends a cross-origin request to verify rejection. | Integration test: craft a cross-origin fetch to `/api/admin/matches` with a valid session cookie, assert behavior | P1 |
| Supabase anon client cannot mutate protected tables | ❌ No integration test. RLS migration (`supabase/migrations/003_rls.sql`) defines policies but they are never exercised by any test. | Integration test suite against a test Supabase project | P0 |
| Service-role client never imported into browser/client code | ✅ Audited manually — `supabase-server.ts` (service-role) is never imported by any file in `src/components/` or `src/app/*/page.tsx` client segments. No test enforces this. | Static-analysis check: `grep -r "supabase-server" src/components src/app` in CI to prevent future regressions | P2 |

#### B. RLS and Data Exposure Tests

All items in this section are **entirely absent** — there are no integration tests that exercise Supabase RLS policies against a real database instance.

| Scenario | Severity | Recommended test type |
|----------|----------|-----------------------|
| Anon client: SELECT `orgs`, `players`, `matches`, `standings` → 200 | P0 | Integration (real Supabase test project) |
| Anon client: INSERT `orgs` → error | P0 | Integration |
| Anon client: SELECT `admin_audit_log` → error | P0 | Integration |
| Anon client: SELECT `captain_tokens` → error | P0 | Integration |
| Anon client: SELECT `registrations` → error | P0 | Integration |
| Anon client: INSERT `registrations` → 200 | P0 | Integration |
| Public player query does not include `discord_id`, `email`, or raw form_data | P1 | Integration — SELECT `players` with anon key; assert column set |
| Registration data not exposed through `/api/admin/registrations` without admin session | ✅ `site.spec.ts:812` covers the route-level rejection | — |
| Draft room public read does not expose `captain_tokens` rows | P1 | Integration — SELECT `captain_tokens` with anon key |
| Service-role bypasses RLS for admin writes | P1 | Integration |

#### C. Registration Workflow Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| New player registration creates a pending registration | ✅ `site.spec.ts:524` — verifies register page redirects to sign-in when unauthenticated. The post-auth form submission flow is **not** tested end-to-end. | E2E: mock Discord OAuth, fill form, submit, assert pending registration row exists | P0 |
| Duplicate registration is blocked | ❌ No test. `api/auth/register/route.ts` should check for existing `discord_id` but this is untested. | Unit/integration: submit registration twice with same Discord ID; assert second returns 409 or similar | P0 |
| Existing player claim flow (Discord identity match) | ❌ No test. `api/auth/claim/route.ts` is untested at all levels. | Unit: call `claimPlayerProfile()` with matching discord_id; assert player row updated | P0 |
| Claim on already-claimed profile is rejected | ❌ No test for the `profile_claimed = true` guard (if it exists). | Unit: attempt claim on player with `profile_claimed=true`; assert rejection | P0 |
| Discord username collision / username changes | ❌ No test. Username-based matching is the fallback for the claim flow. | Unit: player matched by username; username later changes; assert existing discord_id takes precedence | P1 |
| Rejected player resubmission behavior | ❌ No test. No documented behavior for `status='rejected'` re-registration. | Define behavior; add unit test | P1 |
| Approved registration does not create duplicate player rows | ❌ No test. Approval currently does not create any player row, but once implemented this needs a guard. | Integration: approve registration twice; assert only one player row | P0 |
| Admin approve/reject requires authorization | ✅ `site.spec.ts:812` — `PATCH /api/admin/registrations/reg-test` returns 401 without session | — |
| Required/custom form fields validate correctly | ✅ Partially — `site.spec.ts:564` checks the form-fields admin page loads; no test submits a registration with a missing required field | E2E: submit registration with required custom field empty; assert validation error | P1 |
| Malformed tracker/profile URL rejected or normalized | ❌ No test. `RegisterClient.tsx` has URL validation logic that is untested. | Unit: submit tracker URL without `https://`; assert normalization or error | P1 |
| Very long / malicious text inputs handled safely | ❌ No test. Announcements body length is tested (`site.spec.ts:822`) but player IGN / bio / form fields are not. | Unit: submit IGN of 10,000 chars; assert truncation or rejection | P2 |

#### D. Admin Workflow Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| Admin can create/edit/delete or archive teams/orgs | ✅ `site.spec.ts:169`, `site.spec.ts:215` — match and player mutation payloads posted and response verified | Org-specific CRUD not tested separately | P2 |
| Admin cannot assign player to two active teams in same season | ❌ No test. No server-side guard verified. | Unit/integration: assign player to org-A; attempt assign to org-B; assert error | P1 |
| Captain status and starter status constraints enforced | ❌ No test. UI shows controls (`site.spec.ts:441`) but server-side constraint (one captain per org) is unverified. | Unit: set two players as captain for same org; assert second is rejected | P1 |
| Admin cannot create a match with same team on both sides | ✅ `site.spec.ts:272` — `matches API rejects same home and away org` | — |
| Admin cannot complete a match with missing score data | ✅ `site.spec.ts:312` — `matches API rejects completed status without scores` | — |
| Score corrections update downstream standings | ❌ No test. E2E hits the update endpoint but does not verify the resulting standings rows. | E2E or integration: submit match score; call recalculate; query standings; assert values | P0 |
| Admin destructive actions require confirmation | ✅ `site.spec.ts:636`, `site.spec.ts:655`, `site.spec.ts:407` — announcements delete confirmation, match save confirmation | — |
| Every admin mutation writes to audit log | ❌ No test. `writeAuditLog()` is called in most routes but return value and log entry are never asserted in any test. | Integration: perform admin mutation; query `admin_audit_log`; assert entry exists with correct action/entity | P1 |
| Admin cannot edit roster without corrupting season history | ❌ No test. No season-history concept is currently tested. | P2 |

#### E. Draft Engine / State Machine Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| Phase config and turn order | ✅ `god-draft-rules.test.ts:54-96` — 3-phase and 4-phase sequences fully tested | — |
| Picks cannot happen during ban phase / bans during pick phase | ✅ `god-draft-rules.test.ts` — phase-type enforcement is implicit in `getDraftTurn()` | No explicit phase-mismatch rejection test | P1 |
| Same god cannot be picked/banned twice | ✅ `god-draft-rules.test.ts:174-188` — same-session duplicate detection | — |
| Same team cannot act out of turn | ✅ `god-draft-rules.test.ts:180-189` — concurrent submission conflict modeled | Unit tests only; no E2E or API-level test | P1 |
| Spectators cannot mutate draft state | ✅ `god-draft-rules.test.ts:192-211` — `canRoleSubmitDraftAction()` tested for all roles | No API route test verifying the role check | P1 |
| Captain token required, scoped, expires | ❌ No test for `verifyCaptainToken()` or the `/api/draft/[id]/token` exchange endpoint. | Unit: valid token → session granted; expired token → rejected; wrong draft ID → rejected | P0 |
| Concurrent captain actions do not double-submit | ✅ `god-draft-load.test.ts:96-106` — concurrent ban conflict simulation (in-process) | No real DB-level concurrent write test | P1 |
| Captain session cookie can be forged (unsigned) | ❌ No test. This is the critical P0 security bug — and there is no test documenting or catching it. | Unit: set cookie to arbitrary `draftRoomId:orgId`; attempt pick; assert rejected (will fail until bug fixed) | P0 |
| Page reload / reconnect preserves draft state | ❌ No test. | E2E: submit ban, reload page, assert ban is still shown | P1 |
| Draft completion locks final state | ❌ No test. No E2E or unit test for the post-completion state. | E2E: complete draft; attempt additional pick; assert rejection | P1 |
| Draft reset/reopen is admin-only and audited | ❌ No test. `POST /api/draft/god/reset` is called in `god-draft-rules.test.ts` via action modeling but the route authorization is untested. | E2E: non-admin attempts reset; assert 401 | P1 |
| Previously-used gods blocked across series games | ✅ `god-draft-rules.test.ts:155-172` — `getVaultedGods()` thoroughly tested across multi-game scenarios | — |
| Draft room creation validates division, season, captains | ✅ `site.spec.ts:736-755` — draft page renders, form has division select, unknown room 404 | No validation of division/season FK integrity server-side | P1 |

#### F. Standings and Schedule Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| Standings recalc is deterministic | ❌ No unit test for `recalcStandings()` (`standings.ts:3-56`). Only tested via E2E against the API endpoint, which does not assert on resulting data values. | Unit: provide fixed match set; call `recalcStandings()`; assert exact W/L/points per org | P0 |
| Incomplete/scheduled/postponed matches excluded | ❌ No unit test. Code skips `status !== 'completed'` but this is unverified. | Unit: include a `scheduled` match in input; assert it contributes zero points | P1 |
| Forfeits handled per league rules | ❌ No test. No forfeit status exists yet. | Once forfeit status is added: unit test asserts winner gets W, loser gets L | P1 |
| Tiebreakers implemented or explicitly absent | ❌ No tiebreaker logic exists; no test documents this absence. | Document explicit decision; add test once implemented | P2 |
| Games-back calculation | ❌ No unit test. `gamesBack` math in `standings.ts:46-53` is untested. | Unit: leader 4-0, follower 2-2 → gamesBack=2 | P0 |
| Streak calculation (last 5 only) | ❌ No unit test. Streak is computed in `standings.ts` but unverified. | Unit: org with 7 wins → streak array length 5 | P0 |
| Tied matches handled | ❌ No unit test. Current code silently skips ties (P0 bug). | Unit: homeScore=awayScore → neither team gets a win (documents the bug) | P0 |
| Division filters work | ✅ `site.spec.ts:75`, `site.spec.ts:84`, `site.spec.ts:93` — standings/schedule/teams division tab switches are exercised | No assertion on returned data set | P2 |
| Season filters do not leak across seasons | ❌ No test. `recalcStandings()` has no season parameter. | Unit: two seasons' matches passed together → assert current season data only | P0 |
| Schedule: no active season | ❌ No test. Mock data fallback is silent; no test verifies public pages render a clear empty state vs. fake data. | E2E (mocked env): set no active season; assert page shows empty state rather than mock data | P2 |
| Schedule: cancelled/postponed match | ❌ No test. `status='postponed'` exists in types but its display behavior is untested. | E2E: seed a postponed match; visit schedule; assert it renders with correct label | P2 |

#### G. Import Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| CSV parser handles Google Sheets paste | ✅ `site.spec.ts:690-712` — valid CSV shows green preview rows; bad row (no role) shows red; batch send shows imported count | No test for TSV, quoted fields, BOM characters, Windows line endings | P1 |
| Required fields validated | ✅ `site.spec.ts:701` — row with no role shows red | No test for missing IGN, missing ID | P1 |
| Duplicate IGN rows update instead of duplicating | ❌ No test. Upsert-by-ID means two rows with different IDs but same IGN both insert silently. | Unit: import CSV with two rows sharing an IGN; assert error or intentional override | P0 |
| Bad rows reported without committing partial data | ❌ No test. Import is not transactional; partial failure leaves orphaned rows. | Integration: import batch where row 3 of 5 is invalid; assert rows 1-2 are NOT committed (currently will fail — confirms the bug) | P0 |
| Preview state matches committed result | ✅ `site.spec.ts:690` — preview shows expected row colors | No assertion that preview data exactly matches what API commits | P1 |
| Large imports perform acceptably | ✅ `stats-load.test.ts` indirectly covers aggregation at scale but not import throughput | Load test: import 500-player CSV; assert completion under 5 s | P2 |
| Import is admin-only and audited | ✅ Auth: `site.spec.ts:254` covers unauthenticated rejection. Audit: no test verifies audit log entry is written on import. | Integration: perform import; query `admin_audit_log`; assert entry | P1 |
| Import rollback / recovery path | ❌ No test and no implementation. | Once transactional import is implemented: integration test verifying rollback | P1 |

#### H. Public UI / E2E Tests

| Scenario | Existing coverage | Gap | Severity |
|----------|-----------------|-----|----------|
| Home page renders with full data | ✅ `site.spec.ts:18` — public route rendering test | No assertion on actual data content (standings rows, match cards) | P2 |
| Home page with no active season | ❌ No test. Mock fallback is silent. | E2E (mocked env with no season): assert empty state, not mock data | P2 |
| Standings page: empty division | ❌ No test. | E2E: seed season with no teams in one division; visit standings; assert empty row/message | P2 |
| Schedule filters: desktop and mobile | ✅ `site.spec.ts:84` — filter selectability checked; `site.spec.ts:28-34` — overflow check | No test that filter actually narrows the displayed match list | P1 |
| Team page: missing roster/socials | ❌ No test. `site.spec.ts:113` checks team detail renders but seed always has players. | E2E: visit team with empty roster; assert graceful empty state | P2 |
| Player profile: missing optional fields | ❌ No test. Player always has all fields in seed. | E2E: visit player with no stats, no org, no tracker; assert no crash | P1 |
| Watch page: Twitch offline or missing config | ✅ `site.spec.ts:535` — renders without crashing; `site.spec.ts:924` — shows offline state when stream is down | — |
| Announcement markdown renders safely | ✅ `site.spec.ts:618` — preview toggle renders markdown body | No test for `javascript:` href in link (the XSS vector) | P0 |
| Mobile tables: no overflow | ✅ `site.spec.ts:28-34`, `site.spec.ts:245`, `site.spec.ts:500`, `site.spec.ts:937` — parameterized overflow checks at 390 px viewport | — |
| Navigation without auth | ✅ `site.spec.ts:37` — all top nav links tested | — |
| Error / loading / empty states | ✅ `site.spec.ts:265`, `site.spec.ts:506`, `site.spec.ts:427`, `site.spec.ts:482` — 404s and empty search states | No test for 500-class errors from Supabase | P1 |

#### I. Performance / Load Tests

| Area | Existing | Gap | Severity |
|------|----------|-----|----------|
| Draft spectator concurrent load | ✅ `god-draft-load.test.ts:64` — 20 concurrent at p95 <600 ms | In-process simulation only; no real network or DB I/O | P1 |
| Realtime fanout (210 subscribers) | ✅ `god-draft-load.test.ts:75` — 210 subscribers at p95 <500 ms | In-process; Supabase Realtime latency not measured | P1 |
| Full draft throughput (all picks) | ✅ `god-draft-load.test.ts:83` — current and extended formats complete under budget | — |
| Player directory with large roster | ✅ `stats-load.test.ts:89` — 50 concurrent at 30 rows | 30 rows is a very small dataset; 300-player league is untested | P1 |
| God stats at scale (5000 rows) | ✅ `stats-load.test.ts:117` — 5000 rows at p95 budget | Mocked DB; real Supabase query plan may differ | P1 |
| Standings recalculation under load | ❌ No load test. `recalculateAndPersistStandings()` reads all orgs and all matches on every call; hot endpoint. | Load test: 10 concurrent POST to `/api/admin/recalculate-standings`; measure p95 and assert no 500s | P1 |
| Admin import at scale | ❌ No load test. | Load test: import 500-row CSV; assert completes under 10 s | P2 |
| Homepage load with full season data | ✅ Lighthouse CI at `/` (perf ≥70%) | Lighthouse uses a simulated network; no concurrent-user test | P2 |
| All load tests use mocked Supabase | `god-draft-load.test.ts` and `stats-load.test.ts` both simulate database calls in-process. No load test exercises a real Supabase connection. | Configure a load test environment with a real test DB | P1 |

#### J. CI / Release Gates

| Check | Current status | Gap | Severity |
|-------|---------------|-----|----------|
| Lint (`npm run lint`) | ❌ Not in CI | Add as required check | P1 |
| Build (`npm run build`) | ✅ Runs in `lighthouse.yml` | — |
| TypeScript (`tsc --noEmit`) | ❌ Not in CI | Add as required check | P1 |
| Unit tests (`npm run test`) | ❌ Not in CI | Add as required check; failures block merge | P0 |
| E2E tests (`npm run test:e2e`) | ❌ Not in CI | Add as required check; requires test Supabase project | P0 |
| Load tests (`npm run test:load`) | ❌ Not in CI | Add as optional gate (warn on regression) | P2 |
| Lighthouse (perf/a11y/SEO) | ✅ Runs and reports | Thresholds are `warn` only; sub-70 perf does not block merge | P2 |
| Branch protection rules | ❌ Unknown; no required status checks visible | Enable branch protection on `main`; require all CI checks | P0 |

**Minimum release gate (must all be green before any production deploy):**
```
npm run lint
tsc --noEmit
npm run test           # unit + load
npm run build
npm run test:e2e       # requires seeded test Supabase
npx lhci autorun       # with error-level thresholds
```

---

### 3. Coverage Summary

| Area | Rating | Basis |
|------|--------|-------|
| God draft state machine (pure logic) | 🟢 Green | 16 meaningful unit tests in `god-draft-rules.test.ts` |
| Stats aggregation | 🟢 Green | 14 meaningful unit tests with full Supabase mock in `stats-data.test.ts` |
| Public page rendering and nav | 🟢 Green | `site.spec.ts` parameterized across routes, viewports, filters |
| Admin login / logout / route protection | 🟢 Green | `site.spec.ts:122,135` — redirect and session tested |
| Unauthenticated API rejection | 🟢 Green | `site.spec.ts:254,808-814` — parameterized auth rejection |
| Admin CRUD mutations (match/player/announcement) | 🟡 Yellow | Payload and happy-path tested; no error recovery, no audit-log assertion |
| Login rate limiting | 🟡 Yellow | `site.spec.ts:449` proves mechanism; not a real distributed test |
| Draft load / concurrent spectators | 🟡 Yellow | In-process simulation; no real DB or network |
| Admin import (CSV) | 🟡 Yellow | Preview and batch send tested; rollback, deduplication, and large-import untested |
| Standings calculation | 🔴 Red | Zero unit tests; correctness unverified for ties, streaks, games-back, season isolation |
| Captain token exchange | 🔴 Red | No test at any level for `verifyCaptainToken()`, token expiry, or session cookie validation |
| Admin session HMAC (tamper / expiry) | 🔴 Red | Crypto path in `admin-auth.ts:30-50` is completely untested |
| RLS policies | 🔴 Red | No integration tests against a real Supabase instance |
| Registration workflow (full flow) | 🔴 Red | Pre-auth redirect tested; post-OAuth form submit, duplicate prevention, and claim flow untested |
| Superadmin vs regular admin distinction | 🔴 Red | Role separation in API routes is untested |
| CSRF / cross-origin protection | 🔴 Red | No test verifies cross-site request behavior |
| XSS via Markdown href | 🔴 Red | No test asserts `javascript:` links are blocked |
| Season filter isolation in standings | 🔴 Red | `recalcStandings()` has no season parameter; cross-season contamination is untested |
| CI gates | 🔴 Red | Only Lighthouse runs; unit and E2E tests not in CI pipeline |

---

### 4. Gap Tables

#### Full coverage table

| Area | Existing coverage | Missing coverage | Severity | Recommended type | Suggested file |
|------|-----------------|-----------------|----------|-----------------|----------------|
| Admin session expiry/tamper | None | `verifyAdminSession()` unit tests: expired token, bit-flipped payload | P0 | Unit | `src/lib/admin-auth.test.ts` |
| Captain session forgery | None | Set unsigned cookie → pick rejected | P0 | Unit + E2E | `src/lib/captain-auth.test.ts` |
| Captain token exchange | None | Valid/expired/wrong-draft token exchange | P0 | Unit | `src/lib/captain-auth.test.ts` |
| RLS: anon cannot mutate | None | All protected tables via anon key | P0 | Integration | `tests/integration/rls.test.ts` |
| Registration duplicate prevention | None | Same discord_id submitted twice → 409 | P0 | Unit + Integration | `tests/integration/registration.test.ts` |
| Registration approval → player record | None | Approve twice → one player row | P0 | Integration | `tests/integration/registration.test.ts` |
| Standings: basic W/L | None | 3 orgs, 2 matches → correct records | P0 | Unit | `src/lib/standings.test.ts` |
| Standings: ties | None | homeScore=awayScore → no winner assigned | P0 | Unit | `src/lib/standings.test.ts` |
| Standings: games-back | None | leader 4-0, follower 2-2 → gamesBack=2 | P0 | Unit | `src/lib/standings.test.ts` |
| Standings: season isolation | None | Two seasons' matches → only current used | P0 | Unit | `src/lib/standings.test.ts` |
| Standings: streak (last 5) | None | 7-win org → streak length 5 | P0 | Unit | `src/lib/standings.test.ts` |
| Import: partial failure rollback | None | Row 3 invalid → rows 1-2 NOT committed | P0 | Integration | `tests/integration/import.test.ts` |
| Import: duplicate IGN | None | Two rows same IGN → error reported | P0 | Unit | `tests/integration/import.test.ts` |
| Score correction → standings update | None | Edit match score → recalc → assert standings row | P0 | Integration | `tests/integration/standings.test.ts` |
| CI: unit tests in pipeline | None | Add `npm run test` step | P0 | CI config | `.github/workflows/ci.yml` |
| CI: E2E tests in pipeline | None | Add `npm run test:e2e` step | P0 | CI config | `.github/workflows/ci.yml` |
| Superadmin route restriction | None | Regular admin → superadmin endpoint → 403 | P1 | E2E | `tests/e2e/site.spec.ts` |
| CSRF cross-origin request | None | Cross-origin POST to admin mutation → behavior documented | P1 | Integration | `tests/integration/security.test.ts` |
| Captain pick during wrong turn | Modeled in unit test | API route-level rejection (real request) | P1 | E2E | `tests/e2e/draft.spec.ts` |
| Draft completion locks state | None | Post-complete pick → rejected | P1 | E2E | `tests/e2e/draft.spec.ts` |
| Draft reset is admin-only | None | Non-admin reset → 401 | P1 | E2E | `tests/e2e/draft.spec.ts` |
| Audit log written on mutations | None | Admin action → `admin_audit_log` row exists | P1 | Integration | `tests/integration/audit.test.ts` |
| Captain status: one per org | None | Second captain → rejected | P1 | Unit/Integration | `tests/integration/roster.test.ts` |
| Standings: forfeit status | None | Forfeit match → winner W, loser L | P1 | Unit | `src/lib/standings.test.ts` |
| Standings: postponed excluded | None | Postponed match → contributes zero | P1 | Unit | `src/lib/standings.test.ts` |
| Rate limiter per-key isolation | None | Unit tests for `checkRateLimit()` | P1 | Unit | `src/lib/rate-limit.test.ts` |
| Rate limiter window reset | None | Advance clock 901 s → counter resets | P1 | Unit | `src/lib/rate-limit.test.ts` |
| Player profile: missing fields | None | Player with no org, no stats → no crash | P1 | E2E | `tests/e2e/site.spec.ts` |
| Registration: rejected resubmission | None | Define behavior; add test | P1 | Unit | `tests/integration/registration.test.ts` |
| Schedule filter narrows results | Selectability only | Filter actually reduces displayed matches | P1 | E2E | `tests/e2e/site.spec.ts` |
| XSS: `javascript:` href in announcement | None | Markdown link with js: href → `#` rendered | P1 | E2E | `tests/e2e/site.spec.ts` |
| Load: standings recalc under concurrent load | None | 10 concurrent POST → p95 + no 500s | P1 | Load | `tests/load/standings-load.test.ts` |
| Load: import at scale (500 rows) | None | 500-row CSV → completes under 10 s | P2 | Load | `tests/load/import-load.test.ts` |
| Home page with no active season | None | Empty state vs. mock data | P2 | E2E | `tests/e2e/site.spec.ts` |
| Standings: empty division | None | Division with no teams → empty state | P2 | E2E | `tests/e2e/site.spec.ts` |
| Service-role never in browser bundle | None | CI grep guard | P2 | Static analysis | `.github/workflows/ci.yml` |
| Lighthouse thresholds error-level | Warn only | Bump to error to block merge on regression | P2 | CI config | `.lighthouserc.json` |

---

### 5. P0 Test Backlog (required before launch)

Each item is a specific test case, not a feature. Test descriptions are precise enough to implement directly.

1. **`admin-auth.test.ts`** — `verifyAdminSession()` returns null for a token with `exp` in the past.
2. **`admin-auth.test.ts`** — `verifyAdminSession()` returns null when the final byte of the HMAC signature is changed.
3. **`admin-auth.test.ts`** — `verifyAdminSession()` returns null for a token whose payload is valid JSON but signed with a different secret.
4. **`captain-auth.test.ts`** — `getCaptainSession()` returns null for a cookie value without a colon separator.
5. **`captain-auth.test.ts`** — `getCaptainSession()` returns null for a cookie value with an empty orgId part (`"draftRoomId:"`).
6. **`captain-auth.test.ts`** — `verifyCaptainToken()` rejects a token whose `expires_at` is in the past.
7. **`captain-auth.test.ts`** — `verifyCaptainToken()` rejects a token with the correct hash but the wrong `draft_room_id`.
8. **`captain-auth.test.ts`** — Forging the captain session cookie (`draftRoomId:orgId` plaintext) allows a pick submission — this test is written to FAIL, documenting the unfixed vulnerability.
9. **`standings.test.ts`** — `recalcStandings()` with 3 orgs and 4 completed matches produces exact W/L/pointsFor/pointsAgainst per org.
10. **`standings.test.ts`** — `recalcStandings()` with `homeScore === awayScore` produces no win and no loss for either team (will fail until tie handling is implemented).
11. **`standings.test.ts`** — `recalcStandings()` with a 7-win org produces a `recentResults` array of length 5 (last 5 only).
12. **`standings.test.ts`** — Leader org 4-0, second org 2-2 in same division → second org has `gamesBack === 2`.
13. **`standings.test.ts`** — Matches from two different seasons passed together → standings reflect only current season matches (will fail until season filter is added).
14. **`standings.test.ts`** — A `status='scheduled'` match with scores present contributes zero points to standings.
15. **`rls.test.ts`** — Supabase anon client INSERT into `orgs` returns a Postgres error.
16. **`rls.test.ts`** — Supabase anon client SELECT from `admin_audit_log` returns zero rows or an error.
17. **`rls.test.ts`** — Supabase anon client SELECT from `captain_tokens` returns zero rows or an error.
18. **`rls.test.ts`** — Supabase anon client INSERT into `registrations` succeeds and row is readable via service-role.
19. **`registration.test.ts`** — Submitting the registration form twice with the same Discord ID returns 409 (or equivalent) on the second attempt.
20. **`registration.test.ts`** — Calling approve on a registration twice results in exactly one `players` row (once approval-to-player is implemented).
21. **`import.test.ts`** — Importing a 5-row CSV where row 3 has an invalid role results in zero rows committed (rollback test; currently fails, documenting the bug).
22. **`import.test.ts`** — Importing a CSV with two rows sharing the same IGN produces an error for the duplicate row.
23. **`standings.test.ts (integration)`** — Admin edits match score; calls recalculate standings; resulting `standings` table row has updated wins and points.
24. **`site.spec.ts`** — `POST /api/admin/orgs` with a valid admin session but non-superadmin role returns 403.
25. **`site.spec.ts`** — Admin announcement body containing `[click](javascript:alert(1))` renders the link with `href="#"` not `href="javascript:..."`.
26. **`ci.yml`** — Add `npm run test` step; verify it runs and fails the pipeline on a failing test (confirm by temporarily breaking one test).
27. **`ci.yml`** — Add `npm run test:e2e` step with test Supabase secrets.

---

### 6. P1 Test Backlog (required before first full season)

1. **`rate-limit.test.ts`** — 10 calls to `checkRateLimit('key')` are all allowed; the 11th is rejected with `allowed: false`.
2. **`rate-limit.test.ts`** — After advancing the clock 901 seconds (via `vi.useFakeTimers()`), `checkRateLimit('key')` resets the window and allows again.
3. **`rate-limit.test.ts`** — `clearRateLimit('key')` after 10 calls resets counter to 10 remaining.
4. **`rate-limit.test.ts`** — Key A exhausted does not affect key B.
5. **`standings.test.ts`** — A match with `status='postponed'` contributes zero points even if scores are present.
6. **`standings.test.ts`** — A match with `status='forfeit'` (once implemented) awards a win to the non-forfeiting team and a loss to the forfeiting team.
7. **`draft.spec.ts`** — Captain submits a pick; page is reloaded; the pick is still shown in the draft board.
8. **`draft.spec.ts`** — After draft completes, a subsequent pick attempt returns an error.
9. **`draft.spec.ts`** — Non-admin call to `POST /api/draft/god/reset` returns 401.
10. **`draft.spec.ts`** — Captain acting out of turn (correct draft room, wrong org) receives a turn-order rejection.
11. **`audit.test.ts`** — Admin calls `PATCH /api/admin/matches/[id]`; query `admin_audit_log`; assert an entry with `action='update_match'` exists.
12. **`roster.test.ts`** — Setting two players as captain for the same org in the same season returns an error on the second.
13. **`security.test.ts`** — Cross-origin POST to `POST /api/admin/matches` with a valid session cookie documents current `sameSite=lax` behavior.
14. **`site.spec.ts`** — Schedule division filter: select "Solar" → only Solar-division matches remain visible.
15. **`site.spec.ts`** — Player profile with no org assignment, no stats, and no tracker URL renders without crashing or throwing a JS error.
16. **`site.spec.ts`** — Registration form with a required custom field left empty shows an inline validation error.
17. **`site.spec.ts`** — Rejected registration: attempt to re-register shows the expected UI state (requires defining behavior first).
18. **`standings-load.test.ts`** — 10 concurrent `POST /api/admin/recalculate-standings` requests: p95 < 2 s, no 500s.

---

### 7. P2 Test Backlog (polish / regression)

1. **`site.spec.ts`** — Home page with no active season renders an explicit empty/coming-soon state, not the mock data set.
2. **`site.spec.ts`** — Standings page with an empty division renders a "No teams yet" message, not a JS error.
3. **`site.spec.ts`** — Team detail page with an empty roster renders "No players assigned."
4. **`site.spec.ts`** — Import: player IGN over 50 characters is rejected with a validation error.
5. **`ci.yml`** — Add `tsc --noEmit` as a required CI step.
6. **`ci.yml`** — Add `npm run lint` as a required CI step.
7. **`ci.yml`** — Add `grep -r "supabase-server" src/components src/app/*/page.tsx` to assert service-role client is never in browser code.
8. **`.lighthouserc.json`** — Change performance, accessibility, and SEO thresholds from `warn` to `error` to block merges on regression.
9. **`import-load.test.ts`** — 500-row CSV import completes under 10 s with no 500 errors.
10. **`standings.test.ts`** — `gamesBack` is 0 for the leader of every division (not negative).
11. **`standings.test.ts`** — Division with zero orgs produces an empty standings array without throwing.

---

### 8. Unit vs Integration vs E2E vs Load — Decision Guide

| Test type | Use when | Examples |
|-----------|----------|---------|
| **Unit (Vitest)** | Testing pure functions or functions with injectable dependencies | `standings.ts`, `admin-auth.ts`, `rate-limit.ts`, `captain-auth.ts`, `god-draft-rules.ts` |
| **Integration (Vitest + real Supabase test project)** | Testing that RLS policies, DB constraints, and multi-step transactions behave correctly | RLS policy suite, registration duplicate check, standings recalc correctness, audit log writing |
| **E2E (Playwright)** | Testing full user journeys through the browser | Admin login flow, captain pick flow, announcement XSS check, registration form validation |
| **Load (Vitest in-process)** | Testing algorithmic performance budgets | Draft state machine throughput, stats aggregation at scale |
| **Load (real network)** | Testing endpoint throughput under concurrent requests | Standings recalculation, import at scale — these require a test environment with a real Supabase connection |

---

### 9. Testability Refactors Needed

These are small code changes (not full rewrites) that would make the code significantly easier to test. No tests should be written until after these are in place for the affected modules.

| Module | Problem | Refactor needed |
|--------|---------|-----------------|
| `src/lib/admin-auth.ts` | `requireAdmin()` and `isAdminRequest()` read cookies via `next/headers`, making them untestable without a full Next.js request context | Extract the core HMAC logic into a pure `verifyToken(token: string, secret: string): AdminSession \| null` function that takes a raw string rather than reading cookies. The cookie-reading wrapper then calls the pure function. Unit tests test the pure function. |
| `src/lib/captain-auth.ts` | `getCaptainSession()` calls `cookies()` from `next/headers` | Same pattern: extract `parseSessionCookie(value: string): CaptainSession \| null`; test the pure parser. |
| `src/lib/league-data.ts` | All functions create the Supabase client internally via `getSupabaseServerClient()`, making them hard to mock | Accept an optional `supabase` client parameter (defaulting to the real client). Tests inject a `FakeQuery`-style mock. This is the same pattern already used in `stats-data.ts`. |
| `src/app/api/auth/claim/route.ts` | Route handler contains all logic inline | Extract the business logic (`resolveClaimRequest(discordId, playerId, supabase)`) into a testable pure-ish function in `league-data.ts`. The route handler becomes a thin wrapper. |
| `src/lib/standings.ts` | Already pure — no refactor needed | Add a `seasonId` parameter so season filtering is internal rather than caller-responsibility. |
