export async function onRequestGet(context) {
  const ALLOWED_HASH = 'a27c372ac811e56fa1c15ee55f417ee7ab072298c7a4de21b7812a5d52b5fac8';

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
  // List ALL keys (do not filter by 'email_' prefix — signup records are not
  // reliably stored with that prefix in the live KV). We distinguish signups
  // by record shape after fetching.
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

  // Signup records: have an apiKey ('key'), 'tier', and 'createdAt'; exclude
  // Stripe orders (paid/amount) and contact leads (topic/message).
  out.items = rows
    .filter(Boolean)
    .filter(function (r) {
      if (!r || typeof r.email !== 'string' || r.email.indexOf('@') === -1) return false;
      if (r.email.toLowerCase().indexOf('@example.com') !== -1) return false;
      if (r.paid !== undefined || r.amount !== undefined) return false; // Stripe order
      if (r.topic || r.message) return false; // contact lead
      return !!r.key && !!r.tier && !!r.createdAt; // signup shape
    });
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

  // Reject telemetry/non-signup payloads that sometimes hit this endpoint
  if (body.ts && body.tool && !body.email) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email) || email.toLowerCase().endsWith('@example.com')) {
    return new Response(JSON.stringify({ ok: false, error: 'valid email required' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
    });
  }

  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `email_rate::${today}::${ip}`;
  const rateLimit = 10;

  if ((context.env.TELEMETRY || context.env.telemetry)) {
    try {
      const existing = await (context.env.TELEMETRY || context.env.telemetry).get(rateKey);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= rateLimit) {
        return new Response(JSON.stringify({ ok: false, error: 'rate_limit', message: 'Too many signups. Try again later.' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
        });
      }
      await (context.env.TELEMETRY || context.env.telemetry).put(rateKey, String(count + 1), { expirationTtl: 24 * 60 * 60 });
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

  if (context.env && (context.env.LEADS || context.env.Leads)) {
    try {
      await (context.env.LEADS || context.env.Leads).put('email_' + id, JSON.stringify(signup));
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
