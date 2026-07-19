// GET /api/inbox — list captured inbound emails for team@clearance-iq.com
// Auth: x-leads-token header (same dashboard hash) OR ?key=
// Returns the index of captured messages (from KV clearanceiq_inbox).
const ALLOWED = "a27c372ac811e56fa1c15ee55f417ee7ab072298c7a4de21b7812a5d52b5fac8";

export async function onRequestGet(context) {
  const token = context.request.headers.get("x-leads-token")
    || new URL(context.request.url).searchParams.get("key") || "";
  if (token !== ALLOWED) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

  const env = context.env?.INBOX || context.env?.inbox;
  if (!env) return new Response(JSON.stringify({ ok: false, error: "no KV binding" }), { status: 500, headers: { "content-type": "application/json" } });

  const idxRaw = await env.get("index");
  const idx = idxRaw ? JSON.parse(idxRaw) : [];
  return new Response(JSON.stringify({ ok: true, count: idx.length, messages: idx }), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

// POST /api/inbox/mark-replied  { key }  -> mark a message replied
export async function onRequestPost(context) {
  const token = context.request.headers.get("x-leads-token")
    || new URL(context.request.url).searchParams.get("key") || "";
  if (token !== ALLOWED) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

  let body = {};
  try { body = await context.request.json(); } catch {}
  const key = body.key;
  const env = context.env?.INBOX || context.env?.inbox;
  if (!env || !key) return new Response(JSON.stringify({ ok: false, error: "missing" }), { status: 400, headers: { "content-type": "application/json" } });

  const idxRaw = await env.get("index");
  let idx = idxRaw ? JSON.parse(idxRaw) : [];
  let changed = false;
  for (const m of idx) { if (m.key === key) { m.replied = true; changed = true; } }
  if (changed) await env.put("index", JSON.stringify(idx));
  return new Response(JSON.stringify({ ok: true, changed }), { headers: { "content-type": "application/json" } });
}
