const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type',
};

export async function onRequestGet(context) {
  if (!context.env?.TELEMETRY) {
    return new Response(JSON.stringify({ ok: false, error: 'TELEMETRY binding not available' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(context.request.url);
  const tool = (url.searchParams.get('tool') || '').trim().toLowerCase();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10) || 25, 200);
  const prefix = 'training::';
  let cursor;
  const items = [];
  do {
    const result = await context.env.TELEMETRY.list({ prefix, limit: Math.max(limit, 1000), cursor });
    if (Array.isArray(result.keys)) {
      for (const kv of result.keys) items.push(kv);
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor && items.length < limit);

  const sliced = items.slice(-limit).reverse();
  const rows = await Promise.all(
    sliced.map(async (kv) => {
      try {
        const raw = await context.env.TELEMETRY.get(kv.name);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })
  );

  let report = rows.filter(Boolean);
  if (tool) {
    report = report.filter(row => (row.meta?.tool || row.payload?.tool || '').toLowerCase() === tool);
  }
  report.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return new Response(JSON.stringify({ ok: true, count: report.length, samples: report }), {
    headers: corsHeaders,
  });
}

export async function onRequestPost(context) {
  if (!context.env?.TELEMETRY) {
    return new Response(JSON.stringify({ ok: false, error: 'TELEMETRY binding not available' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'invalid body' }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const ip =
      (context.request.headers.get('cf-connecting-ip') || '').slice(0, 6) + '***';
    const entry = {
      ts: body.ts || Date.now(),
      path: body.path || '',
      type: body.type || '',
      ip,
      sessionToken:
        typeof body.sessionToken === 'string' ? body.sessionToken.slice(0, 32) : '',
      meta: {
        emailMatch: typeof body.email === 'string' && body.email.includes('@'),
        tool: typeof body.tool === 'string' ? body.tool : null,
      },
      payload: body,
      receivedAt: Date.now(),
    };

    context.waitUntil(
      context.env.TELEMETRY.put(`training::${entry.ts}::${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(entry))
    );

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[training-error]', err);
    return new Response(JSON.stringify({ ok: true, error: 'invalid body' }), {
      headers: corsHeaders,
      status: 200,
    });
  }
}

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  });

export default {
  onRequestGet,
  onRequestPost,
  OPTIONS,
};
