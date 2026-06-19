import { consumeLimit, resolveRateLimitContext } from '../../rate-limit.js';

function cors(headers = {}) {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-api-key',
    ...headers,
  };
}

async function logUsage(tier, endpoint, context, result) {
  const ipRaw = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const anonIp = ipRaw.length >= 5 ? ipRaw.slice(0, 3) + '***' + ipRaw.slice(-3) : '***';
  const date = new Date().toISOString().slice(0, 10);
  const tag =
    tier === 'signed'
      ? (context.request.headers.get('X-API-Key') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 16)
      : anonIp;
  const entry = JSON.stringify({ ts: new Date().toISOString(), tier, endpoint, ip: anonIp, result: result || 'ok' });
  const key = `usage::${date}::${tier}::${tag}::${endpoint}::${Date.now()}`;
  if (context.env?.RATE_COUNTER) {
    try { await context.env.RATE_COUNTER.put(key, entry); } catch { /* no-op */ }
  }
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = consumeLimit(key, cap, context.env);

    if (limit.limited) {
      await logUsage(tier, 'v1/bond', context, 'rate_limit');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'rate_limit',
          tier,
          remaining: 0,
          used: limit.limit,
          limit: limit.limit,
          resetAt: limit.resetAt,
          upgrade: 'Sign up for free at / and get 100/day, or go Pro at /api-pricing for unlimited.',
        }),
        {
          headers: cors({
            'retry-after': '86400',
            'x-rate-limit-remaining': '0',
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
          status: 429,
        }
      );
    }

    const url = new URL(context.request.url);
    const type = (url.searchParams.get('type') || 'single').toLowerCase();
    const value = parseFloat(url.searchParams.get('value') || '0');
    const risk = parseFloat(url.searchParams.get('risk') || '1.5');

    if (!value || value <= 0) {
      await logUsage(tier, 'v1/bond', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'value must be > 0' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
          }),
          status: 400,
        }
      );
    }

    const minBond = type === 'continuous' ? Math.max(50000, value) : value;
    const premiumRate = 0.015 * risk;
    const premium = minBond * premiumRate;
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    await logUsage(tier, 'v1/bond', context, 'ok');
    return new Response(
      JSON.stringify({
        ok: true,
        bondType: type === 'continuous' ? 'continuous' : 'single',
        assessedValue: minBond,
        premiumRate,
        premium,
        formatted: {
          assessedValue: '$' + fmt(minBond),
          premiumRate: (premiumRate * 100).toFixed(2) + '%',
          premium: '$' + fmt(premium),
        },
      }),
      {
        headers: cors({
          'x-rate-limit-remaining': String(limit.remaining),
          'x-rate-limit-limit': String(limit.limit),
          'x-rate-limit-tier': tier,
        }),
      }
    );
  } catch (err) {
    await logUsage('unknown', 'v1/bond', context, 'error');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers: cors(), status: 400 });
  }
}

export const OPTIONS = async () => new Response(null, { headers: cors(), status: 204 });
