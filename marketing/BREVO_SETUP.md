# Brevo Setup Guide — ClearanceIQ Cold Outreach

Goal: send the 100 FBA/importer leads from team@clearance-iq.com via Brevo (free: 300 emails/day).

## STEP 1 — Create Brevo account (PC, ~2 min)
1. Go to https://brevo.com → Sign up (free).
2. Verify your email.

## STEP 2 — Verify the clearance-iq.com domain in Brevo
1. In Brevo: **SMTP & API → Senders, Domains & Webhooks → Domains → Add a domain**.
2. Enter `clearance-iq.com`.
3. Brevo shows 3 TXT records (SPF, DKIM, and sometimes a verification TXT).
   Copy each exactly.
4. Add them to Cloudflare DNS (see Step 3).
5. Back in Brevo, click **Verify**. Wait a few minutes.

## STEP 3 — Add Brevo TXT records to Cloudflare DNS (PC)
1. Cloudflare dashboard → clearance-iq.com → **DNS → Records → Add record**.
2. For EACH Brevo TXT record, add a **TXT** record:
   - Name: `@` (or the subdomain Brevo specifies)
   - Content: paste the Brevo value exactly (include the quotes if shown)
   - TTL: Auto
3. Common records Brevo gives you:
   - SPF:  `v=spf1 include:spf.sendinblue.com mx ~all`  (or similar — use Brevo's exact string)
   - DKIM: `brevo._domainkey.clearance-iq.com  TXT  k=rsa;p=...longkey...`
   - Verify: `clearance-iq.com  TXT  brevo-verify=xxxx`
4. Also add a **DMARC** TXT (recommended) at Name `@`:
   `v=DMARC1; p=none; rua=mailto:team@clearance-iq.com`
   (start with p=none, tighten later once Deliverability is good)

## STEP 4 — Create a Brevo API key
1. Brevo: **SMTP & API → API keys → Generate a new API key**.
2. Name it `clearanceiq-outreach`, copy the key (`xkeysib-...`).
3. On your PC, set it as an env var (PowerShell):
   `$env:BREVO_API_KEY="xkeysib-...."`
   (or permanently: System → Environment Variables → User → New)

## STEP 5 — Send (warm-up)
From the site repo folder (C:\Users\Najmi\Documents\Tycoon\site):
```
# Dry run first (no emails sent) — confirms everything works
python marketing/send_outreach.py --dry-run

# Warm-up: 20 emails/day for first 3-4 days
python marketing/send_outreach.py --limit 20

# Then scale to remaining
python marketing/send_outreach.py
```
The script skips anyone in marketing/leads/unsubscribed.csv and honors the /unsubscribe link.

## SAFETY / DELIVERABILITY
- Send in small batches (20/day) for the first week — protects domain reputation.
- Always send FROM team@clearance-iq.com (authenticated), not Gmail.
- Keep the unsubscribe link in every email (already in the draft).
- CAN-SPAM: real sender + physical address + opt-out = compliant for B2B.

## WHAT HERMES ALREADY BUILT (local, not pushed)
- team@ + jimmy@ clearance-iq.com → forward to your Gmail (Cloudflare Email Routing, enabled)
- /unsubscribe page + Function (records unsubscribes to leads-store KV)
- marketing/send_outreach.py (dry-run safe, skips unsubscribed)
- 100 leads in marketing/leads/potential-users.csv
- 16 "stuck" handles in marketing/leads/stuck-importers.csv
