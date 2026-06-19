import { consumeLimit, resolveRateLimitContext } from '../rate-limit.js';

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

  const logValue = JSON.stringify({ ts: new Date().toISOString(), tier, endpoint, ip: anonIp, result: result || 'ok' });
  const logKey = `usage_log::${date}::${tier}::${tag}::${endpoint}::${Date.now()}`;
  const countKey = `usage::${date}::${tier}::${tag}::${endpoint}`;

  if (context.env?.RATE_COUNTER) {
    try {
      await context.env.RATE_COUNTER.put(logKey, logValue);
      const raw = await context.env.RATE_COUNTER.get(countKey);
      const n = parseInt(raw || '0', 10) + 1;
      await context.env.RATE_COUNTER.put(countKey, String(n), { expirationTtl: 72 * 60 * 60 });
    } catch { /* no-op */ }
  }
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = consumeLimit(key, cap, context.env);

    if (limit.limited) {
      await logUsage(tier, 'v1/hts', context, 'rate_limit');
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
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'q required' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
          status: 400,
        }
      );
    }

    const DATA = [
      { code: '8518.30.0000', desc: 'Loudspeakers, without enclosure', duty: 0, adcvd: 'none' },
      { code: '8518.40.0000', desc: 'Headphones, earphones, and combinations', duty: 0, adcvd: 'none' },
      { code: '3926.90.9980', desc: 'Plastic article, other', duty: 0.031, adcvd: 'low' },
      { code: '9403.10.0000', desc: 'Metal office furniture', duty: 0, adcvd: 'none' },
      { code: '7318.15.0085', desc: 'Iron/steel screws/bolts', duty: 0, adcvd: 'none' },
      { code: '9503.00.0073', desc: 'Toys, plastic, <= 50 cents', duty: 0, adcvd: 'low' },
      { code: '6402.99.0500', desc: 'Footwear, rubber/plastic', duty: 0, adcvd: 'none' },
      { code: '8517.12.0095', desc: 'Smartphones and base stations', duty: 0, adcvd: 'low' },
      { code: '9013.80.0010', desc: 'LED devices, other optical', duty: 0, adcvd: 'none' },
      { code: '3304.99.5000', desc: 'Beauty/makeup preparations', duty: 0, adcvd: 'none' },
    ];
    const ADCVD_NOTES = {
      none: '',
      low: 'This category is sometimes flagged for AD/CVD checks. Confirm before booking.',
    };

    const match = DATA.find((r) => {
      const hay = `${r.code} ${r.desc}`.toLowerCase();
      return hay.includes(q) || r.code.replace(/\./g, '').includes(q.replace(/\./g, ''));
    });

    if (!match) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'no_match' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining - 1),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
        }
      );
    }

    await logUsage(tier, 'v1/hts', context, 'ok');
    return new Response(
      JSON.stringify({
        ok: true,
        code: match.code,
        description: match.desc,
        dutyRate: match.duty,
        adcvd: match.adcvd,
        note: ADCVD_NOTES[match.adcvd] || '',
      }),
      {
        headers: cors({
          'x-rate-limit-remaining': String(limit.remaining - 1),
          'x-rate-limit-limit': String(limit.limit),
          'x-rate-limit-tier': tier,
          'x-rate-limit-reset': String(limit.resetUnix),
        }),
      }
    );
  } catch (err) {
    await logUsage('unknown', 'v1/hts', context, 'error');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers: cors(), status: 400 });
  }
}

export const OPTIONS = async () => new Response(null, { headers: cors(), status: 204 });
