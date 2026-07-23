# ClearanceIQ — Outreach / Campaign Pipeline

## Active Sources
| Source | Status | Count | Next refresh |
|---|---|---|---|
| Shopify 'best stores' listicles | Active batch | 100 | Need fresh leads |
| Reddit threads | Manual only (importjimmy) | 5 replies drafted | User posts |
| Blog organic | Ongoing | 9 live posts | Weekly |

## Outbox State
- Approved sender: `marketing/send_outreach.py`
- Brevo key: `marketing/.brevo_key`
- Unsub list: `marketing/leads/unsubscribed.csv`
- Current sent log: batch exhausted at 100 sent / 0 pending

## Approval Gate
New sends require an approved fresh lead source. Do not reuse the exhausted 100.
Suggested next sources:
- Etsy/Shipbob seller scraping
- Amazon FBA seller lists
- Customs broker referral lists
- TikTok/Discord importer communities

## Current Blocker
`stripe-checkout.html` still needs live publishable key + Price ID. Do not wire without user confirmation.
