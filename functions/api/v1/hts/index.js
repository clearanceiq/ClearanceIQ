export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = String(url.searchParams.get('q') || '').trim();
  const now = new Date().toISOString();
  const session = (context.request.headers.get('x-ciq-session') || '').trim() || 'anon';

  if (!q) {
    return new Response(JSON.stringify({ ok: false, error: 'q required' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const term = q.toLowerCase();
  const DATA = [
    { code: '8518.30.0000', desc: 'Loudspeakers, without enclosure', duty: 'free', adcvd: 'none', keywords: ['8518','loudspeaker','speaker'] },
    { code: '8518.40.0000', desc: 'Headphones, earphones, and combinations', duty: 'free', adcvd: 'low', keywords: ['8518','headphone','earphone','audio','bluetooth'] },
    { code: '3926.90.9980', desc: 'Plastic article, other', duty: '3.1%', adcvd: 'low', keywords: ['3926','plastic','polymer','vinyl','acrylic','pet'] },
    { code: '6402.99.0500', desc: 'Footwear, rubber/plastic', duty: 'free', adcvd: 'none', keywords: ['6402','shoe','footwear','sneaker','boot','sandal'] },
    { code: '8517.12.0095', desc: 'Smartphones and base stations', duty: 'free', adcvd: 'low', keywords: ['8517','phone','smartphone','mobile','cellular'] },
    { code: '9503.00.0073', desc: 'Toys, plastic, <= 50 cents', duty: 'free', adcvd: 'low', keywords: ['9503','toy','games','play','plastic toy'] },
    { code: '7318.15.0085', desc: 'Iron/steel screws/bolts', duty: 'free', adcvd: 'none', keywords: ['7318','bolt','screw','fastener','hardware'] },
    { code: '3304.99.5000', desc: 'Beauty/makeup preparations', duty: 'free', adcvd: 'none', keywords: ['3304','cosmetic','makeup','beauty','skincare'] },
    { code: '9013.80.0010', desc: 'LED devices, other optical', duty: 'free', adcvd: 'none', keywords: ['9013','led','flashlight','headlamp','optical'] },
    { code: '9403.10.0000', desc: 'Metal office furniture', duty: 'free', adcvd: 'none', keywords: ['9403','furniture','cabinet','desk','chair','drawer'] },
    { code: '6110.11.0010', desc: 'Tops, knit/crocheted cotton', duty: 'free', adcvd: 'none', keywords: ['6110','knit','cotton top','shirt','t-shirt','tee'] },
    { code: '6205.20.2060', desc: 'Men’s shirts, manmade fibers', duty: 'free', adcvd: 'low', keywords: ['6205','men shirt','button down','manmade fiber shirt'] },
    { code: '6204.62.2020', desc: 'Women’s trousers, cotton', duty: 'free', adcvd: 'none', keywords: ['6204','women trousers','pants','jeans','denim'] },
    { code: '6211.42.0050', desc: 'Women’s swimwear', duty: 'free', adcvd: 'none', keywords: ['6211','swimwear','bikini','swimsuit','beachwear','coverup'] },
    { code: '6404.19.9010', desc: 'Footwear, tennis/athletic', duty: 'free', adcvd: 'none', keywords: ['6404','sneaker','athletic shoe','running shoe'] },
    { code: '8703.22.0000', desc: 'Motor vehicles, electrical', duty: '2.5%', adcvd: 'low', keywords: ['8703','car','vehicle','sedan','electric vehicle','motor'] }
  ];

  let best = null;
  for (const item of DATA) {
    const exact = (item.keywords || []).some(k => term === k || term.indexOf(k) !== -1);
    if (exact) {
      best = item;
      break;
    }
    if (!best && item.desc.toLowerCase().indexOf(term) !== -1) best = item;
    if (!best && item.code.replace('.', '') === term) best = item;
  }

  const response = best
    ? { ok: true, code: best.code, description: best.desc, dutyRate: best.duty === 'free' ? 0 : parseFloat(best.duty) || 0, adcvd: best.adcvd || 'none', note: '', matchedSource: 'local' }
    : { ok: false, error: 'no_match', message: 'No local match. For official rates, use USITC HTS Search or a licensed broker.' };

  return new Response(JSON.stringify(response), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
