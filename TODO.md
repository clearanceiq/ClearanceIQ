# ClearanceIQ Ops Task List
# Age format: [Pending Xh] for <24h, [Pending Xd Xh] for >=24h, [Done] for completed.
# Ages increment by 24h each unchanged day. New items start at [Pending 0h].
# Last briefing: 2026-07-07

# | # | Task | Age | Status |
|- | - | - | - |
1 | Verify `/api/chat` OPTIONS returns 204 with CORS headers | [Pending 6d 1h] | open
2 | Investigate `/api/auth` GET/OPTIONS behavior (302/405 patterns) | [Pending 6d 1h] | open
3 | Commit and push pending site changes: `index.html`, `public/index.html`, `public/scripts/.blog-topic-index` | [Pending 6d 1h] | open
4 | Review/safe-stage `package.json`, `package-lock.json`, `public/tests/setdata.json` | [Pending 6d 1h] | open
5 | Confirm `/api/admin`, `/api/internal`, `/admin` live hardening (404/302) | [Pending 11d 1h] | open
6 | Rotate exposed credentials + complete YouTube upload OAuth (blocked: credential rotation + one-time login) | [Pending 14d 1h] | open
7 | Persist telemetry/usage to D1; add TELEMETRY KV binding reads | [Pending 14d 1h] | open
8 | Wire Stripe checkout + activate Pro plan pricing (post-beta) | [Pending 11d 1h] | open
