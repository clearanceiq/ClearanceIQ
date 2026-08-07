# Daily Ops Brief — 2026-08-06 (ClearanceIQ MD)

## Task Table (open items — 17 of 32 total)

| # | Task | Age | Status |
|---|------|-----|--------|
| 1 | HTS lookup functional tests failing (0/20) | [Pending 37d] | open |
| 2 | CBP Decoder + Supplier Checklist integration tests | [Pending 37d] | open |
| 3 | Admin paths redirect to 404 on live | [Pending 42d] | open |
| 4 | Rename stray chat/referrals routes per Pages quirk | [Pending 44d] | open |
| 5 | Customer acquisition: first Reddit/LinkedIn post | [Pending 44d] | open |
| 6 | Stripe/payment gateway wiring deferred post-beta audit | [Pending 42d] | open |
| 7 | Live hardening: /api/admin and /internal still 302 | [Pending 36d] | open |
| 8 | PHASE 1: first acquisition posts (Reddit/FBA) 3 posts | [Pending 29d] | open |
| 9 | PHASE 1: reach 200 signed users, measure 7-day return | [Pending 29d] | open |
| 10 | PHASE 2: 10 forwarder/3PL white-label convos | [Pending 29d] | open |
| 11 | PHASE 2: wire Stripe + live Pro tier | [Pending 29d] | open |
| 12 | PHASE 3: retention dashboard (signup->return->Pro) | [Pending 29d] | open |
| 13 | Stripe keys in CF Secrets unused; Buy Now placeholder alert | [Pending 28d] | open |
| 14 | Wire Buy Now ($29.99 Import Kit) to Gumroad/Stripe Checkout | [Pending 28d] | open |
| 15 | Ollama + anythingLLM on Hetzner VPS — PAUSED | [Pending 28d] | open |
| 16 | Hetzner VPS bootstrap — needs SSH from PC | [Pending 28d] | open |
| 17 | Build tools/cpsc-certificate.html — CPSC eFiling tool | [Pending 3d] | open |

15 tasks Done — full list in `ops/daily-tasks.md`

## Health Status
- Homepage: 200 OK
- `/api/v1/hts`: 200 OK
- `/api/admin`: 302 (hardening pending)
- `/api/usage`: 400 without key (expected)

## PENDING SUMMARY
- <24h: 0
- 24-48h: 0
- 48-72h: 0
- >72h: 17

## OLDEST PENDING TASKS
1. Rename stray chat/referrals routes per Pages quirk — [Pending 44d]
2. Customer acquisition: first Reddit/LinkedIn post — [Pending 44d]
3. Admin paths redirect to 404 on live — [Pending 42d]

## TIME SENSITIVE
- Rename stray chat/referrals routes — 44d, recurring routing issue
- Customer acquisition: first Reddit/LinkedIn post — 44d, no organic posts live
- Build tools/cpsc-certificate.html — deadline 2026-07-08 passed, compliance risk
- Wire Buy Now ($29.99 Import Kit) to Gumroad/Stripe — 28d, only revenue blocker
- Rotate exposed credentials + complete YouTube OAuth — 44d, security posture gap

## RECOMMENDED ACTIONS
1. [Execute] Wire Buy Now to Gumroad today — only revenue blocker.
2. [Execute] Build CPSC eFiling tool — statutory deadline missed, compliance risk.
3. [Execute] Rotate exposed credentials + YouTube OAuth — security posture gap.
