Done: Homepage + /api/v1/hts healthy (200 OK). 15 tasks closed. Action required: 17 open items — CPSC tool past-due, Buy Now not wired, admin paths broken.

# ClearanceIQ Daily Ops Brief — 2026-07-28

| Task | Age | Status |
|------|-----|--------|
| HTS lookup functional tests failing (0/20) | [Pending 28d] | open |
| Integration tests for CBP Decoder + Supplier Checklist | [Pending 28d] | open |
| Admin paths redirect to 404 on live | [Pending 33d] | open |
| Rename stray chat/referrals routes per Pages quirk | [Pending 35d] | open |
| Customer acquisition: first Reddit/LinkedIn post | [Pending 35d] | open |
| Stripe/payment gateway wiring deferred post-beta | [Pending 33d] | open |
| Live hardening: /api/admin + /internal still redirect 302 | [Pending 27d] | open |
| PHASE 1: first acquisition posts (Reddit/FBA) 3 posts | [Pending 20d] | open |
| PHASE 1: reach 200 signed users, measure 7-day return | [Pending 20d] | open |
| PHASE 2: 10 forwarder/3PL white-label conversations | [Pending 20d] | open |
| PHASE 2: wire Stripe + Pro IF return-rate justifies | [Pending 20d] | open |
| PHASE 3: retention dashboard (signup->Pro) | [Pending 20d] | open |
| Stripe keys added but NOT consumed — Buy Now still placeholder | [Pending 19d] | open |
| Wire Buy Now to Gumroad/Stripe — ONLY revenue blocker | [Pending 19d] | open |
| Ollama + anythingLLM infra (Hetzner VPS) — PAUSED | [Pending 19d] | open |
| Hetzner VPS bootstrap — needs SSH from PC, cannot run from mobile | [Pending 19d] | open |
| Build `tools/cpsc-certificate.html` — mandatory CPSC eFiling tool | [Pending 0h] | open |

22 tasks Done — full list in `ops/daily-tasks.md`

## Health Status
- Homepage: 200 OK
- /api/v1/hts: 200 OK
- /api/admin: 302 (still broken per task list)
- /api/usage: 400 without key (expected)

## PENDING SUMMARY
- <24h: 1
- 24-48h: 0
- 48-72h: 0
- >72h: 16

## OLDEST PENDING TASKS
1. Rename stray chat/referrals routes per Pages quirk — [Pending 35d]
2. Customer acquisition: first Reddit/LinkedIn post — [Pending 35d]
3. Admin paths redirect to 404 on live — [Pending 33d]

## TIME SENSITIVE
- Rename stray chat/referrals routes per Pages quirk — 30d, recurring routing issue
- Customer acquisition: first Reddit/LinkedIn post — 30d, no content published
- Build `tools/cpsc-certificate.html` — CPSC deadline 2026-07-08 already passed, legal risk

## RECOMMENDED ACTIONS
1. [Execute] Wire Buy Now to Gumroad today — unblocks first-dollar revenue.
2. [Execute] Build CPSC certificate tool — statutory deadline missed, ABI compliance risk.
3. [Execute] Rotate exposed credentials + complete YouTube OAuth — security posture gap.
