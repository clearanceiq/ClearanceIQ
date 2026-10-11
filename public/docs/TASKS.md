# ClearanceIQ — Daily Ops Task State
# Last briefing: 2026-10-12 (cron daily advance +4d from 2026-10-08)

## Completed
- [x] Remove bot/ from site repo
- [x] Confirm bot/.env is not tracked in git history
- [x] Fix invalid 404 redirect status codes in _redirects files → 302
- [x] Wire PDPA consent banner into index.html
- [x] Wire chat widget into index.html
- [x] Enable chat widget composer / remove beta placeholders
- [x] Sync functions/ => public/functions/ for Pages deployment
- [x] Create privacy.html
- [x] Publish Day 1 blog post (11 Import Customs Mistakes)
- [x] Publish Day 2 blog post (When You Need A Customs Bond And How To Buy One)

## Pending Tasks
- [Pending 130d]Add TELEMETRY KV binding + associate to Pages Functions, then verify /api/telemetry GET
- [Pending 130d]Add D1 binding / run schema + redeploy telemetry path if switching to docs/ops/wrangler.toml
- [Pending 130d]Update _redirects or docs/ops/README redirect step if using standalone Worker
- [Pending 130d]Re-verify client-side tools (cbp hold decoder, supplier checklist) in browser
- [Pending 130d]Confirm telemetry tracking on tool pages after KV bind
- [Pending 130d]Add rate limiting headers to API responses
- [Pending 130d]Add Stripe keys
- [Pending 130d]Launch first Reddit post
- [Pending 136d]Resolve chat endpoint POST body parsing — returns "Error: Missing message" despite correct client payload
