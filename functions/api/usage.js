const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearanceiq.pages.dev',
  'access-control-allow-headers': 'content-type, x-api-key',
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const ok = (body) => new Response(JSON.stringify({ ok: true, ...body }), { headers: corsHeaders });
  const err = (message, status = 500) =>
    new Response(JSON.stringify({ ok: false, error: message }), { headers: corsHeaders, status });

  if (url.pathname === '/api/usage/status') {
    try {
      const summary = await aggregateDailyUsage(context);
      return ok(summary);
    } catch (e) {
      return err('Failed to compute usage status');
    }
  }

  const apiKey = (url.searchParams.get('key') || '').trim();
  if (!apiKey) return err('Missing required query parameter: key', 400);

  try {
    const usage = await getKeyUsage(apiKey, context);
    return ok({ key: apiKey, ...usage });
  } catch (e) {
    return err('Failed to fetch usage');
  }
}

export const OPTIONS = async () =>
  new Response(null, {
    headers: {
      'access-control-allow-origin': 'https://clearanceiq.pages.dev',
      'access-control-allow-headers': 'content-type, x-api-key',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
    status: 204,
  });

function normalizeKey(apiKey) {
  return (apiKey || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
}

async function getKeyUsage(apiKey, context) {
  if (!context.env?.RATE_COUNTER) {
    return {
      requests: 0,
      since: new Date(Date.now() - 86_400_000).toISOString(),
      note: 'RATE_COUNTER binding not available',
    };
  }

  const safeKey = normalizeKey(apiKey);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const endpoints = ['v1/hts', 'v1/duty-calc', 'v1/bond'];
  const byEndpoint = {};

  for (const day of [today, yesterday]) {
    for (const endpoint of endpoints) {
      const prefix = `usage::${day}::signed::${safeKey}::${endpoint}`;
      let cursor;
      do {
        const listResult = await context.env.RATE_COUNTER.list({ prefix, limit: 500, cursor });
        const keys = Array.isArray(listResult.keys) ? listResult.keys : [];
        for (const kv of keys) {
          byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
        }
        cursor = listResult.list_complete ? undefined : listResult.cursor;
      } while (cursor);
    }
  }

  const totalRequestsToday = Object.values(byEndpoint).reduce((sum, val) => sum + val, 0);
  return { requests: totalRequestsToday, since: new Date(Date.now() - 86_400_000).toISOString(), byEndpoint };
}

async function aggregateDailyUsage(context) {
  if (!context.env?.RATE_COUNTER) {
    return { totalRequestsToday: 0, tiers: {}, note: 'RATE_COUNTER binding not available' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const tiers = {};
  const prefixes = new Set();
  ['signed', 'anonymous'].forEach((tier) => {
    prefixes.add(`usage::${today}::${tier}`);
    prefixes.add(`usage::${yesterday}::${tier}`);
  });

  for (const prefix of prefixes) {
    let cursor;
    do {
      const listResult = await context.env.RATE_COUNTER.list({ prefix, limit: 500, cursor });
      const keys = Array.isArray(listResult.keys) ? listResult.keys : [];
      for (const kv of keys) {
        const m = kv.name.match(/^usage::\d{4}-\d{2}-\d{2}::([^:]+)::/);
        const tier = m ? m[1] : 'unknown';
        tiers[tier] = (tiers[tier] || 0) + 1;
      }
      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);
  }

  const totalRequestsToday = Object.values(tiers).reduce((sum, val) => sum + val, 0);
  return { totalRequestsToday, tiers };
}
