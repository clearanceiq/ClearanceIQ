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

async function requireValidKey(context) {
  const apiKey = String(context.request.headers.get('X-API-Key') || '').trim();
  if (!apiKey || !context.env?.API_KEYS) throw json({ ok: false, error: 'unauthorized' }, 401);

  const raw = await context.env.API_KEYS.get('key::' + apiKey);
  if (!raw) throw json({ ok: false, error: 'unauthorized' }, 401);

  const record = JSON.parse(raw);
  if (!record.verified) throw json({ ok: false, error: 'email_not_verified', message: 'Verify your email before using this key.' }, 403);

  return { apiKey, record, userKey: apiKey, email: record.email, tier: record.tier || 'free' };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/api/auth/verify') {
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    const token = (url.searchParams.get('token') || '').trim();
    if (!email || !token) return json({ ok: false, error: 'email and token required' }, 400);

    if (!context.env?.API_KEYS) return json({ ok: false, error: 'API_KEYS binding not available' }, 500);

    const raw = await context.env.API_KEYS.get('email::' + email);
    if (!raw) return json({ ok: false, error: 'no_pending_signup' }, 404);

    try {
      const record = JSON.parse(raw);
      if (record.verificationToken !== token) return json({ ok: false, error: 'invalid_token' }, 400);
      if (record.verified) return json({ ok: true, message: 'Already verified' });

      record.verified = true;
      record.verifiedAt = new Date().toISOString();
      delete record.verificationToken;

      await context.env.API_KEYS.put('email::' + email, JSON.stringify(record));
      await context.env.API_KEYS.put('key::' + record.key, JSON.stringify(record));

      return json({ ok: true, message: 'Email verified. You may now use your API key.', key: record.key });
    } catch (e) {
      return json({ ok: false, error: 'verification_failed' }, 500);
    }
  }

  return new Response(
    JSON.stringify({
      service: 'auth',
      methods: ['POST /api/auth/signup', 'POST /api/auth/verify'],
      docs: 'Use POST /api/auth/signup with email to receive a verification token. Then verify via /api/auth/verify?email=...&token=...',
    }),
    { headers: corsHeaders, status: 200 }
  );
}

export async function onRequestPost(context) {
  const body = await parseBody(context.request);
  const email = String(body.email || '').trim();
  const emailLower = email.toLowerCase();
  if (!emailLower || !emailLower.includes('@')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'valid email required' }),
      { headers: corsHeaders, status: 400 }
    );
  }

  let record;
  if (context.env && context.env.API_KEYS) {
    try {
      const existing = await context.env.API_KEYS.get('email::' + emailLower);
      if (existing) {
        record = JSON.parse(existing);
        if (record && record.key) {
          return new Response(
            JSON.stringify({
              ok: true,
              key: record.key,
              tier: record.tier,
              message: 'Key already issued. Use existing key.',
              usage: 'Include header: X-API-Key: ' + record.key,
            }),
            { headers: corsHeaders }
          );
        }
      }
    } catch (e) { /* best-effort */ }
  }

  if (!record) {
    record = issueFreeKey(emailLower);
    record.verificationToken = generateVerificationToken();
    record.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (record.verified) {
    return new Response(
      JSON.stringify({
        ok: true,
        key: record.key,
        tier: record.tier,
        message: 'Key already issued and verified. Use existing key.',
        usage: 'Include header: X-API-Key: ' + record.key,
      }),
      { headers: corsHeaders }
    );
  }

  record.email = emailLower;

  if (context.env && context.env.API_KEYS) {
    try {
      await context.env.API_KEYS.put('email::' + emailLower, JSON.stringify(record));
      await context.env.API_KEYS.put('key::' + record.key, JSON.stringify(record));
    } catch (e) { /* Persistence is best-effort on Pages; key still issued above. */ }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      key: record.key,
      tier: record.tier,
      verified: record.verified,
      verificationRequired: !record.verified,
      verificationToken: record.verificationToken,
      limits: { daily: 100 },
      usage: 'Include header: X-API-Key: ' + record.key,
      endpoints: ['/api/v1/hts', '/api/v1/duty-calc', '/api/v1/bond'],
      "support": "support@clearance-iq.com"
      verifyUrl: `/api/auth/verify?email=${encodeURIComponent(emailLower)}&token=${record.verificationToken}`,
    }),
    { headers: corsHeaders }
  );
}

export const OPTIONS = async () => new Response(null, { headers: corsHeaders, status: 204 });
