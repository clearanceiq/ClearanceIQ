export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, hint: 'POST JSON event body here' }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': 'https://clearance-iq.com' },
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
