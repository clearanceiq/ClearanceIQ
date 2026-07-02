export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const type = String(url.searchParams.get('type') || 'single');
  const value = Math.max(0, parseFloat(String(url.searchParams.get('value') || '0')) || 0);
  const risk = parseFloat(String(url.searchParams.get('risk') || '1.5')) || 1.5;

  if (!value) {
    return new Response(JSON.stringify({ ok: false, error: 'value required' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const isContinuous = type === 'continuous';
  const assessedValue = value;
  const premiumRate = Math.max(0.01, Math.min(risk / 100, 0.15));
  const premium = isContinuous ? Math.max(300, Math.round(assessedValue * premiumRate)) : Math.max(75, Math.round(assessedValue * premiumRate / 2));
  const bondType = isContinuous ? 'continuous' : 'single';

  return new Response(JSON.stringify({
    ok: true,
    bondType,
    assessedValue,
    premiumRate,
    premium
  }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
