const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type, x-api-key',
};

async function parseBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (!form) return {};
    const out = {};
    for (const [k, v] of form.entries()) out[k] = v;
    return out;
  }
  try { return await request.json(); } catch { return {}; }
}

function issueFreeKey(email) {
  const key = 'ciq_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const tier = 'free';
  const createdAt = new Date().toISOString();
  return { key, tier, createdAt, verified: false };
}

function generateVerificationToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function signup(context) {
  const body = await parseBody(context.request);
  const email = String(body.email || '').trim();
  const emailLower = email.toLowerCase();
  if (!emailLower || !emailLower.includes('@')) {
    return json({ ok: false, error: 'valid email required' }, 400);
  }

  const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const signupKey = `signup::${today}::${ip}`;
  if ((context.env.LEADS || context.env.Leads)) {
    try {
      const existingCount = await (context.env.LEADS || context.env.Leads).get(signupKey);
      const count = existingCount ? parseInt(existingCount, 10) : 0;
      if (count >= 3) {
        return json({ ok: false, error: 'Too many signups from this IP today. Try again tomorrow.', retryAfter: nextMidnightUTCUnix() }, 429);
      }
      await (context.env.LEADS || context.env.Leads).put(signupKey, String(count + 1), { expirationTtl: 24 * 60 * 60 });
    } catch (e) { /* best-effort rate-limit */ }
  }

  let record;
  if (context.env && (context.env.LEADS || context.env.Leads)) {
    try {
      const existing = await (context.env.LEADS || context.env.Leads).get('email::' + emailLower);
      if (existing) {
        record = JSON.parse(existing);
        if (record && record.key) {
          return json({
            ok: true,
            key: record.key,
            tier: record.tier,
            verified: !!record.verified,
            message: record.verified ? 'Welcome back. Use your existing key.' : 'Key already issued. Verify your email to activate.',
            usage: 'Include header: X-API-Key: *** with requests.',
          });
        }
      }
    } catch (e) { /* best-effort */ }
  }

  if (!record) {
    record = issueFreeKey(emailLower);
    record.verificationToken = generateVerificationToken();
    record.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  record.email = emailLower;

  if (context.env && (context.env.LEADS || context.env.Leads)) {
    try {
      await (context.env.LEADS || context.env.Leads).put('email::' + emailLower, JSON.stringify(record));
      await (context.env.LEADS || context.env.Leads).put('key::' + record.key, JSON.stringify(record));
    } catch (e) { /* persistence is best-effort on Pages */ }
  }

  return json({
    ok: true,
    key: record.key,
    tier: record.tier,
    verified: !!record.verified,
    verificationRequired: !record.verified,
    verificationToken: record.verificationToken,
    limits: { daily: 100 },
    usage: 'Include header: X-API-Key: ' + record.key + ' with requests.',
    endpoints: ['/api/v1/hts', '/api/v1/duty-calc', '/api/v1/bond'],
    support: 'support@clearance-iq.com',
    verifyUrl: '/api/auth/verify?email=' + encodeURIComponent(emailLower) + '&token=' + record.verificationToken,
  });
}

function nextMidnightUTCUnix() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor(next.getTime() / 1000);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/api/auth/verify') {
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    const token = (url.searchParams.get('token') || '').trim();
    if (!email || !token) return json({ ok: false, error: 'email and token required' }, 400);

    if (!(context.env.LEADS || context.env.Leads)) return json({ ok: false, error: 'LEADS binding not available' }, 500);

    const raw = await (context.env.LEADS || context.env.Leads).get('email::' + email);
    if (!raw) return json({ ok: false, error: 'no_pending_signup' }, 404);

    try {
      const record = JSON.parse(raw);
      if (record.verificationToken !== token) return json({ ok: false, error: 'invalid_token' }, 400);
      if (record.verified) return json({ ok: true, message: 'Already verified' });

      record.verified = true;
      record.verifiedAt = new Date().toISOString();
      delete record.verificationToken;

      await (context.env.LEADS || context.env.Leads).put('email::' + email, JSON.stringify(record));
      await (context.env.LEADS || context.env.Leads).put('key::' + record.key, JSON.stringify(record));

      return json({ ok: true, message: 'Email verified. You may now use your API key.', key: record.key });
    } catch (e) {
      return json({ ok: false, error: 'verification_failed' }, 500);
    }
  }

  return json({
    service: 'auth',
    methods: ['POST /api/auth/signup', 'GET /api/auth/verify'],
    docs: 'Use POST /api/auth/signup with email to receive a verification token. Then verify via /api/auth/verify?email=...&token=...',
  });
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  if (url.pathname === '/api/auth/signup') {
    return signup(context);
  }
  return json({ ok: false, error: 'use POST /api/auth/signup' }, 405);
}

export const OPTIONS = async () =>
  new Response(null, {
    status: 204,
    headers: corsHeaders,
  });

export default {
  onRequestGet,
  onRequestPost,
  OPTIONS,
};
