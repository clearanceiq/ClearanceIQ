# ClearanceIQ Full QA Report
**Generated:** 2026-06-23T15:59:43.054426+00:00
**Live URL:** https://clearanceiq.pages.dev
**Repo:** C:\Users\Najmi\Documents\Tycoon\site

## Summary
| Category | Total | Pass | Fail | Pass Rate |
| --- | --- | --- | --- | --- |
| functional_tests | 36 | 13 | 23 | 36.11% |
| edge_case_tests | 9 | 7 | 2 | 77.78% |
| Security CORS | - | FAIL | - | - |
| Deployment (Pages) | - | FAIL | - | - |

## Test Data Files Generated
| File | Records |
| --- | --- |
| hts_test_data.json | 3000 |
| duty_calc_test_data.json | 3000 |
| bond_test_data.json | 3000 |
| hold_decoder_test_data.json | 3000 |
| supplier_checklist_test_data.json | 3000 |
| lead_test_data.json | 3000 |

## Functional Tests
### HTS Lookup
- Pass: 0 / 20
- Samples:
  - `speaker` => status 400 ok=False
  - `headphone` => status 400 ok=False
  - `smartphone` => status 400 ok=False
  - `t-shirt` => status 400 ok=False
  - `jeans` => status 400 ok=False

### Duty Calculator
- Pass: 5 / 5
  - params={'value': 5000, 'hts': '6109', 'freight': 500, 's301Rate': '0.25'} status=200 ok=True
  - params={'value': 25000, 'hts': '6203', 'freight': 1200, 's301Rate': '0'} status=200 ok=True
  - params={'value': 100000, 'hts': '6402', 'freight': 2500, 's301Rate': '0.075'} status=200 ok=True
  - params={'value': 15000, 'hts': '8518', 'freight': 0, 's301Rate': 'other'} status=200 ok=True
  - params={'value': 75000, 'hts': '3926', 'freight': 5000, 's301Rate': '0.15'} status=200 ok=True

### Bond Estimator
- Pass: 5 / 5
  - params={'type': 'single', 'value': 50000, 'risk': 1.5} status=200 ok=True
  - params={'type': 'continuous', 'value': 75000, 'risk': 2.0} status=200 ok=True
  - params={'type': 'single', 'value': 200000, 'risk': 1.0} status=200 ok=True
  - params={'type': 'continuous', 'value': 1000000, 'risk': 2.5} status=200 ok=True
  - params={'type': 'single', 'value': 10000, 'risk': 0.8} status=200 ok=True

### Lead Capture
- Pass: 3 / 3
  - body={'email': 'qa1@example.com', 'name': 'QA One', 'source': 'qa'} status=200 ok=True
  - body={'email': 'qa2@example.com', 'name': '', 'source': 'api', 'topic': 'bond'} status=200 ok=True
  - body={'email': 'bad-email', 'name': 'Bad'} status=400 ok=True

### API Key Signup
- Pass: 0 / 3
  - email=qa.signup@example.com status=405 ok=False
  - email=invalid status=405 ok=False
  - email=qa.signup@example.com status=405 ok=False

### Referral Codes
- Skipped (no API key)

### Usage Tracking
- Pass: 0

### Client-Side Tools
- cbp_hold_decoder: ok=False status=0
- supplier_checklist: ok=False status=0
- hts_lookup: ok=False status=0
- duty_calculator: ok=False status=0
- bond_estimator: ok=False status=0

## Security Audit
### CORS Headers
- Overall OK: False
  - GET /api/v1/hts: origin header present, WILDCARD (issue)
  - GET /api/v1/duty-calc: origin header present, WILDCARD (issue)
  - GET /api/v1/bond: origin header present, WILDCARD (issue)
  - POST /api/auth: origin header present, WILDCARD (issue)
  - POST /api/lead: specific origin
  - GET /api/usage: origin header present, WILDCARD (issue)
  - POST /api/referrals/generate: origin header present, WILDCARD (issue)

### Authentication / Authorization
- GET /api/auth public info: True
- POST /api/auth missing email: False
- Referral invalid key rejected: False

### Admin Endpoint Exposure
- Exposed admin paths: 8
  - /admin => status 200
  - /admin/ => status 200
  - /api/admin => status 200
  - /api/admin/keys => status 200
  - /internal => status 200
  - /api/internal => status 200
  - /api/keys => status 200
  - /api/keys/list => status 200

### Rate Limiting
- Response codes observed: [200, 200, 200, 200, 200, 200, 200, 200]
- Rate limiting enforced (429 seen): False

## Documentation Completeness
- README.md: MISSING
- README: MISSING
- CONTRIBUTING.md: MISSING
- SECURITY.md: MISSING
- CHANGELOG.md: MISSING
- HISTORY.md: MISSING
- api-pricing.html: Present
- developers.html: Present
- contact.html: Present
- sitemap.xml: Present
- robots.txt: Present
- launch_materials: 9 items
- _headers: Present
- _redirects: Present
- api_endpoints_documented:
  - /api/v1/hts: HTS lookup described in developers.html
  - /api/v1/duty-calc: Duty calculator described in developers.html
  - /api/v1/bond: Bond estimator described in developers.html
  - /api/auth: API key signup described in developers.html
  - /api/lead: Lead capture form on homepage
  - /api/usage: Usage tracking in developers.html
  - /api/referrals: Referral system in referral.mjs
  - /api/telemetry: Telemetry used by client-side tools

## Performance
### Static Pages (3-sample average)
| Path | Avg Time (s) | Size (bytes) |
| --- | --- | --- |
| / | 1.0583 | None |
| /tools/hts-lookup.html | 0.2079 | 0 |
| /tools/duty-calculator.html | 0.6044 | 0 |
| /tools/bond-estimator.html | 0.6659 | 0 |
| /tools/cbp-hold-decoder.html | 0.4634 | 0 |
| /tools/supplier-checklist.html | 0.2969 | 0 |
| /api-pricing.html | 0.81 | 0 |
| /developers.html | 1.1002 | None |

### Burst API (10 duty requests)
- All succeeded: True
- Per-value times:
  - value=1000 time=0.2857s ok=True
  - value=5000 time=0.2765s ok=True
  - value=10000 time=0.3537s ok=True
  - value=25000 time=0.5148s ok=True
  - value=50000 time=1.7978s ok=True
  - value=75000 time=3.5395s ok=True
  - value=100000 time=1.2444s ok=True
  - value=150000 time=1.7049s ok=True
  - value=200000 time=2.6038s ok=True
  - value=250000 time=1.4193s ok=True

## Edge Cases
| Test | Result |
| --- | --- |
| hts_empty | PASS |
| hts_long | PASS |
| duty_negative | PASS |
| duty_huge | PASS |
| bond_zero | PASS |
| bond_negative | PASS |
| lead_missing_email | PASS |
| auth_invalid_verify | FAIL |
| cors_preflight | FAIL |

## Deployment Verification
| Page | HTTP Status |
| --- | --- |
| / | 200 |
| /tools/hts-lookup.html | 308 |
| /tools/duty-calculator.html | 308 |
| /tools/bond-estimator.html | 308 |
| /tools/cbp-hold-decoder.html | 308 |
| /tools/supplier-checklist.html | 308 |
| /api-pricing.html | 308 |
| /developers.html | 200 |
- All pages 200: False

## Issues Found
- CORS headers not correctly configured on one or more endpoints
- Some static pages did not return HTTP 200
- HTS lookup failed for "speaker"
- Rate limiting not observed in test sequence (may be expected on cold Functions instance)

## Recommendations
1. Replace in-memory rate limit fallback with proper KV for production.
2. Add integration tests for CBP Hold Decoder and Supplier Checklist client-side logic.
3. Expand HTS data coverage with more textile, electronics, and industrial categories.
4. Add input sanitization and length limits on all query parameters.
5. Ensure `X-API-Key` header is logged out in client-side code; referrer emails are masked.
6. Add CI/CD tests that run against deployed Pages functions.
