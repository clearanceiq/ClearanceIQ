## Empire Brief — Thu, Oct 15, 2026

### 🔴 Blockers (revenue-critical or PC-required)
| Issue | Detail |
|---|---|
| **Buy Now dead** | `/api/checkout` → 500 `stripe_not_configured`. CIQ_SK/CIQ_PRICE missing from CF env. `stripe-checkout.html` still holds placeholder publishable key. **PC-only:** CF secret entry + wiring. |
| **Hetzner VPS** | 7AM setup cron **FAILED** again — VPS_IP empty (streak 56). **PC-only:** SSH bootstrap. |
| **Price mismatch** | import-kit.html shows $19.99; checkout API targets $29.99. Buy Now hits broken Stripe flow. |

### 🟡 Pending Tasks (top 5 open, with age)
Ages as-of Oct 14 (today's 6AM MD cron timed out — not advanced). 17 open · 15 done · no completions since Oct 12. Full list: `ops/daily-tasks.md`.
| # | Task | Age |
|---|---|---|
| 1 | Rename stray chat/referrals routes | 113d |
| 2 | First acquisition post Reddit/LinkedIn | 113d |
| 3 | Admin paths → 404 (currently 302) | 111d |
| 4 | Stripe payment gateway wiring deferred | 111d |
| 5 | Harden /api/admin + /internal (302) | 105d |

### 🟢 MD Findings
Latest MD brief = Oct 14 (today's 6AM cron **FAILED** — timeout 154s).
- **Health:** Homepage / tools / pricing / HTS = 200; chat OPTIONS = 204. No new completions.
- **Risks:** CORS `*` leak on `/api/chat` + `/api/history`; `/api/usage/status`→404; `tools/cpsc-certificate.html`→404 (72d overdue); `/api/admin`→302 not 404.
- **Actions:** Wire Buy Now checkout URL; fix CORS `*` → locked to `clearance-iq.com`; build CPSC tool.

### 📡 Other Depts (acquisition / content / telemetry)
- **Acquisition:** 4 posts ready in `ACQUISITION-POSTS.md`, **0 posted** (113d). Start with r/import (r/FBA bans link-drops).
- **Revenue:** Checkout API → 500 (env unconfigured). Price mismatch $19.99 vs $29.99.
- **Content:** Last blog Sept 28. weekly-blog-draft **FAILED** Wed Oct 14 (rate-limit 429, streak 5). weekly-blog-generation failed Oct 12 (stdin error). Next: Mon Oct 19.
- **Telemetry:** `/api/telemetry?view=report` returns generic ack (no aggregated data). `/api/telemetry/report`→404. Top tools / anomalies unavailable.

### ✅ Today's 3 priorities
1. **Wire Buy Now** → checkout URL + fix $19.99/$29.99 mismatch (PC for CF secrets)
2. **Fix CORS `*` leaks** on `/api/chat` + `/api/history` → lock to `https://clearance-iq.com`
3. **Post first acquisition** — r/import, value-first framing
