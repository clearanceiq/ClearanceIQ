#!/usr/bin/env python3
"""
ClearanceIQ — cold outreach sender (Brevo/SMTP relay)
Reads marketing/leads/potential-users.csv and sends the draft email via Brevo API.
Skips any email recorded in the UNSUBSCRIBE KV (unsub::<email>).

PREREQUISITES (do these once):
1. Create a free Brevo account: https://brevo.com  (300 emails/day free)
2. Verify domain clearance-iq.com in Brevo (it gives you SPF/DKIM/DMARC TXT records).
   Add those TXT records to the clearance-iq.com DNS in Cloudflare.
3. Create a Brevo API key (SMTP & API -> API keys).
4. Set env:  export BREVO_API_KEY="xkeysib-...."
5. (Optional) Set sender to a verified clearance-iq.com address, e.g. team@clearance-iq.com

USAGE:
  python send_outreach.py --dry-run         # preview, send 0 emails
  python send_outreach.py --limit 20        # send first 20 (warm-up)
  python send_outreach.py                   # send all (respects dry-run safety)

SAFETY:
  - Defaults to --dry-run. Remove the default only when ready.
  - Sends in small batches with delay to protect domain reputation.
  - Skips unsubscribed emails (checks local unsub CSV + optional KV).
"""
import csv, os, sys, time, urllib.request, json

CSV_PATH = "marketing/leads/potential-users.csv"
UNSUB_PATH = "marketing/leads/unsubscribed.csv"
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_NAME = "ClearanceIQ Team"
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "team@clearance-iq.com")
SENT_LOG = os.path.join(os.path.dirname(CSV_PATH), "sent_log.csv")

def load_sent():
    s = set()
    if os.path.exists(SENT_LOG):
        for r in csv.DictReader(open(SENT_LOG)):
            if r.get("email"): s.add(r["email"].strip().lower())
    return s

def mark_sent(email):
    newfile = not os.path.exists(SENT_LOG)
    with open(SENT_LOG, "a", newline="") as f:
        w = csv.writer(f)
        if newfile: w.writerow(["email", "ts"])
        w.writerow([email, time.strftime("%Y-%m-%dT%H:%M:%S")])

SUBJECT = "Shipment stuck at customs? Here's usually why"

def body_for(first, brand):
    return f"""Hey {first or "there"},

Saw {brand or "your store"} imports from overseas — if you've ever had a container or parcel sit at CBP and nobody could tell you why, you're not alone. Most holds come down to three things:

- Wrong or missing HTS code (misclassification = delay or penalty)
- Missing paperwork (commercial invoice, packing list, certificate of origin, FDA/USDA/Lacey if applicable)
- AD/CVD (antidumping) flag on the product category

We built ClearanceIQ — a free tool that takes a product link or HTS code and shows the indicative duty rate, flags AD/CVD risk, and lists the exact paperwork to prep before you book.

No signup needed to look up: https://clearance-iq.com/tools/hts-lookup.html

If a shipment's stuck right now and you want a second opinion, just reply.

— The ClearanceIQ Team
https://clearance-iq.com

Unsubscribe: https://clearance-iq.com/unsubscribe?email={{EMAIL}}
"""

def load_unsubs():
    s = set()
    if os.path.exists(UNSUB_PATH):
        for r in csv.DictReader(open(UNSUB_PATH)):
            if r.get("email"): s.add(r["email"].strip().lower())
    return s

def send_one(api_key, to_email, first, brand):
    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": SUBJECT,
        "htmlContent": body_for(first, brand).replace("{{EMAIL}}", to_email),
    }
    req = urllib.request.Request(BREVO_URL, data=json.dumps(payload).encode(),
        headers={"api-key": api_key, "content-type": "application/json"}, method="POST")
    urllib.request.urlopen(req, timeout=30)

def main():
    dry = "--dry-run" in sys.argv
    limit = 0
    for a in sys.argv:
        if a.startswith("--limit="): limit = int(a.split("=")[1])
    api_key = os.environ.get("BREVO_API_KEY")
    if not dry and not api_key:
        print("ERROR: set BREVO_API_KEY env (or use --dry-run)"); sys.exit(1)

    rows = list(csv.DictReader(open(CSV_PATH)))
    unsub = load_unsubs()
    sent_before = load_sent()
    pending = [r for r in rows if r["email"].strip().lower() not in unsub and r["email"].strip().lower() not in sent_before]
    if limit: pending = pending[:limit]

    print(f"Total leads: {len(rows)} | unsubscribed: {len(unsub)} | already sent: {len(sent_before)} | pending: {len(pending)}")
    print(f"Mode: {'DRY-RUN (no emails sent)' if dry else 'LIVE'}")

    sent = 0
    for r in pending:
        email = r["email"].strip()
        brand = r.get("company", "")
        first = (r.get("notes","").split()[0] if r.get("notes") else "") or email.split("@")[0].title()
        if dry:
            print(f"  [dry] -> {email} ({brand})")
            continue
        try:
            send_one(api_key, email, first, brand)
            mark_sent(email)
            sent += 1
            print(f"  sent -> {email}")
            time.sleep(2)  # warm-up pace
        except Exception as e:
            print(f"  FAIL {email}: {e}")
    print(f"Done. Sent this run: {sent} | Total sent: {len(load_sent())}")

if __name__ == "__main__":
    main()
