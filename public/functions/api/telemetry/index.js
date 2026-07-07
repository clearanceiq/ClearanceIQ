const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type',
};

function buildToolReport(events) {
  const now = Date.now();
  const sessions = new Map();
  const toolEvents = new Map();
  const seenBySessionAndTool = new Map();

  for (const event of events) {
    const session = event.sessionToken;
    const tool = event.meta?.tool || event.payload?.tool || 'unknown';
    if (!tool || tool === 'null') continue;

    if (!toolEvents.has(tool)) toolEvents.set(tool, []);
    toolEvents.get(tool).push(event);

    if (session) {
      const key = `${session}::${tool}`;
      if (!seenBySessionAndTool.has(key)) {
        seenBySessionAndTool.set(key, true);
        if (!sessions.has(tool)) sessions.set(tool, new Set());
        sessions.get(tool).add(session);
      }
    }
  }

  const report = [];
  for (const [tool, eventList] of toolEvents.entries()) {
    const unique = sessions.has(tool) ? sessions.get(tool).size : 0;
    const latest = eventList.sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
    report.push({
      tool,
      events: eventList.length,
      unique_sessions: unique,
      latest_ts: latest?.ts || null,
      latest_path: latest?.path || null,
      retention_hours: latest ? Math.max(0, Math.round((now - (latest.ts || now)) / (1000 * 60 * 60))) : null,
    });
  }

  report.sort((a, b) => b.events - a.events || b.unique_sessions - a.unique_sessions);
  return report;
}

export async function onRequestGet(context) {
  if (!context.env?.TELEMETRY) {
    return new Response(JSON.stringify({ ok: false, error: 'TELEMETRY binding not available' }), {
      status: 200,
      headers: corsHeaders,
    });
  }
  const url = new URL(context.request.url);
  const pathname = url.pathname.toLowerCase();

  if (pathname.endsWith('/report') || pathname.endsWith('/telemetry/report')) {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
    const prefix = 'events::';
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

    const report = buildToolReport(rows.filter(Boolean));
    return new Response(JSON.stringify({ ok: true, generatedAt: Date.now(), count: rows.filter(Boolean).length, report }), {
      headers: corsHeaders,
    });
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 200);
  const prefix = 'events::';
  let cursor;
  const items = [];
  do {
    const result = await context.env.TELEMETRY.list({ prefix, limit: Math.max(limit, 200), cursor });
    if (Array.isArray(result.keys)) {
      for (const kv of result.keys) {
        items.push(kv);
      }
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

  return new Response(JSON.stringify({ ok: true, count: rows.filter(Boolean).length, events: rows.filter(Boolean) }), {
    headers: corsHeaders,
  });
}

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': 'https://clearance-iq.com',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  });

export async function onRequestPost(context) {
  if (!context.env?.TELEMETRY) {
    return new Response(JSON.stringify({ ok: false, error: 'TELEMETRY binding not available' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    const ip =
      (context.request.headers.get('cf-connecting-ip') || '').slice(0, 6) + '***';
    const event = {
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
      context.env.TELEMETRY.put(`events::${event.ts}::${Math.random().toString(36).slice(2, 8)}`, JSON.stringify(event))
    );

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('[telemetry-error]', err);
    return new Response(JSON.stringify({ ok: true, error: 'invalid body' }), {
      headers: corsHeaders,
      status: 200,
    });
  }
}

export default {
  onRequestGet,
  onRequestPost,
  OPTIONS,
};
