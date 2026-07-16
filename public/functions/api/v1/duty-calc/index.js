export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const value = Math.max(0, parseFloat(String(url.searchParams.get('value') || '0')) || 0);
  const freight = Math.max(0, parseFloat(String(url.searchParams.get('freight') || '0')) || 0);
  const hts = String(url.searchParams.get('hts') || '').trim();

  if (!value || !hts) {
    return new Response(JSON.stringify({ ok: false, error: 'value and hts required' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const dutyRate = hts.startsWith('64') || hts.startsWith('85') ? 0 : 0.035;
  const duty = value * dutyRate;
  const landed = value + freight + duty;

  return new Response(JSON.stringify({
    ok: true,
    value,
    freight,
    hts,
    dutyRate,
    duty,
    landed
  }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
