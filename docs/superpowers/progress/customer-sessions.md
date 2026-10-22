# SDD ledger — plan: docs/superpowers/plans/2026-10-22-customer-sessions.md

Task 1: complete — tests observed RED/GREEN for cookie/hash/origin and Supabase RLS. CustomerSession created atomically with RLS in unpublished additive migration. New clean obal_test_sessions_utf8 used after the migration was amended; previous test DB was not reset or patched. PostgreSQL suite 31/31, no skips.

Task 2: complete — access tokens only in memory, bootstrap refresh, one refresh and bounded retry, server logout/current/all; D2 form adjustments. Client race tests RED/GREEN. Frontend suite 10/10; build passed. Browser 1/1 (45.9s) includes shared-cookie switch to account B while A remains in memory: A's POST is rejected without any B order or stock change.

Task 3: complete — read-only independent review found two P2 issues. Identity mismatch fixed via binding refresh to current account; delayed failed refresh no longer deletes browser cookie. Both findings covered by failing-then-passing tests. No further review was requested; final full suite verifies fixes.

Ruling: refresh secrets do not rotate on each read so tabs can refresh concurrently; absolute lifetime is 7 days and every API request checks DB revocation. Cost: a stolen refresh secret is reusable until expiry/revocation; it is held only in HttpOnly Secure production cookies, protected by origin guard, and stored hashed in DB.

Ruling: rejected refresh and logout responses send no cookie deletion because a delayed response can otherwise delete a newer login cookie. Logout revokes DB access immediately; stale cookie is unusable and expires/replaced on login. Cost: an inert cookie can remain until its original expiry.

Ruling: current Render blueprint explicitly uses SameSite=None for separate Vercel/Render sites; same-site/proxy is preferred for browsers blocking third-party cookies. Cost: persistent login cannot be promised in those browsers until deployment topology is changed and checked. No production or GitHub Actions run performed.

Ruling: E2 venue sessions/secrets, D1 recovery/contact verification and further audit work remain open; existing Telegram contact is not used for account recovery. The project is not claimed fully repaired.

Final verification: backend31/31 + frontend10/10 + browser1/1 + production frontend build + git diff --check. Temporary PostgreSQL stopped. Existing user changes retained; no commit/push/deploy performed.
