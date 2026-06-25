# ClearanceIQ — 5-Email Welcome Sequence

**Trigger:** User provides email via any tool on the site.
**Tool:** Use `/api/auth?email=...` to capture. Store in simple JSON file or flat DB (we'll migrate later).
**Sender:** clearanceiq@proton.me
**Unsubscribe:** Include legal footer on every email.

---

## **Email 1 — Immediate**

**Subject:** You’re in. Here’s your ClearanceIQ onboarding.

**Body:**
- Confirm signup
- Link to `/tools/` dashboard
- One sentence: "Start with the Compliance Checklist if this is your first entry."
- No CTA to buy anything

---

## **Email 2 — Day 2**

**Subject:** The #1 mistake new importers make on their first entry

**Body:**
- Open with the HTS misclassification stat
- Link to blog post: "11 Import Customs Mistakes That Cost You Thousands"
- Subtle CTA: "Bookmark the HTS Lookup before your next shipment"

---

## **Email 3 — Day 4**

**Subject:** Section 321 changed everything. Here’s what to do now.

**Body:**
- Summarize de minimis elimination (2–3 sentences, not legal advice)
- Link to blog post: "Section 321 De Minimis Eliminated"
- CTA: "Run your top 3 SKUs through the Duty Calculator"

---

## **Email 4 — Day 7**

**Subject:** Your first CBP hold notice — what happens next

**Body:**
- Walk through the hold timeline (release vs liquidation)
- Link to blog post: "How to read a CBP hold notice"
- CTA: "Use the Compliance Checklist to prepare your response packet"

---

## **Email 5 — Day 14**

**Subject:** Ready for a real compliance workflow?

**Body:**
- Recap the tools they’ve used
- Introduce the Import Kit ($29.99)
- Offer: "First 50 importers who reply to this email get a free 15-minute import review call"
- Soft sell, not hard pitch

---

## **TECHNICAL NOTES**

1. Store email + signup timestamp in a flat JSON file at `data/email-list.json`
2. Send via ProtonMail SMTP or a transactional API (Mailgun/Sendgrid recommended for volume)
3. Track opens/clicks for follow-up segmentation
4. Unsubscribe link required by CAN-SPAM

This sequence will be implemented after the VPS is provisioned. For now, this is the content spec.
