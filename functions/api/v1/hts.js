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
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!query) {
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
      { code: '8518.30.0000', desc: 'Loudspeakers', keywords: ['loudspeaker', 'speaker'] },
      { code: '8518.40.0000', desc: 'Headphones and earphones', keywords: ['headphone', 'earphone', 'headset'] },
      { code: '3926.90.9980', desc: 'Plastic article, other', keywords: ['plastic'] },
      { code: '9403.10.0000', desc: 'Metal office furniture', keywords: ['furniture', 'desk', 'cabinet'] },
      { code: '7318.15.0085', desc: 'Screws and bolts', keywords: ['bolt', 'screw', 'fastener'] },
      { code: '9503.00.0073', desc: 'Toys, plastic, <= 50 cents', keywords: ['toy', 'toys'] },
      { code: '6402.99.0500', desc: 'Footwear', keywords: ['shoe', 'shoes', 'footwear'] },
      { code: '8517.12.0095', desc: 'Smartphones', keywords: ['phone', 'smartphone', 'mobile'] },
      { code: '9013.80.0010', desc: 'LED devices', keywords: ['led', 'light', 'display'] },
      { code: '3304.99.5000', desc: 'Beauty and makeup preparations', keywords: ['beauty', 'makeup', 'cosmetic'] },
      { code: '8703.10.0000', desc: 'Vehicles; golf cars and similar', keywords: ['golf', 'vehicle'] },
      { code: '8516.32.0000', desc: 'Hair dryers', keywords: ['hair dryer', 'hair dryer', 'blower'] },
      { code: '7013.49.9050', desc: 'Glassware; other', keywords: ['glass', 'glassware'] },
      { code: '6211.42.0040', desc: 'Women swimwear', keywords: ['swim', 'swimsuit', 'bikini'] },
      { code: '9506.91.0010', desc: 'Bicycles; other', keywords: ['bicycle', 'bike', 'cycling'] },
      { code: '9001.30.0000', desc: 'Contact lenses', keywords: ['contact', 'lens', 'optical'] },
      { code: '8421.23.0000', desc: 'Oil and petrol filters', keywords: ['oil filter', 'filter'] },
      { code: '3924.90.8000', desc: 'Plastic; other', keywords: ['plastic', 'polymer'] },
      { code: '4011.10.0010', desc: 'Pneumatic tires, new', keywords: ['tire', 'tyre', 'wheel'] },
    ];

    const ADCVD_NOTES = {
      none: '',
      low: 'This category is sometimes flagged for AD/CVD checks. Confirm before booking.',
    };

    function matchScore(row, q) {
      const lower = `${row.code} ${row.desc}`.toLowerCase();
      const hay = lower + ' ' + (row.keywords || []).join(' ');
      const compactCode = row.code.replace(/\./g, '');
      if (lower.includes(q) || compactCode.startsWith(q) || compactCode === q) return 2;
      if ((row.keywords || []).some((k) => k.includes(q))) return 1;
      return 0;
    }

    const best = DATA
      .map((row) => ({ row, score: matchScore(row, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (!best) {
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

    const { row: match } = best;
    await logUsage(tier, 'v1/hts', context, 'ok');
    return new Response(
      JSON.stringify({
        ok: true,
        code: match.code,
        description: match.desc,
        dutyRate: 0,
        adcvd: 'none',
        note: ADCVD_NOTES.none,
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
