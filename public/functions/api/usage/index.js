const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type, x-api-key',
};

function nextMidnightUTC() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor(next.getTime() / 1000);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const apiKey = (url.searchParams.get('key') || (context.request.headers.get('X-API-Key') || '')).trim();
  const kv = context.env?.TELEMETRY || context.env?.telemetry;
  const date = new Date().toISOString().slice(0, 10);

  if (!apiKey) {
    const ip = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_') + '::' + date;
    const count = kv ? parseInt(await kv.get('rate::' + ip).catch(() => null) || '0', 10) : 0;
    const cap = 5;
    return new Response(JSON.stringify({
      ok: true,
      tier: 'anonymous',
      authenticated: false,
      limit: cap,
      used: count,
      remaining: Math.max(0, cap - count),
      resetUnix: nextMidnightUTC(),
    }), { status: 200, headers: corsHeaders });
  }

  const recordRaw = kv ? await kv.get('key::' + apiKey).catch(() => null) : null;
  let tier = 'signed';
  if (recordRaw) {
    try {
      const rec = JSON.parse(recordRaw);
      if (rec.tier === 'pro') tier = 'pro';
    } catch {}
  }
  const cap = tier === 'pro' ? 999999 : 100;
  const key = 'key::' + apiKey + '::' + date;
  const count = kv ? parseInt(await kv.get('rate::' + key).catch(() => null) || '0', 10) : 0;
  return new Response(JSON.stringify({
    ok: true,
    tier,
    authenticated: true,
    limit: cap,
    used: count,
    remaining: Math.max(0, cap - count),
    resetUnix: nextMidnightUTC(),
  }), { status: 200, headers: corsHeaders });
}

export const OPTIONS = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': 'https://clearance-iq.com',
      'access-control-allow-headers': 'content-type, x-api-key',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
  });

export default { onRequestGet, OPTIONS };
