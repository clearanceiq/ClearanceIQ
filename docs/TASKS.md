# ClearanceIQ — Daily Ops Task State
**Last updated:** 2026-06-30

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
- [Pending 2d] Add TELEMETRY KV binding + associate to Pages Functions, then verify /api/telemetry GET
- [Pending 2d] Add D1 binding / run schema + redeploy telemetry path if switching to docs/ops/wrangler.toml
- [Pending 2d] Update _redirects or docs/ops/README redirect step if using standalone Worker
- [Pending 2d] Re-verify client-side tools (cbp hold decoder, supplier checklist) in browser
- [Pending 2d] Confirm telemetry tracking on tool pages after KV bind
- [Pending 2d] Add rate limiting headers to API responses
- [Pending 2d] Add Stripe keys
- [Pending 2d] Launch first Reddit post
- [Pending 0d] Resolve chat endpoint POST body parsing — returns "Error: Missing message" despite correct client payload
