# ClearanceIQ Daily Ops Brief — 2026-07-15

**Health:** Live probes blocked by CF bot challenge (403); relying on code reconciliation. Stripe backend now in repo (`/api/checkout`, `/api/stripe-webhook`; commits 461952e, 5a4142d, 4e19312) but `import-kit.html` Buy Now still `alert('coming soon')` and `stripe-checkout.html` still `pk_test_YOUR_KEY_HERE` — so Stripe/Buy Now tasks stay open (not falsely stale). 4 commits since 07-14; WIP `functions/`+`_redirects` undeployed.

**Tasks (31):** 15 Done, 16 open.

| # | Task | Age | Status |
|- | - | - | - |
|1 | CORS/lockdown live | [Done] | closed |
|2 | HTS tests failing 0/20 | [Pending 15d 0h] | open |
|3 | API signup 405 | [Done] | closed |
|4 | Usage/auth gaps | [Done] | closed |
|5 | CBP/Supplier tests | [Pending 15d 0h] | open |
|6 | Admin 404 hardening | [Pending 20d 0h] | open |
|7 | Deploy/public sync | [Done] | closed |
|8 | Telemetry to D1 | [Done] | closed |
|9 | Rename stray routes | [Pending 22d 0h] | open |
|10 | First Reddit/LinkedIn post | [Pending 22d 0h] | open |
|11 | Stripe wiring deferred | [Pending 20d 0h] | open |
|12 | /api/admin 302 fix | [Pending 14d 0h] | open |
|13 | Tool routes 308→200 | [Done] | closed |
|14 | Rate-limit cap | [Done] | closed |
|15 | Sign-up prompt+gated | [Done] | closed |
|16 | Trust page (About) | [Done] | closed |
|17 | Nav to /about.html | [Done] | closed |
|18 | 90-DAY-PLAN.md | [Done] | closed |
|19 | PHASE1 saved history | [Done] | closed |
|20 | PHASE1 3 posts | [Pending 7d 0h] | open |
|21 | PHASE1 200 users | [Pending 7d 0h] | open |
|22 | PHASE2 10 3PL talks | [Pending 7d 0h] | open |
|23 | PHASE2 Stripe+Pro | [Pending 7d 0h] | open |
|24 | PHASE3 retention dash | [Pending 7d 0h] | open |
|25 | KasiSetel removed | [Done] | closed |
|26 | Stripe keys unused | [Pending 6d 0h] | open |
|27 | Wire Buy Now (revenue) | [Pending 6d 0h] | open |
|28 | Ollama infra PAUSED | [Pending 6d 0h] | open |
|29 | Hetzner bootstrap | [Pending 6d 0h] | open |
|30 | 7AM Brief repurposed | [Done] | closed |
|31 | OneDrive cleanup | [Done] | closed |

**PENDING SUMMARY:** <24h: 0 · 24-48h: 0 · 48-72h: 0 · >72h: 16

**OLDEST PENDING TASKS:** (1) Rename stray routes 22d (#9) (2) First Reddit/LinkedIn post 22d (#10) (3) Admin 404 / Stripe defer 20d (#6, #11)

**TIME SENSITIVE:** All 16 open exceed 48h. Escalate: Wire Buy Now (#27, 6d, revenue blocker); rename stray routes + /api/admin 404 (#9, #6, 20-22d security); first acquisition post (#10, 22d growth).

**ACTIONS:** 1 [Execute] Connect Buy Now → /api/checkout; fix stripe-checkout.html key. 2 [Execute] Commit+push Stripe WIP; purge CF cache. 3 [Wait] Resolve 20d+ security items pending dashboard access.
