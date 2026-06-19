export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.pathname === '/v1/bond') {
    try {
      const type = (url.searchParams.get('type') || 'single').toLowerCase();
      const value = parseFloat(url.searchParams.get('value') || '0');
      const risk = parseFloat(url.searchParams.get('risk') || '1.5');
      if (!value || value <= 0) {
        return new Response(JSON.stringify({ ok: false, error: 'value must be > 0' }), {
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
          status: 400
        });
      }
      const minBond = type === 'continuous' ? Math.max(50000, value) : value;
      const premiumRate = 0.015 * risk;
      const premium = minBond * premiumRate;
      const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const data = {
        ok: true,
        bondType: type === 'continuous' ? 'continuous' : 'single',
        assessedValue: minBond,
        premiumRate,
        premium,
        formatted: {
          assessedValue: '$' + fmt(minBond),
          premiumRate: (premiumRate * 100).toFixed(2) + '%',
          premium: '$' + fmt(premium)
        }
      };
      return new Response(JSON.stringify(data), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        status: 400
      });
    }
  }
  return new Response(JSON.stringify({ ok: true, hint: 'GET /v1/bond?type=single&value=50000&risk=1.5' }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const ip = context.request.headers.get('cf-connecting-ip') || '';
    const event = {
      ts: body.ts || Date.now(),
      path: body.path || '',
      type: body.type || '',
      ip: ip.slice(0, 6) + '***',
      payload: body,
    };
    console.log('[telemetry]', JSON.stringify(event));
  } catch (err) {
    console.error('[telemetry-error]', err);
  }
  return new Response(null, { status: 204 });
}
