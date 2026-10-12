# ClearanceIQ Daily Ops Brief — 2026-10-13

Ages advanced +1d from 2026-10-12 (daily cron). Live probes: homepage 200, HTS/API 200, tools 200, pricing 200, chat OPTIONS 204. **`/api/admin`→302 (not 404); `/api/usage/status`→404; `/api/chat` + `/api/history` leak `*`.** `tools/cpsc-certificate.html` not on disk (404). No completions since Oct 12.

## Task Table — OPEN (17)

| # | Task | Age | Status |
|---|---|---|---|
| 1 | Verify CORS lockdown on API routes | [Pending 1d] | open |
| 2 | Fix CBP Decoder + Supplier integration tests | [Pending 105d] | open |
| 3 | Admin paths → 404 not 302 | [Pending 110d] | open |
| 4 | Rename stray chat/referrals routes | [Pending 112d] | open |
| 5 | First acquisition post Reddit/LinkedIn | [Pending 112d] | open |
| 6 | Stripe gateway wiring deferred | [Pending 110d] | open |
| 7 | Harden /api/admin 302 | [Pending 104d] | open |
| 8 | Phase 1: Reddit/FBA posts | [Pending 97d] | open |
| 9 | Phase 1: 200 signed users | [Pending 97d] | open |
| 10 | Phase 2: forwarder/3PL talks | [Pending 97d] | open |
| 11 | Phase 2: wire Stripe Pro | [Pending 97d] | open |
| 12 | Phase 3: retention dashboard | [Pending 97d] | open |
| 13 | Stripe keys unused / Buy Now placeholder | [Pending 96d] | open |
| 14 | Wire Buy Now Import Kit $29.99 | [Pending 96d] | open |
| 15 | Ollama + anythingLLM infra | [Pending 96d] | open |
| 16 | Hetzner VPS bootstrap | [Pending 96d] | open |
| 17 | Build tools/cpsc-certificate.html | [Pending 71d] | open |

15 tasks Done — full list in ops/daily-tasks.md

## Health Status
Homepage 200, HTS/duty-calc 200, tools 200, pricing 200, chat 204. Failures: `/api/admin`→302 not 404; `/api/usage/status`→404; `/api/chat`+`/api/history` leak `*`. cpsc-certificate.html 404. No deploy since Oct 12.

## PENDING SUMMARY
- <24h: 0
- 24-48h: 1
- 48-72h: 0
- >72h: 16

## OLDEST PENDING TASKS
1. [Pending 112d] Rename stray chat/referrals routes (2026-06-23)
2. [Pending 112d] First acquisition post Reddit/LinkedIn (2026-06-23)
3. [Pending 110d] Admin paths → 404 not 302 (2026-06-25)

## TIME SENSITIVE (>48h)
16 of 17 pending exceed 48h (min age 71d). Top escalations:
- [Pending 112d] Rename stray chat/referrals routes
- [Pending 112d] First acquisition post Reddit/LinkedIn
- [Pending 110d] Admin paths 404 / Stripe gateway wiring

## RECOMMENDED ACTIONS
1. [Execute] Wire Buy Now (Import Kit $29.99) to Gumroad checkout URL — only revenue path.
2. [Execute] Fix 2 CORS leaks (`/api/chat`, `/api/history`) — drop `*` → `https://clearance-iq.com`.
3. [Wait] Build `tools/cpsc-certificate.html` — mandatory CPSC eFiling, deadline passed.
