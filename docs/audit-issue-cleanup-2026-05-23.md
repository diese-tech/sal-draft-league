# SAL-Site Audit Issue Cleanup

**Date:** 2026-05-23
**Source:** `docs/audit-production-readiness-2026-05-23.md`, current `main`, and open GitHub issues.

This report exists because issue-closing permissions were not safely available in this workspace. Do not close uncertain issues without verifying the linked PR is on `main`.

## Fixed Or Superseded Issues

| Issue | Title | Recommended action | Evidence | Suggested closing comment |
|-------|-------|--------------------|----------|---------------------------|
| #54 | [SEC P0] Captain session cookie is unsigned - anyone can forge a captain identity | Close as completed | PR #98; audit item P0-01. | Closing as completed. The audit ledger marks this resolved by PR #98 under item P0-01. See `docs/audit-production-readiness-2026-05-23.md`. |
| #57 | [SEC P0] Player claim endpoint allows cross-profile identity theft | Close as completed | PR #100; audit item P0-04. | Closing as completed. The audit ledger marks this resolved by PR #100 under item P0-04. See `docs/audit-production-readiness-2026-05-23.md`. |
| #58 | [BUG P0] Tied matches are silently dropped from standings | Close as completed | PR #99; audit item P0-05. | Closing as completed. The audit ledger marks this resolved by PR #99 under item P0-05. See `docs/audit-production-readiness-2026-05-23.md`. |
| #59 | [BUG P0] recalcStandings() has no season filter - cross-season contamination | Close as completed | PR #99; audit item P0-06. | Closing as completed. The audit ledger marks this resolved by PR #99 under item P0-06. See `docs/audit-production-readiness-2026-05-23.md`. |
| #60 | [BUG P0] Two active seasons can coexist - no database constraint | Close as completed | PR #100; audit item P0-07. | Closing as completed. The audit ledger marks this resolved by PR #100 under item P0-07. See `docs/audit-production-readiness-2026-05-23.md`. |
| #64 | [CI P0] Unit tests and E2E tests are not executed in CI | Close as completed or superseded | PR #94; audit items P0-11, P0-12, P2-15, P2-16; earlier CI tracking superseded by #93/#94. | Closing as completed/superseded. The audit ledger marks CI test execution resolved by PR #94 under items P0-11, P0-12, P2-15, and P2-16. See `docs/audit-production-readiness-2026-05-23.md`. |
| #66 | [SEC P1] Captain tokens not invalidated after first exchange | Close as completed | PR #99; audit item P1-02. | Closing as completed. The audit ledger marks this resolved by PR #99 under item P1-02. See `docs/audit-production-readiness-2026-05-23.md`. |
| #70 | [ENV P1] .env.example is misconfigured and missing a required variable | Close as completed | PR #97; audit items P1-13 and P1-14. | Closing as completed. The audit ledger marks this resolved by PR #97 under items P1-13 and P1-14. See `docs/audit-production-readiness-2026-05-23.md`. |
| #71 | [TEST P1] Write unit tests for standings.ts | Close as completed | PR #94; audit item P1-15. | Closing as completed. The audit ledger marks this resolved by PR #94 under item P1-15. See `docs/audit-production-readiness-2026-05-23.md`. |
| #72 | [TEST P1] Write unit tests for captain-auth.ts and rate-limit.ts | Verify before closing | PRs #95/#98 cover captain-auth; PR #99 covers rate-limit; audit items P1-16 and P1-17. | Needs verification before closing. The audit ledger marks captain-auth coverage resolved by PRs #95/#98 and rate-limit coverage resolved by PR #99 under items P1-16 and P1-17. See `docs/audit-production-readiness-2026-05-23.md`. |
| #73 | [TEST P1] Add integration tests for Supabase RLS policies | Close as superseded | Superseded by #87; implemented by PR #98; audit item P1-18. | Closing as superseded. The audit ledger marks the original RLS integration-test item implemented by PR #98 under item P1-18, with follow-up tracking in #87. See `docs/audit-production-readiness-2026-05-23.md`. |
| #76 | [SEC P1] Add admin session verification to Next.js middleware | Close as completed | PR #98; audit item P1-04. | Closing as completed. The audit ledger marks this resolved by PR #98 under item P1-04. See `docs/audit-production-readiness-2026-05-23.md`. |
| #77 | [DATA P2] Add forfeit match status and handle it in standings | Close as completed | PR #100; audit item P2-04. | Closing as completed. The audit ledger marks this resolved by PR #100 under item P2-04. See `docs/audit-production-readiness-2026-05-23.md`. |
| #78 | [DATA P2] Add season_id to Match type and enforce season-scoped standings | Close as completed | PR #99; audit items P0-06 and P2-09. | Closing as completed. The audit ledger marks this resolved by PR #99 under items P0-06 and P2-09. See `docs/audit-production-readiness-2026-05-23.md`. |
| #81 | [OPS P2] Add /api/health endpoint for uptime monitoring | Close as completed | PR #97; audit item P2-19. | Closing as completed. The audit ledger marks this resolved by PR #97 under item P2-19. See `docs/audit-production-readiness-2026-05-23.md`. |
| #82 | [SEO P2] Add robots.txt and sitemap.xml | Close as completed | PR #97; audit item P2-20. | Closing as completed. The audit ledger marks this resolved by PR #97 under item P2-20. See `docs/audit-production-readiness-2026-05-23.md`. |

## Issues To Keep Active

| Issue | Title | Reason |
|-------|-------|--------|
| #55 | [SEC P0] Admin session secret falls back to ADMIN_PASSWORD | Partially mitigated only; production warning exists, but fallback remains. |
| #56 | [SEC P0] Rate limiter is implemented but never imported - all auth endpoints are unprotected | Admin login is limited, but claim/register and distributed store remain open. |
| #61 | [BUG P0] Draft undo is non-atomic - concurrent pick corrupts draft state | Still listed as current P0 launch blocker. |
| #62 | [PRODUCT P0] Draft completion does not propagate picks to team rosters | Still listed as current P0 launch blocker. |
| #63 | [PRODUCT P0] Registration approval does not create a player record | Still listed as current P0 launch blocker. |
| #67 | [BUG P1] Simultaneous pick submissions can both pass turn validation | Still listed as current P1 concurrency blocker. |
| #68 | [BUG P1] Standings recalculation is non-atomic - concurrent reads see mixed data | Still listed as current P1 concurrency blocker. |
| #69 | [BUG P1] Concurrent match report submissions cause stat row corruption | Still listed as current P1 concurrency blocker. |
| #74 | [PRODUCT P1] Admin Import page is a stub - bulk player import is non-functional | Import product flow and transactionality remain open. |
| #75 | [PRODUCT P1] Match report AI extraction is a non-functional placeholder | Still intentionally deferred until product-flow blockers are fixed. |
| #79 | [PRODUCT P2] Historical season browsing not supported on public pages | Still valid but lower priority. |
| #80 | [OPS P1] Add error monitoring (Sentry) | Still valid but should be deferred behind product-flow blockers. |
| #87 | [TEST P0] RLS integration test suite against real Supabase | Follow-up tracker remains open after #73 supersession. |
| #88 | [TEST P0] Registration post-auth workflow tests (Flow A and Flow B) | Still valid, but re-scope because claim identity theft was fixed by PR #100. |
| #90 | [TEST P0/P1] CSRF and cross-origin request behavior tests | GitHub currently shows this closed as completed; verify coverage before reopening or recreating. |
| #91 | [TEST P1] Yellow coverage hardening - rate limiter, draft load, import, and realistic load tests | Still valid, but defer broad load tests until product-flow blockers are resolved. |
