# ClearanceIQ Daily Ops Brief — 2026-10-16

Ages advanced +2d from 2026-10-14 (catch-up; Oct 15 cron missed). Live probes: homepage/tools/pricing/HTS all 200. See Health Status.

## Task Table — OPEN (17)

| # | Task | Age | Status |
|---|---|---|---|
| 1 | Verify CORS lockdown on API routes | [Pending 4d] | open |
| 2 | Fix CBP Decoder + Supplier integration tests | [Pending 108d] | open |
| 3 | Admin paths → 404 not 302 | [Pending 113d] | open |
| 4 | Rename stray chat/referrals routes | [Pending 115d] | open |
| 5 | First acquisition post Reddit/LinkedIn | [Pending 115d] | open |
| 6 | Stripe gateway wiring deferred | [Pending 113d] | open |
| 7 | Harden /api/admin + /internal (302) | [Pending 107d] | open |
| 8 | Phase 1: Reddit/FBA acquisition posts | [Pending 100d] | open |
| 9 | Phase 1: reach 200 signed users | [Pending 100d] | open |
| 10 | Phase 2: 10 forwarder/3PL talks | [Pending 100d] | open |
| 11 | Phase 2: wire Stripe Pro | [Pending 100d] | open |
| 12 | Phase 3: retention dashboard | [Pending 100d] | open |
| 13 | Stripe keys unused / Buy Now placeholder | [Pending 99d] | open |
| 14 | Wire Buy Now Import Kit $29.99 | [Pending 99d] | open |
| 15 | Ollama + anythingLLM infra | [Pending 99d] | open |
| 16 | Hetzner VPS bootstrap | [Pending 99d] | open |
| 17 | Build tools/cpsc-certificate.html | [Pending 74d] | open |

15 tasks Done — full list in ops/daily-tasks.md

## Health Status
Homepage 200, tools 200, pricing 200, HTS/duty 200. Chat OPTIONS 204. Improvement: `/api/chat` GET CORS now locked to origin (was `*`). Still failing: `/api/history` GET leaks `*`, `/api/chat` OPTIONS leaks `*`, `/api/admin`→302 not 404, `/api/usage/status`→404, `tools/cpsc-certificate.html`→404.

## PENDING SUMMARY
- <24h: 0
- 24-48h: 0
- 48-72h: 0
- >72h: 17

## OLDEST PENDING TASKS
1. [Pending 115d] Rename stray chat/referrals routes (2026-06-23)
2. [Pending 115d] First acquisition post Reddit/LinkedIn (2026-06-23)
3. [Pending 113d] Admin paths → 404 (2026-06-25)

## TIME SENSITIVE (>48h)
All 17 pending exceed 48h. Top escalations:
- [Pending 115d] Rename stray chat/referrals routes
- [Pending 115d] First acquisition post (no content published)
- [Pending 113d] Admin paths 404 / Stripe gateway wiring

## RECOMMENDED ACTIONS
1. [Execute] Wire Buy Now (Import Kit $29.99) to Gumroad checkout URL — only revenue path.
2. [Execute] Fix CORS leaks on /api/history GET + /api/chat OPTIONS — drop `*` → `https://clearance-iq.com`.
3. [Wait] Build tools/cpsc-certificate.html — mandatory CPSC eFiling, deadline passed.
