import { consumeLimit, resolveRateLimitContext } from '../rate-limit.js';

function cors(headers = {}) {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-api-key',
    ...headers,
  };
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier, apiKey } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = consumeLimit(key, cap);

    if (limit.limited) {
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
          }),
          status: 429,
        }
      );
    }

    const url = new URL(context.request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) {
      return new Response(
        JSON.stringify({ ok: false, error: 'q required' }),
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
      return new Response(
        JSON.stringify({ ok: false, error: 'no_match' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
          }),
        }
      );
    }

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
        }),
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers: cors(), status: 400 });
  }
}

export const OPTIONS = async () => new Response(null, { headers: cors(), status: 204 });
