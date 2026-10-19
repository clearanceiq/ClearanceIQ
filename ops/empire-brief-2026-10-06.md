## Empire Brief — Oct 6, 2026

### 🔴 Blockers (revenue-critical or PC-required)
| Issue | Why | Owner |
|---|---|---|
| Stripe Buy Now $29.99 unconfigured | `checkout/index.js` requires CIQ_SK + CIQ_PRICE; keys added to CF Secrets but no function consumes them | Jimmy (PC: enter secrets) |
| Hetzner VPS bootstrap | Script fails: `VPS_IP is empty` in `.hetzner-vps.conf` — needs SSH from PC | Jimmy (PC) |
| Admin paths return 302 not 404 | `/api/admin`, `/internal` still redirect to SPA shell (security gap) | Dev |

### 🟡 Pending Tasks (top 5 open, with age)
| Task | Age | Project |
|---|---|---|
| Customer acquisition: first Reddit/LinkedIn post | 105d | Acquisition |
| Rename stray chat/referrals routes | 105d | Infra |
| Admin paths redirect to 404 on live | 103d | Infra |
| Stripe payment gateway wiring | 103d | Revenue |
| Wire Buy Now (Import Kit $29.99) | 89d | Revenue |

16 total pending, all >72h. Full list in `ops/daily-tasks.md`.

### 🟢 MD Findings

**Latest:** 6AM MD Daily Ops cron (`08b621fc60bf`, 2026-10-06_06-47-07.md)

- **Health:** Site healthy — homepage 200, HTS API 200, signup 200, chat OPTIONS 204. 16 tasks Done, 16 open. Ages advanced +1d from Oct 5.
- **Risks:** Stripe checkout still placeholder (env vars unconsumed by any function). `/tools/cpsc-certificate.html` still 404 — July 8 CPSC eFiling deadline missed. Admin paths still 302, not 404.
- **Actions:** [Execute] Wire Buy Now to Gumroad checkout URL (revenue path, needs PC). [Execute] Publish first Reddit/FBA acquisition post (copy ready in ACQUISITION-POSTS.md). [Execute] Build `tools/cpsc-certificate.html` (regulatory deadline passed).

### 📡 Other Depts
| Dept | Status |
|---|---|
| **Acquisition** | 4 post drafts ready (Reddit r/FBA, r/import, LinkedIn, X) in ACQUISITION-POSTS.md — NOT posted. Pending 105d. |
| **Revenue** | `checkout/index.js` needs CIQ_SK + CIQ_PRICE; added to CF Secrets but unconsumed. **Revenue blocker.** |
| **Content** | Weekly blog cron Mon/Wed 6AM. Last run (Oct 5) FAILED — Python `WinError 6` (invalid handle). Next: Wed Oct 7. 16 posts live in `/blog/`, no drafts found. |
| **Telemetry** | `/api/telemetry/report` → 404 live (HTML). `?view=report&limit=50` returns ingest ack only. Known issue — use raw `/api/telemetry` event stream. |

### ✅ Today's 3 priorities
1. **Wire Buy Now** — paste Gumroad checkout URL into `import-kit.html` button (Jimmy, PC)
2. **Publish acquisition post** — post Reddit r/FBA + r/import from ready copy (Jimmy)
3. **Build CPSC certificate tool** — `tools/cpsc-certificate.html` (dev; deadline missed)
