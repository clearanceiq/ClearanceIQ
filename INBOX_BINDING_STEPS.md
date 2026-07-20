# INBOX KV Binding — what YOU need to click (Cloudflare Pages dashboard)

The email capture Worker is LIVE and tested (4 messages captured in KV namespace
`clearanceiq_inbox` = id `54b91204a5874a9fbb06a4b38afbb39e`). The only missing piece
is telling the Pages **Functions** runtime about that KV namespace. Right now
`/api/inbox` returns `{"ok":false,"error":"no KV binding"}` because the Pages project
doesn't have the `INBOX` binding wired.

## Do this once (2 minutes) — needs a browser, I can't click the dashboard

1. Go to https://dash.cloudflare.com → **Workers & Pages** (left sidebar).
2. Click the **clearanceiqa** project (the Pages site for clearance-iq.com).
3. Open the **Settings** tab → **Functions** section (or "Bindings" depending on UI).
   - Newer UI: Settings → **Functions** → **KV namespace bindings**.
   - Older UI: Settings → **Variables** → scroll to "KV namespace bindings".
4. Click **Add binding** (or "Add KV namespace binding").
5. Fill it in EXACTLY:
   - **Variable name:** `INBOX`   (must be all-caps INBOX — the Function reads `env.INBOX`)
   - **KV namespace:** select **clearanceiq_inbox** (id `54b91204a5874a9fbb06a4b38afbb39e`)
6. Click **Save**.
7. Redeploy isn't required for a binding change in most cases, but if the dashboard
   offers "Deploy" / "Save and deploy", do it. (The Function code is already deployed.)

## Verify it worked (I can run this)
After you save, tell me and I'll curl:
  https://clearance-iq.com/api/inbox?key=<dashboard_hash>
and expect `{"ok":true,"count":N,"messages":[...]}` instead of the "no KV binding" error.

## Optional next step (inbound SOP doc)
Once the binding is live, the inbound email flow is fully functional:
team@clearance-iq.com → Worker captures to KV + forwards Gmail → you read/mark-replied
via /api/inbox. I can write a 1-page SOP for how you (or a VA) work the inbox daily.

NOTE: This is the ONLY ClearanceIQ item that needs your hands on the dashboard.
Everything else (buy path, worksheets, blog) is code I've already pushed or will push.
