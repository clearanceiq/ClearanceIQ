export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  };

  const fallbackResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), { headers, status: status });

  const errorResponse = (message, status = 500) =>
    fallbackResponse({ ok: false, error: message }, status);

  if (url.pathname === '/api/usage/status') {
    try {
      const summary = await aggregateDailyUsage(context);
      return fallbackResponse({ ok: true, ...summary });
    } catch (err) {
      console.error('[usage-status-error]', err);
      return errorResponse('Failed to compute usage status');
    }
  }

  const apiKey = (url.searchParams.get('key') || '').trim();
  if (!apiKey) {
    return errorResponse('Missing required query parameter: key');
  }

  try {
    const usage = await getLast24HoursRequests(apiKey, context);
    return fallbackResponse({ ok: true, key: apiKey, ...usage });
  } catch (err) {
    console.error('[usage-error]', err);
    return errorResponse('Failed to fetch usage');
  }
}

async function getLast24HoursRequests(apiKey, context) {
  // Last 24h window for filtering
  const since = Date.now() - 86_400_000;
  const rlContext = {
    tier: 'unknown',
    key: normalizeKey(apiKey, 'signed'),
    apiKey,
  };

  if (context.env?.RATE_COUNTER) {
    // Aggregate all per-minute counters from the last 24 hours for the K,V pair.
    const listResult = await listKeysWithPrefix({ env: context.env, listInput: { prefix: rlContext.key, limit: 500, reverse: true } });
    let count = 0;

    if (Array.isArray(listResult.keys)) {
      const cutoff = Math.floor(since / 1000);
      count = listResult.keys.reduce((sum, kv) => {
        const value = parseInt(kv.value || '0', 10);
        const updatedAt = kv.expiration || 0;
        // Treat timestamp-based keys that have been refreshed within the last 24h as valid.
        if (updatedAt >= cutoff) {
          return sum + value;
        }
        return sum;
      }, 0);
    }

    return { requests: count, since: new Date(since).toISOString() };
  }

  return { requests: 0, since: new Date(since).toISOString(), note: 'RATE_COUNTER binding not available' };
}

function normalizeKey(apiKey, tier) {
  if (!apiKey) {
    return 'unknown::' + new Date().toISOString().slice(0, 10);
  }
  const safeApiKey = apiKey.replace(/[^a-zA-Z0-9:._-]/g, '_');
  return `${tier}::${safeApiKey}`;
}

async function aggregateDailyUsage(context) {
  const counter = context.env?.RATE_COUNTER;
  if (!counter) {
    return { totalRequestsToday: 0, tiers: {}, note: 'RATE_COUNTER binding not available' };
  }

  const dayPrefix = new Date().toISOString().slice(0, 10);
  const tierPattern = /^([^:]+)::/;
  const now = Date.now();
  const since = new Date(now - 86_400_000).toISOString().slice(0, 10);

  // Collect day-rolling prefixes. A key could include both prefixes if counting older carries over.
  const prefixes = new Set();
  prefixes.add(dayPrefix);
  if (since !== dayPrefix) {
    prefixes.add(since);
  }

  const tiers = {};

  for (const prefix of prefixes) {
    let cursor;
    do {
      const listResult = await listKeysWithPrefix({ env: context.env, listInput: { prefix, limit: 500, cursor } });
      const keys = Array.isArray(listResult.keys) ? listResult.keys : [];
      for (const kv of keys) {
        const tierMatch = kv.name.match(tierPattern);
        const tier = tierMatch ? tierMatch[1] : 'unknown';
        tiers[tier] = (tiers[tier] || 0) + parseInt(kv.value || '0', 10);
      }
      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);
  }

  const totalRequestsToday = Object.values(tiers).reduce((sum, count) => sum + count, 0);
  return { totalRequestsToday, tiers };
}

async function listKeysWithPrefix({ env, listInput }) {
  if (typeof env.RATE_COUNTER.list === 'function') {
    return env.RATE_COUNTER.list({ ...listInput });
  }
  return { keys: [], list_complete: true };
}
