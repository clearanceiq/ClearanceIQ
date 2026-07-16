export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const tool = String(url.searchParams.get('tool') || 'general');
  const q = String(url.searchParams.get('q') || '');
  const now = new Date().toISOString();
  const session = (context.request.headers.get('x-ciq-session') || '').trim() || 'anon';

  const payload = {
    ok: true,
    tool,
    q,
    session,
    receivedAt: now,
    message: 'Telemetry received for tool interaction. Accepts q, tool, and session for later correlation.'
  };

  try {
    if (context.env && typeof context.env.TELEMETRY_LOG === 'function') {
      await context.env.TELEMETRY_LOG(JSON.stringify({ tool, q, session, receivedAt: now }));
    }
  } catch (err) {
    payload.storage = 'not_persisted';
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
