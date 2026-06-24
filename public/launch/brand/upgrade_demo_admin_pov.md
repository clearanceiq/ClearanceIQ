# Operator/Admin POV — Upgrade Flow Demo

Same timeline as customer upgrade, but from your view.

---
**TIMESTAMP: 14:32:07**
---
**Telegram webhook / bot log:**
```
Update received: Message
  from_user.id: 77889900
  chat.id: 77889900
  text: "/upgrade"
  date: 2026-06-22T14:32:07+07:00
```
**Action:** Bot sends invoice for Operator tier ($15/month) via `sendInvoice`.

---
**TIMESTAMP: 14:32:09**
---
**Telegram webhook / bot log:**
```
Update received: PreCheckoutQuery
  from_user.id: 77889900
  invoice_payload: "operator"
  currency: "XTR"
  total_amount: 1500
```
**Action:** Bot calls `answer_pre_checkout_query(ok=True)`. Payment sheet proceeds.

---
**TIMESTAMP: 14:32:18**
---
**Telegram webhook / bot log:**
```
Update received: Message.successful_payment
  from_user.id: 77889900
  invoice_payload: "operator"
  total_amount: 1500
```
**Action taken by bot:**
1. Look up or create user row in `users.json` / SQLite.
2. Write:
   ```
   {
     "user_id": 77889900,
     "tier": "operator",
     "active": true,
     "started_at": "2026-06-22T14:32:18+07:00",
     "expires_at": "2026-07-22T14:32:18+07:00",
     "token_budget_used": 0
   }
   ```
3. Send confirmation message to user (Operator tier activation text).

**Operator notification fired:**
```
New paid user: 77889900
Tier: Operator
Revenue: $15.00
Token usage today: 5
Payment id: 7a3f9c...
```

---
**TIMESTAMP: 14:32:19**
---
**Your admin log / revenue counter:**
```
+1 paying user
Monthly recurring revenue: +$15.00
Active paying users: 1
Free tier users: 47
API burn estimate today: ~$0.04
Net margin estimate: ~$14.96
```

---
**TIMESTAMP: 14:32:20 — next user message**
---
**Telegram webhook / bot log:**
```
Update received: Message
  from_user.id: 77889900
  text: "Send that action list I made earlier to my email: user@email.com"
```
**Enforcement check (invisible to customer):**
```
user = load("users.json", "77889900")
if user["tier"] == "operator" and user["active"] is True:
    → proceed without limit check
else:
    → enforce free-tier daily message cap
```

Bot processes message normally. Operator tier has no daily message cap.

---
**TIMESTAMP: 23:00:00 (cron)**
---
`data_retention_cron.py` runs automatically.

**Log output:**
```
Pruned 3 old records. 142 remaining.
```

No user touch required. Cron handles cleanup during your sleep.

---
**TIMESTAMP: Next day, 07:05 (your morning window)**
---
**What you see when you open your terminal / dashboard:**
```
=== Opsifai Daily Digest — June 23, 2026 ===

PAYING USERS: 1
  Operator: 1 ($15.00 MRR)

FREE USERS: 47
  Daily limit hit: 3 users
  New signups yesterday: 4

REVENUE
  Yesterday: $15.00
  This month: $15.00
  Est. API cost yesterday: $0.04
  Net margin yesterday: $14.96 (99.7%)

SYSTEM
  Cron jobs: all healthy
  Disk: 14 GB free
  Last critical error: none
  Queued refunds: 0

ATTENTION
  None.
```

You check it in 2 minutes. Business is running while you sleep.
