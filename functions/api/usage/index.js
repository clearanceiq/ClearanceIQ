const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type, x-api-key',
};

const rateMemory = new Map();

function rateKeyFor(ctx) {
  const ip =
    (ctx.request.headers.get('CF-Connecting-IP') || 'unknown').replace(
      /[^a-zA-Z0-9:._-]/g,
      '_'
    );
  const apiKey = (ctx.request.headers.get('X-API-Key') || '').trim();
  return apiKey ? `signed::${apiKey}` : `anon::${ip}`;
}

function consumeRate(ctx, dailyCap) {
  const key = rateKeyFor(ctx);
  const today = new Date().toISOString().slice(0, 10);

  if (!rateMemory.has(today)) {
    rateMemory.set(today, {});
  }

  const dayMap = rateMemory.get(today);
  if (!dayMap.has(key)) {
    dayMap.set(key, { count: 0 });
  }

  const entry = dayMap.get(key);
  entry.count += 1;

  const remaining = Math.max(0, dailyCap - entry.count);
  const limited = entry.count > dailyCap;
  const resetUnix = nextMidnightUTC();

  return {
    remaining,
    limited,
    limit: dailyCap,
    used: entry.count,
    resetUnix,
  };
}

function nextMidnightUTC() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor(next.getTime() / 1000);
}

function response(body, extraHeaders = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
  const safeLimit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 20;
  const reqKey = (url.searchParams.get('key') || '').trim();

  if (!reqKey) {
    return response({ ok: false, error: 'Missing x-api-key or ?key' }, {}, 400);
  }

  const rateResult = consumeRate(context, reqKey ? 200 : 5);
  const rateLimitHeaders = {
    'x-rate-limit-remaining': String(rateResult.remaining),
    'x-rate-limit-limit': String(rateResult.limit),
    'x-rate-limit-reset': String(rateResult.resetUnix),
    'x-rate-limit-tier': reqKey ? 'signed' : 'anonymous',
  };

  if (rateResult.limited) {
    return response(
      { ok: false, error: 'rate limit exceeded', retryAfter: rateResult.resetUnix },
      rateLimitHeaders,
      429
    );
  }

  const tier = reqKey ? 'signed' : 'anonymous';

  if (!context.env?.TELEMETRY) {
    return response({
      keyPresent: !!reqKey,
      tier,
      note: 'TELEMETRY binding not available',
      count: 0,
      events: [],
    }, rateLimitHeaders);
  }

  const prefix = 'events::';
  let cursor;
  const pages = [];
  try {
    do {
      const page = await context.env.TELEMETRY.list({ prefix, limit: Math.max(safeLimit, 200), cursor });
      if (Array.isArray(page.keys)) {
        pages.push(...page.keys);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor && pages.length < safeLimit);
  } catch (err) {
    return response(
      { ok: false, error: 'TELEMETRY list failed', detail: err && err.message },
      rateLimitHeaders,
      500
    );
  }

  const sliced = pages.slice(-safeLimit).reverse();
  const rows = [];
  for (const kv of sliced) {
    try {
      const raw = await context.env.TELEMETRY.get(kv.name);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      rows.push(parsed);
    } catch {
      // skip malformed event
    }
  }

  const byType = {};
  const byTool = {};
  for (const event of rows) {
    byType[event.type || 'unknown'] = (byType[event.type || 'unknown'] || 0) + 1;
    if (event.meta && typeof event.meta.tool === 'string') {
      byTool[event.meta.tool] = (byTool[event.meta.tool] || 0) + 1;
    }
  }

  return response(
    {
      keyPresent: !!reqKey,
      tier,
      count: rows.length,
      since: rows.length ? rows[rows.length - 1]?.ts : null,
      byType,
      byTool,
      events: rows,
    },
    rateLimitHeaders
  );
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

export const onRequestPost = () =>
  new Response(JSON.stringify({ ok: false, error: 'use GET for usage' }), {
    status: 405,
    headers: corsHeaders,
  });

export default {
  onRequestGet,
  OPTIONS,
  onRequestPost,
};
