export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 1000);
  const token = (context.request.headers.get('x-email-token') || '').trim();

  const expected = context.env && context.env.DASHBOARD_TOKEN ? String(context.env.DASHBOARD_TOKEN).trim() : null;
  if (expected) {
    if (token !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      });
    }
  } else if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  if (!context.env || !context.env.EMAIL_SIGNUPS) {
    return new Response(JSON.stringify({ ok: true, items: [], note: 'EMAIL_SIGNUPS binding not available' }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const items = [];
  try {
    let cursor;
    do {
      const page = await context.env.EMAIL_SIGNUPS.list({ limit: 100, cursor });
      for (const key of page.keys) {
        const raw = await context.env.EMAIL_SIGNUPS.get(key.name);
        if (!raw) continue;
        try { items.push(JSON.parse(raw)); } catch { /* skip */ }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor && items.length < limit);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'signup_list_failed', detail: err && err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }

  const sorted = items
    .filter(it => it && it.email)
    .sort((a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0))
    .slice(0, limit);

  return new Response(JSON.stringify({ ok: true, items: sorted, count: sorted.length }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export async function onRequestPost(context) {
  const contentType = context.request.headers.get('content-type') || '';
  let body = {};
  if (contentType.includes('application/json')) {
    body = await context.request.json().catch(() => ({}));
  } else {
    const form = await context.request.formData().catch(() => null);
    if (form) body = Object.fromEntries(form.entries());
  }
  const email = (body.email || '').toString().trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'valid_email_required' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  }
  const signup = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ts: Date.now(),
    email,
    source: (body.source || 'website').toString(),
    tier: (body.tier || 'free').toString(),
  };
  if (context.env && context.env.EMAIL_SIGNUPS) {
    try { await context.env.EMAIL_SIGNUPS.put(signup.id, JSON.stringify(signup)); } catch (e) { /* ignore */ }
  }
  return new Response(JSON.stringify({ ok: true, signup }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export const OPTIONS = async () => new Response(null, {
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-email-token',
  },
  status: 204,
});

export default { onRequestGet, onRequestPost, OPTIONS };
