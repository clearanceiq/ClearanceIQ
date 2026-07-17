# ClearanceIQ Daily Ops Brief — 2026-07-18

## Health Status
Last deploy: git push to main (dashboard telemetry tab + HTS email-capture nudge). Live probes blocked by Cloudflare bot challenge (403) — runtime NOT re-verified; confirm in browser. One untracked dir marketing/leads/.

## Task Table — OPEN items (16)
| # | Task | Age | Status |
|2|HTS tests fail (0/20)|[Pending 18d 0h]|open|
|5|CBP+Supplier integration tests|[Pending 18d 0h]|open|
|6|Admin paths 404 on live|[Pending 23d 0h]|open|
|9|Rename chat/referral routes|[Pending 25d 0h]|open|
|10|First Reddit/LinkedIn post|[Pending 25d 0h]|open|
|11|Stripe wiring deferred|[Pending 23d 0h]|open|
|12|Harden /api/admin & /internal 302|[Pending 17d 0h]|open|
|20|PHASE1 Reddit/FBA post|[Pending 10d 0h]|open|
|21|PHASE1 200 signed users|[Pending 10d 0h]|open|
|22|PHASE2 10 forwarder/3PL|[Pending 10d 0h]|open|
|23|PHASE2 wire Stripe + Pro|[Pending 10d 0h]|open|
|24|PHASE3 retention dashboard|[Pending 10d 0h]|open|
|26|Stripe keys unused; Buy Now placeholder|[Pending 9d 0h]|open|
|27|Wire Buy Now $29.99 revenue blocker|[Pending 9d 0h]|open|
|28|Ollama+anythingLLM PAUSED|[Pending 9d 0h]|open|
|29|Hetzner VPS bootstrap|[Pending 9d 0h]|open|

15 tasks Done (full list in ops/daily-tasks.md). TODO.md also +3d: 4 open incl. /api/admin hardening [Pending 19d 1h], rotate credentials + YouTube OAuth [blocked 22d 1h].

## PENDING SUMMARY
- <24h: 0
- 24-48h: 0
- 48-72h: 0
- >72h: 16

## OLDEST PENDING TASKS
1. Rename chat/referral routes — [Pending 25d 0h]
2. First Reddit/LinkedIn post — [Pending 25d 0h]
3. Admin paths 404 on live — [Pending 23d 0h]

## TIME SENSITIVE (>48h, escalate)
- Wire Buy Now (Import Kit $29.99) — [Pending 9d 0h] — ONLY revenue blocker; needs hosted-checkout URL on PC. Verified: Buy Now still fires coming-soon alert, stripe-checkout.html holds unconfigured test-key placeholder.
- First Reddit/LinkedIn post — [Pending 25d 0h] — traction gate; no organic posts live.
- Admin paths + /api/admin,/internal hardening — [Pending 23d / 17d] — residual security exposure.

## RECOMMENDED ACTIONS
1. [Execute] Paste Gumroad hosted-checkout URL into Buy Now (import-kit.html) — unblocks the only revenue path. Needs PC.
2. [Execute] Publish first Reddit/FBA acquisition post (90-day plan).
3. [Wait] Re-verify /api/admin + /internal hardening live once bot challenge clears.
