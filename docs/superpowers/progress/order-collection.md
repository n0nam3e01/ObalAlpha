# SDD ledger — plan: docs/superpowers/plans/2026-10-19-order-collection.md

Task 1: complete — additive lifecycle migration, buyer-first lock ordering, active limit 3 and venue-scoped cancellation. Lifecycle tests observed RED then GREEN. Real PostgreSQL suite: 28/28, no skips.

Task 2: complete — extracted ticket/Orders/polling, queue first on mobile, explicit cancellation reason, code focus and collected-order rating. Frontend tests: 6/6. Browser against real API/PostgreSQL: 1/1, phone 390 px, collection and cancellation automatically observed, network recovery checked.

Task 3: complete — CI workflow with isolated PostgreSQL and browser run; current review status documented. CI configuration itself has not run on GitHub; branch remains local and uncommitted.

Pre-flight: booking and all transition writers consistently lock buyer -> box -> order; UI consumes unchanged order envelopes plus nullable lifecycle fields. Existing user edits remain intact.

Review: independent read-only reviewer found one P2 stale-refresh race; mutation invalidation mode added. Test `refresh after a mutation waits for an older request, then fetches a fresh snapshot` observed RED -> GREEN. Final frontend suite 6/6, backend PostgreSQL suite 28/28, full browser scenario 1/1 (43.7 s). No other important findings reported.

Ruling: historical picked_up_at remains NULL because booking time is not evidence of collection time; historical financial reconciliation remains open in the status report. Cost: historical undated collections are excluded from new time-based aggregates until reconciled.

Ruling: backend and browser tools installed only in ignored .test-runtime for local PostgreSQL verification; browser runner is a frontend dev dependency for repeatable CI. No production database was used, no OS service installed, and temporary PostgreSQL was stopped after checks.

Remaining project work: see docs/REVIEW_FIXES_2026-10-19.md. This ledger closes the agreed first stage, not the full audit.
