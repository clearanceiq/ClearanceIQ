export async function onRequestGet(context) {
  const ALLOWED_HASH = 'a27c372ac811e56fa1c15ee55f417ee7ab072298c7a4de21b7812a5d52b5fac8';

  async function unauthorized() {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const token = (context.request.headers.get('x-leads-token') || '').trim();
  if (!token || token !== ALLOWED_HASH) return unauthorized();

  const out = {
    ok: true,
    service: 'lead',
    method: 'GET',
    items: [],
    count: 0,
  };

  const leadsEnv = context.env?.LEADS || context.env?.Leads;
  if (!leadsEnv) {
    return new Response(JSON.stringify({ ...out, error: 'LEADS binding not available' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
  const items = [];
  let cursor;
  do {
    const result = await leadsEnv.list({ limit: Math.max(limit, 1000), cursor });
    if (Array.isArray(result.keys)) {
      for (const kv of result.keys) items.push(kv);
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor && items.length < limit);

  const sliced = items.slice(-limit).reverse();
  const rows = await Promise.all(
    sliced.map(async (kv) => {
      try {
        const raw = await leadsEnv.get(kv.name);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })
  );

  out.items = rows.filter(Boolean);
  out.count = out.items.length;
  return new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
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

  // Simple IP-based rate limiting for lead endpoint
  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `lead_rate::${today}::${ip}`;
  const rateLimit = 5; // max 5 leads per day per IP

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
    } catch (e) {
      // rate limiting is best-effort
    }
  }

  const apiKey = "ciq_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");

  const lead = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source,
    email,
    name: name || null,
    topic: topic || null,
    message: message || null,
    status: "captured",
    apiKey,
  };

  if (context.env && context.env.LEADS) {
    try {
      await context.env.LEADS.put(lead.id, JSON.stringify(lead));
    } catch (e) {
      // ignore KV write failures — still return queued
    }
  }

  return new Response(JSON.stringify({ ok: true, lead: { id: lead.id, email, source, status: lead.status }, apiKey, status: "captured" }), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "https://clearance-iq.com" },
  });
}

export const OPTIONS = async () => new Response(null, {
  headers: {
    "access-control-allow-origin": "https://clearance-iq.com",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  },
  status: 204,
});
