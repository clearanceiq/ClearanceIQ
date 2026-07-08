const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-api-key',
  'content-type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getKV(context) {
  return context.env && (context.env.LEADS || context.env.Leads);
}

function getKey(context) {
  return (context.request.headers.get('X-API-Key') || '').trim();
}

async function parseBody(req) {
  try {
    const txt = await req.text();
    return txt ? JSON.parse(txt) : {};
  } catch (e) { return {}; }
}

// POST /api/history  -> save a lookup record for the signed user
// GET  /api/history?limit=20 -> list recent records
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const kv = getKV(context);
  const key = getKey(context);
  if (!kv) return json({ ok: false, error: 'storage unavailable' }, 500);
  if (!key) return json({ ok: false, error: 'api key required' }, 401);

  const body = await parseBody(context.request);
  const entry = {
    ts: Date.now(),
    tool: String(body.tool || 'unknown'),
    input: String(body.input || '').slice(0, 200),
    label: String(body.label || '').slice(0, 200),
    result: String(body.result || '').slice(0, 400),
  };

  try {
    const listKey = 'history::' + key;
    let list = [];
    const raw = await kv.get(listKey);
    if (raw) {
      try { list = JSON.parse(raw); } catch (e) { list = []; }
    }
    list.unshift(entry);
    if (list.length > 100) list = list.slice(0, 100); // cap stored history
    await kv.put(listKey, JSON.stringify(list), { expirationTtl: 180 * 24 * 60 * 60 });
    return json({ ok: true, count: list.length });
  } catch (e) {
    return json({ ok: false, error: 'save failed' }, 500);
  }
}

export async function onRequestGet(context) {
  const kv = getKV(context);
  const key = getKey(context);
  if (!kv) return json({ ok: false, error: 'storage unavailable' }, 500);
  if (!key) return json({ ok: false, error: 'api key required' }, 401);

  const limit = Math.min(parseInt((new URL(context.request.url).searchParams.get('limit') || '20'), 10) || 20, 100);
  try {
    const raw = await kv.get('history::' + key);
    let list = [];
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    return json({ ok: true, count: list.length, items: list.slice(0, limit) });
  } catch (e) {
    return json({ ok: false, error: 'read failed' }, 500);
  }
}
