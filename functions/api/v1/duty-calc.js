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
  const rawIp = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
  const anonIp = rawIp.length >= 5 ? rawIp.slice(0, 3) + '***' + rawIp.slice(-3) : '***';
  const date = new Date().toISOString().slice(0, 10);
  const tag =
    tier === 'signed'
      ? (context.request.headers.get('X-API-Key') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 16)
      : anonIp;
  const entry = JSON.stringify({ ts: new Date().toISOString(), tier, endpoint, ip: anonIp, result: result || 'ok' });
  const key = `usage::${date}::${tier}::${tag}::${endpoint}`;
  if (context.env?.RATE_COUNTER) {
    try {
      await context.env.RATE_COUNTER.put(key, entry, { expirationTtl: 72 * 60 * 60 });
    } catch { /* no-op */ }
  }
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = consumeLimit(key, cap, context.env);

    if (limit.limited) {
      await logUsage(tier, 'v1/duty-calc', context, 'rate_limit');
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
    const value = parseFloat(url.searchParams.get('value') || '0');
    const htsRaw = (url.searchParams.get('hts') || '').replace(/\./g, '').slice(0, 4);
    const origin = url.searchParams.get('origin') || '';
    const freight = parseFloat(url.searchParams.get('freight') || '0');
    const s301Raw = url.searchParams.get('s301Rate') || '0';
    const s301Rate = s301Raw === 'other' ? 0 : parseFloat(s301Raw);

    const dutyRates = {
      '8518': 0,
      '8517': 0,
      '9503': 0,
      '6402': 0,
      '7318': 0,
      '3926': 0.031,
      '9403': 0,
      '9013': 0,
      '3304': 0,
      '7326': 0.052,
    };
    const generalRate = dutyRates[htsRaw] || 0;
    const duty = value * generalRate;
    const section301 = value * s301Rate;
    const landed = value + freight + duty + section301;
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const rows = [
      ['Product value', '$' + fmt(value)],
      ['Freight / insurance', '$' + fmt(freight)],
      ['General duty rate', (generalRate * 100).toFixed(1) + '%'],
      ['General duty', '$' + fmt(duty)],
      ['Section 301', (s301Rate * 100).toFixed(1) + '%'],
      ['Section 301 duty', '$' + fmt(section301)],
      ['Landed cost (before broker/storage)', '$' + fmt(landed)],
    ];

    await logUsage(tier, 'v1/duty-calc', context, 'ok');
    return new Response(
      JSON.stringify({
        ok: true,
        inputs: { value, hts: htsRaw, origin, freight, s301Rate },
        generalRate,
        duty,
        section301,
        landed,
        table: rows,
        note: 'Reference only. Actual rates depend on HTS special provisions, FTAs, and broker classification.',
      }),
      {
        headers: cors({
          'x-rate-limit-remaining': String(limit.remaining),
          'x-rate-limit-limit': String(limit.limit),
          'x-rate-limit-tier': tier,
          'x-rate-limit-reset': String(limit.resetUnix),
        }),
      }
    );
  } catch (err) {
    await logUsage('unknown', 'v1/duty-calc', context, 'error');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers: cors(), status: 400 });
  }
}

export const OPTIONS = async () => new Response(null, { headers: cors(), status: 204 });
