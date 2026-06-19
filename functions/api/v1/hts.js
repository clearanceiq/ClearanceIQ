export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
  try {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) return new Response(JSON.stringify({ ok: false, error: 'q required' }), { headers, status: 400 });
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
      { code: '3304.99.5000', desc: 'Beauty/makeup preparations', duty: 0, adcvd: 'none' }
    ];
    const ADCVD_NOTES = { none: '', low: 'This category is sometimes flagged for AD/CVD checks. Confirm before booking.' };
    const match = DATA.find((r) => {
      const hay = `${r.code} ${r.desc}`.toLowerCase();
      return hay.includes(q) || r.code.replace(/\./g, '').includes(q.replace(/\./g, ''));
    });
    if (!match) return new Response(JSON.stringify({ ok: false, error: 'no_match' }), { headers });
    return new Response(JSON.stringify({
      ok: true,
      code: match.code,
      description: match.desc,
      dutyRate: match.duty,
      adcvd: match.adcvd,
      note: ADCVD_NOTES[match.adcvd] || ''
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers, status: 400 });
  }
}
