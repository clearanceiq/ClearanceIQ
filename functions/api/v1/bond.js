export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    const type = (url.searchParams.get('type') || 'single').toLowerCase();
    const value = parseFloat(url.searchParams.get('value') || '0');
    const risk = parseFloat(url.searchParams.get('risk') || '1.5');
    if (!value || value <= 0) return new Response(JSON.stringify({ ok: false, error: 'value must be > 0' }), { headers, status: 400 });
    const minBond = type === 'continuous' ? Math.max(50000, value) : value;
    const premiumRate = 0.015 * risk;
    const premium = minBond * premiumRate;
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
    return new Response(JSON.stringify(data), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers, status: 400 });
  }
}
