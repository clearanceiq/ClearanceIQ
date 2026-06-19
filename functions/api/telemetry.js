export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const cors = { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } };
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (url.pathname === '/v1/bond') {
    try {
      const type = (url.searchParams.get('type') || 'single').toLowerCase();
      const value = parseFloat(url.searchParams.get('value') || '0');
      const risk = parseFloat(url.searchParams.get('risk') || '1.5');
      if (!value || value <= 0) return new Response(JSON.stringify({ ok: false, error: 'value must be > 0' }), { ...cors, status: 400 });
      const minBond = type === 'continuous' ? Math.max(50000, value) : value;
      const premiumRate = 0.015 * risk;
      const premium = minBond * premiumRate;
      return new Response(JSON.stringify({
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
      }), cors);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { ...cors, status: 400 });
    }
  }

  if (url.pathname === '/v1/hts') {
    try {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (!q) return new Response(JSON.stringify({ ok: false, error: 'q required' }), { ...cors, status: 400 });
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
      const match = DATA.find(r => {
        const hay = `${r.code} ${r.desc}`.toLowerCase();
        return hay.includes(q) || r.code.replace(/\./g, '').includes(q.replace(/\./g, ''));
      });
      if (!match) return new Response(JSON.stringify({ ok: false, error: 'no_match' }), cors);
      return new Response(JSON.stringify({
        ok: true,
        code: match.code,
        description: match.desc,
        dutyRate: match.duty,
        adcvd: match.adcvd,
        note: ADCVD_NOTES[match.adcvd] || ''
      }), cors);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { ...cors, status: 400 });
    }
  }

  if (url.pathname === '/v1/duty-calc') {
    try {
      const value = parseFloat(url.searchParams.get('value') || '0');
      const htsRaw = (url.searchParams.get('hts') || '').replace(/\./g, '').slice(0, 4);
      const origin = url.searchParams.get('origin') || '';
      const freight = parseFloat(url.searchParams.get('freight') || '0');
      const s301Raw = url.searchParams.get('s301Rate') || '0';
      const s301Rate = s301Raw === 'other' ? 0 : parseFloat(s301Raw);
      const dutyRates = {
        '8518': 0, '8517': 0, '9503': 0, '6402': 0,
        '7318': 0, '3926': 0.031, '9403': 0,
        '9013': 0, '3304': 0, '7326': 0.052
      };
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
      }), cors);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { ...cors, status: 400 });
    }
  }

  // Default manifest for discoverability (no binding)
  return new Response(JSON.stringify({
    ok: true,
    routes: ['/v1/bond', '/v1/hts?q=', '/v1/duty-calc?value=&hts=&origin=&freight=&s301Rate=']
  }), cors);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const event = {
      ts: body.ts || Date.now(),
      path: body.path || '',
      type: body.type || '',
      ip: (context.request.headers.get('cf-connecting-ip') || '').slice(0, 6) + '***',
      payload: body,
    };
    console.log('[telemetry]', JSON.stringify(event));
  } catch (err) {
    console.error('[telemetry-error]', err);
  }
  return new Response(null, { status: 204 });
}
