const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
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
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function issueFreeKey(email) {
  const key = 'ciq_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const tier = 'free';
  const createdAt = new Date().toISOString();
  return { key, tier, createdAt };
}

export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({
      service: 'auth',
      methods: ['POST /api/auth/signup', 'POST /api/auth/login'],
      docs: 'Use POST /api/auth/signup with email to receive a free API key (100 req/day).',
    }),
    { headers: corsHeaders, status: 200 }
  );
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const body = await parseBody(context.request);
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'valid email required' }),
      { headers: corsHeaders, status: 400 }
    );
  }

  let record;
  if (context.env && context.env.API_KEYS) {
    try {
      const existing = await context.env.API_KEYS.get('email::' + email);
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
    } catch (e) {
      // best-effort: fall through to ephemeral key below
    }
  }

  if (!record) record = issueFreeKey(email);
  record.email = email;

  if (context.env && context.env.API_KEYS) {
    try {
      await context.env.API_KEYS.put('email::' + email, JSON.stringify(record));
      await context.env.API_KEYS.put('key::' + record.key, JSON.stringify(record));
    } catch (e) {
      // Persistence is best-effort on Pages; key still issued above.
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      key: record.key,
      tier: record.tier,
      limits: { daily: 100 },
      usage: 'Include header: X-API-Key: ' + record.key,
      endpoints: ['/api/v1/hts', '/api/v1/duty-calc', '/api/v1/bond'],
      support: 'support@clearanceiq.pages.dev',
    }),
    { headers: corsHeaders }
  );
}

export const OPTIONS = async () => new Response(null, { headers: corsHeaders, status: 204 });
