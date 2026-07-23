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
    const env = context.env || {};
    // Prefer direct KV; fall back to function binding if it ever exists.
    const kvWriter = env.TELEMETRY || (typeof env.TELEMETRY_LOG === 'function' ? { put: env.TELEMETRY_LOG } : null);
    if (kvWriter) {
      const key = `events::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`;
      await kvWriter.put(key, JSON.stringify({ tool, q, session, receivedAt: now, ts: Date.now() }));
      payload.storage = 'persisted';
    } else {
      payload.storage = 'not_persisted';
    }
  } catch (err) {
    payload.storage = 'not_persisted';
    payload.storageError = err && err.message ? err.message : String(err);
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
