export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    const value = parseFloat(url.searchParams.get('value') || '0');
    const htsRaw = (url.searchParams.get('hts') || '').replace(/\./g, '').slice(0, 4);
    const origin = url.searchParams.get('origin') || '';
    const freight = parseFloat(url.searchParams.get('freight') || '0');
    const s301Raw = url.searchParams.get('s301Rate') || '0';
    const s301Rate = s301Raw === 'other' ? 0 : parseFloat(s301Raw);
    const dutyRates = { '8518': 0, '8517': 0, '9503': 0, '6402': 0, '7318': 0, '3926': 0.031, '9403': 0, '9013': 0, '3304': 0, '7326': 0.052 };
    const generalRate = dutyRates[htsRaw] || 0;
    const duty = value * generalRate;
    const section301 = value * s301Rate;
    const landed = value + freight + duty + section301;
    const rows = [
      ['Product value', '$' + fmt(value)],
      ['Freight / insurance', '$' + fmt(freight)],
      ['General duty rate', (generalRate * 100).toFixed(1) + '%'],
      ['General duty', '$' + fmt(duty)],
      ['Section 301', (s301Rate * 100).toFixed(1) + '%'],
      ['Section 301 duty', '$' + fmt(section301)],
      ['Landed cost (before broker/storage)', '$' + fmt(landed)]
    ];
    return new Response(JSON.stringify({
      ok: true,
      inputs: { value, hts: htsRaw, origin, freight, s301Rate },
      generalRate,
      duty,
      section301,
      landed,
      table: rows,
      note: 'Reference only. Actual rates depend on HTS special provisions, FTAs, and broker classification.'
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers, status: 400 });
  }
}
