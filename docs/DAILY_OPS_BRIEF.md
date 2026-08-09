# Daily Ops Brief — 2026-08-10 (ClearanceIQ MD)

## Task Table (open items — 17 of 32 total)

| # | Task | Age | Status |
|---|------|-----|--------|
| 1 | HTS lookup tests failing (0/20) | [Pending 41d] | open |
| 2 | CBP Decoder + Supplier Checklist integration tests | [Pending 41d] | open |
| 3 | Admin paths redirect to 404 on live | [Pending 46d] | open |
| 4 | Rename stray chat/referrals routes per Pages quirk | [Pending 48d] | open |
| 5 | Customer acquisition: first Reddit/LinkedIn post | [Pending 48d] | open |
| 6 | Stripe/payment gateway wiring deferred post-beta audit | [Pending 46d] | open |
| 7 | Live hardening: /api/admin and /internal still redirect 302 | [Pending 40d] | open |
| 8 | PHASE 1: first acquisition posts (Reddit/FBA) 3 posts | [Pending 33d] | open |
| 9 | PHASE 1: reach 200 signed users, measure 7-day return | [Pending 33d] | open |
| 10 | PHASE 2: 10 forwarder/3PL white-label conversations | [Pending 33d] | open |
| 11 | PHASE 2: wire Stripe + live Pro tier | [Pending 33d] | open |
| 12 | PHASE 3: retention dashboard (signup->return->Pro) | [Pending 33d] | open |
| 13 | Stripe keys unused; Buy Now placeholder alert | [Pending 32d] | open |
| 14 | Wire Buy Now ($29.99 Import Kit) to Gumroad/Stripe | [Pending 32d] | open |
| 15 | Ollama + anythingLLM on Hetzner VPS — PAUSED | [Pending 32d] | open |
| 16 | Hetzner VPS bootstrap — needs SSH from PC | [Pending 32d] | open |
| 17 | Build tools/cpsc-certificate.html — CPSC eFiling tool | [Pending 7d] | open |

15 tasks Done — full list in `ops/daily-tasks.md`

## Health Status
- Homepage: 200 OK
- `/api/v1/hts`: 200 OK
- `/api/admin`: 302 redirect (hardening pending)
- Buy Now: placeholder alert (verified)
- CPSC tool: missing from repo (verified)

## PENDING SUMMARY
- <24h: 0
- 24-48h: 0
- 48-72h: 0
- >72h: 17

## OLDEST PENDING TASKS
1. Rename stray chat/referrals routes per Pages quirk — [Pending 48d]
2. Customer acquisition: first Reddit/LinkedIn post — [Pending 48d]
3. Admin paths redirect to 404 on live — [Pending 46d]

## TIME SENSITIVE
- Rename stray chat/referrals routes — 48d, routing issue
- Customer acquisition: first Reddit/LinkedIn post — 48d, no posts live
- Admin paths redirect to 404 on live — 46d, security hardening pending
- Wire Buy Now ($29.99 Import Kit) to Gumroad/Stripe — 32d, revenue blocker
- Build tools/cpsc-certificate.html — 7d, deadline passed, compliance risk
- Rotate exposed credentials + YouTube OAuth — 48d, security gap

## RECOMMENDED ACTIONS
1. [Execute] Wire Buy Now to Gumroad — only revenue blocker.
2. [Execute] Build CPSC eFiling tool — deadline missed, compliance risk.
3. [Execute] Rotate exposed credentials + YouTube OAuth — security gap.
