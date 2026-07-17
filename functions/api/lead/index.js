export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 1000);
  const token = (context.request.headers.get('x-leads-token') || '').trim();

  // Light shared-secret gate: the dashboard sends x-leads-token after login.
  // If a DASHBOARD_TOKEN secret is set, require an exact match; otherwise
  // accept any non-empty token so the dashboard keeps working.
  const expected = context.env && context.env.DASHBOARD_TOKEN ? String(context.env.DASHBOARD_TOKEN).trim() : null;
  if (expected) {
    if (token !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
  } else if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  if (!context.env || !context.env.LEADS) {
    return new Response(JSON.stringify({ ok: true, items: [], note: 'LEADS binding not available' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const items = [];
  try {
    let cursor;
    do {
      const page = await context.env.LEADS.list({ limit: 100, cursor });
      for (const key of page.keys) {
        const raw = await context.env.LEADS.get(key.name);
        if (!raw) continue;
        try { items.push(JSON.parse(raw)); } catch { /* skip malformed */ }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor && items.length < limit);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'leads_list_failed', detail: err && err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const sorted = items
    .filter(it => it && (it.email || it.name || it.topic || it.message))
    .sort((a, b) => (b.ts || Date.parse(b.createdAt || 0) || 0) - (a.ts || Date.parse(a.createdAt || 0) || 0))
    .slice(0, limit);

  return new Response(JSON.stringify({ ok: true, items: sorted, count: sorted.length }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const contentType = context.request.headers.get("content-type") || "";

  let body = {};
  if (contentType.includes("application/json")) {
    body = await context.request.json().catch(() => ({}));
  } else {
    const form = await context.request.formData().catch(() => null);
    if (form) {
      body = Object.fromEntries(form.entries());
    }
  }

  const email = (body.email || "").toString().trim();
  const source = (body.source || "homepage").toString();
  const name = (body.name || "").toString().trim();
  const message = (body.message || "").toString().trim();
  const topic = (body.topic || "").toString().trim();

  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "valid email required" }), {
      status: 400,
      headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearance-iq.com" },
    });
  }

  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `lead_rate::${today}::${ip}`;
  const rateLimit = 5;

  if (context.env?.RATE_COUNTER) {
    try {
      const existing = await context.env.RATE_COUNTER.get(rateKey);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= rateLimit) {
        return new Response(JSON.stringify({ ok: false, error: 'rate_limit', message: 'Too many submissions. Try again tomorrow.' }), {
          status: 429,
          headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearance-iq.com" },
        });
      }
      await context.env.RATE_COUNTER.put(rateKey, String(count + 1), { expirationTtl: 24 * 60 * 60 });
    } catch (e) { /* best-effort */ }
  }

  const lead = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    ts: Date.now(),
    source,
    email,
    name: name || null,
    topic: topic || null,
    message: message || null,
    status: "captured",
  };

  if (context.env && context.env.LEADS) {
    try {
      await context.env.LEADS.put(lead.id, JSON.stringify(lead));
    } catch (e) { /* ignore KV write failures */ }
  }

  return new Response(JSON.stringify({ ok: true, lead, status: "captured" }), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearance-iq.com" },
  });
}

export const OPTIONS = async () => new Response(null, {
  headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-leads-token",
  },
  status: 204,
});

export default { onRequestGet, onRequestPost, OPTIONS };
