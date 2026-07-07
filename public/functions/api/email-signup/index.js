export async function onRequestGet(context) {
  const ALLOWED_HASH = 'af994c9f2209826a0a539618fabf5bc24fad9eca93785181deec9e4c837960b9';

  async function unauthorized() {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const token = (context.request.headers.get('x-email-token') || '').trim();
  if (!token || token !== ALLOWED_HASH) return unauthorized();

  const out = {
    ok: true,
    service: 'email-signup',
    method: 'GET',
    items: [],
    count: 0,
  };

  if (!context.env?.LEADS) {
    return new Response(JSON.stringify({ ...out, error: 'LEADS binding not available' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
  const items = [];
  let cursor;
  const prefix = 'email_';
  do {
    const result = await context.env.LEADS.list({ prefix, limit: Math.max(limit, 1000), cursor });
    if (Array.isArray(result.keys)) {
      for (const kv of result.keys) items.push(kv);
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor && items.length < limit);

  const sliced = items.slice(-limit).reverse();
  const rows = await Promise.all(
    sliced.map(async (kv) => {
      try {
        const raw = await context.env.LEADS.get(kv.name);
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
  const contentType = context.request.headers.get('content-type') || '';
  let body = {};
  if (contentType.includes('application/json')) {
    body = await context.request.json().catch(() => ({}));
  } else {
    const form = await context.request.formData().catch(() => null);
    if (form) body = Object.fromEntries(form.entries());
  }

  const email = (body.email || '').toString().trim();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'valid email required' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `email_rate::${today}::${ip}`;
  const rateLimit = 10;

  if (context.env?.RATE_COUNTER) {
    try {
      const existing = await context.env.RATE_COUNTER.get(rateKey);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= rateLimit) {
        return new Response(JSON.stringify({ ok: false, error: 'rate_limit', message: 'Too many signups. Try again later.' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
        });
      }
      await context.env.RATE_COUNTER.put(rateKey, String(count + 1), { expirationTtl: 24 * 60 * 60 });
    } catch (e) {}
  }

  const id = crypto.randomUUID();
  const apiKey = 'ciq_' + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
  const signup = {
    id,
    email,
    source: (body.source || 'homepage').toString(),
    tier: (body.tier || 'signed').toString(),
    createdAt: new Date().toISOString(),
    apiKey,
  };

  if (context.env && context.env.LEADS) {
    try {
      await context.env.LEADS.put('email_' + id, JSON.stringify(signup));
    } catch (e) {}
  }

  return new Response(JSON.stringify({ ok: true, signup: { id, email, source: signup.source, tier: signup.tier } }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
  });
}

export const OPTIONS = async () => new Response(null, {
  headers: {
    'access-control-allow-origin': 'https://clearance-iq.com',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  },
  status: 204,
});
