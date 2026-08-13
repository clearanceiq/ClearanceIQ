# ClearanceIQ Daily Ops Brief — 2026-08-14

**Ages are from the last cron advance and may mask completed work.**

## Task Table

| # | Task | Age | Status |
|---|-------|-----|--------|
| 1 | HTS lookup functional tests failing (0/20) | [Pending 45d] | open |
| 2 | Integration tests for CBP Decoder + Supplier Checklist | [Pending 45d] | open |
| 3 | Admin paths redirect to 404 on live | [Pending 50d] | open |
| 4 | Rename stray chat/referrals routes per Pages quirk | [Pending 52d] | open |
| 5 | Customer acquisition: first Reddit/LinkedIn post | [Pending 52d] | open |
| 6 | Stripe/payment gateway wiring deferred post-beta | [Pending 50d] | open |
| 7 | Live hardening: /api/admin and /internal still 302 | [Pending 44d] | open |
| 8 | PHASE 1: first acquisition post (Reddit/FBA) 3 posts | [Pending 37d] | open |
| 9 | PHASE 1: reach 200 signed users, measure 7-day return | [Pending 37d] | open |
| 10 | PHASE 2: 10 forwarder/3PL white-label conversations | [Pending 37d] | open |
| 11 | PHASE 2: wire Stripe + real Pro IF return-rate justifies | [Pending 37d] | open |
| 12 | PHASE 3: retention dashboard (signup->return->Pro) | [Pending 37d] | open |
| 13 | Stripe keys in CF Secrets not consumed — Buy Now placeholder | [Pending 36d] | open |
| 14 | Wire Buy Now (Import Kit $29.99) to Gumroad/Stripe | [Pending 36d] | open |
| 15 | Ollama + anythingLLM infra (Hetzner VPS) — PAUSED | [Pending 36d] | open |
| 16 | Hetzner VPS bootstrap — needs SSH from PC | [Pending 36d] | open |
| 17 | Build `tools/cpsc-certificate.html` (CPSC eFiling deadline passed) | [Pending 11d] | open |

18 open — 15 Done — full list in `ops/daily-tasks.md`

## Health Status
- No uncommitted changes. Live endpoint probes blocked by bot-challenge 403.

## PENDING SUMMARY
- <24h: 0
- 24-48h: 0
- 48-72h: 0
- >72h: 18

## OLDEST PENDING TASKS
1. Customer acquisition: first Reddit/LinkedIn post [Pending 52d]
2. Rename stray chat/referrals routes [Pending 52d]
3. Admin paths redirect to 404 on live [Pending 50d]
(Stripe/payment gateway wiring deferred post-beta audit also 50d)

## TIME SENSITIVE
- Wire Buy Now (Import Kit $29.99) to Gumroad/Stripe [Pending 36d] — revenue blocker
- Stripe/payment gateway wiring deferred post-beta audit [Pending 50d]
- Customer acquisition: first Reddit/LinkedIn post [Pending 52d]
- PHASE 1: first acquisition post (Reddit/FBA) 3 posts [Pending 37d]
- PHASE 1: reach 200 signed users, measure 7-day return [Pending 37d]

## RECOMMENDED ACTIONS
1. Wire Buy Now button to Gumroad checkout URL to unblock revenue
2. Execute first acquisition post on Reddit/FBA to start traction
3. Resolve HTS lookup functional tests (0/20 failing) before onboarding more users
