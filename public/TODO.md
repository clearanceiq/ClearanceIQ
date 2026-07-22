# ClearanceIQ Ops Task List
# Age format: [Pending Xh] for <24h, [Pending Xd Xh] for >=24h, [Done] for completed.
# Last briefing: 2026-07-23 (cron daily advance +1d from 2026-07-20)

# | # | Task | Age | Status |
|- | - | - | - |
|1 | Verify `/api/chat` OPTIONS returns 204 with CORS headers | [Done] | closed |
|2 | Investigate `/api/auth` GET/OPTIONS behavior (302/405 patterns) | [Done] | closed |
|3 | Commit and push pending site changes: `index.html`, `public/index.html`, `public/scripts/.blog-topic-index` | [Done] | closed |
|4 | Review/safe-stage `package.json`, `package-lock.json`, `public/tests/setdata.json` | [Pending 22d 1h] | open |
|5 | Confirm `/api/admin`, `/api/internal`, `/admin` live hardening (404/302) | [Pending 27d 1h] | open |
|6 | Rotate exposed credentials + complete YouTube upload OAuth (blocked: credential rotation + one-time login) | [Pending 30d 1h] | blocked |
|7 | Persist telemetry/usage to D1; add TELEMETRY KV binding reads | [Done] | closed |
|8 | Wire Stripe checkout + activate Pro plan pricing (post-beta) | [Pending 27d 1h] | open |
|| 9 | Build `tools/cpsc-certificate.html` — mandatory CPSC eFiling certificate generator (deadline 2026-07-08 passed) | [Pending 0h] | open |
