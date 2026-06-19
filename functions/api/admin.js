// Admin API for key management.
// Guarded by x-admin-key header against ADMIN_KEY env var or hardcoded fallback.
// Actions: list, revoke, update tier, reset daily usage.

const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-admin-key',
};

async function parseBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getAdminKey(env) {
  if (env && env.ADMIN_KEY && typeof env.ADMIN_KEY === 'function') {
    try {
      const v = env.ADMIN_KEY('ADMIN_KEY');
      if (v) return String(v);
    } catch {
      // fall through
    }
  }
  if (env && env.ADMIN_KEY) return String(env.ADMIN_KEY);
  return 'ciq_admin_2026';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { headers: corsHeaders, status });
}

async function getAllKeys(apiKeys) {
  // Cloudflare KV: list keys matching prefix and return JSON records.
  // Pairs with auth.js store: email::<email>, key::<key>
  const out = [];
  let cursor;
  while (true) {
    const result = await apiKeys.list({ prefix: 'key::', cursor });
    for (const item of result.keys ?? []) {
      try {
        const rec = JSON.parse(item.value || '{}');
        out.push({ keyName: item.name.slice(5), value: rec });
      } catch {
        // skip malformed
      }
    }
    if (!result.cursor) break;
    cursor = result.cursor;
  }
  return out;
}

async function requireAdmin(request, env) {
  const auth = String(request.headers.get('x-admin-key') || '').trim();
  const expected = String(getAdminKey(env) || '').trim();
  if (!expected || auth !== expected) {
    throw json({ ok: false, error: 'Forbidden' }, 403);
  }
  return true;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    await requireAdmin(request, env);
  } catch (res) {
    return res;
  }

  const url = new URL(request.url);
  const emailPrefix = String(url.searchParams.get('email') || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page_size') || '20', 10) || 20));
  const offset = (page - 1) * pageSize;

  if (!env || !env.API_KEYS) {
    return json({ ok: false, error: 'API_KEYS store not configured' }, 500);
  }

  let keys = [];
  try {
    keys = await getAllKeys(env.API_KEYS);
  } catch (e) {
    return json({ ok: false, error: 'Failed to list keys' }, 500 });
  }

  if (emailPrefix) {
    keys = keys.filter(({ value }) => String(value?.email || '').startsWith(emailPrefix));
  }

  const total = keys.length;
  const pageItems = keys.slice(offset, offset + pageSize).map(({ keyName, value }) => ({
    key: keyName,
    email: value?.email || null,
    tier: value?.tier || null,
    dailyLimit: value?.tier === 'pro' ? undefined : 100,
    dailyUsed: typeof value?.dailyUsed === 'number' ? value.dailyUsed : (typeof value?.usage === 'number' ? value.usage : undefined),
    createdAt: value?.createdAt || null,
  }));

  return json({
    ok: true,
    page,
    pageSize,
    total,
    items: pageItems,
  });
}

export async function onRequestPost(context) {
  // Reset daily usage for a key
  const { request, env } = context;
  try {
    await requireAdmin(request, env);
  } catch (res) {
    return res;
  }

  const body = await parseBody(request);
  const key = String(body?.key || '').trim();
  if (!key) return json({ ok: false, error: 'key is required' }, 400);
  if (!env || !env.API_KEYS) return json({ ok: false, error: 'API_KEYS store not configured' }, 500);

  const storeKey = 'key::' + key;
  let record = {};
  try {
    const raw = await env.API_KEYS.get(storeKey);
    if (!raw) return json({ ok: false, error: 'Key not found' }, 404);
    record = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Invalid key record' }, 500);
  }

  record.dailyUsed = 0;
  delete record.usage;

  try {
    await env.API_KEYS.put(storeKey, JSON.stringify(record));
  } catch (e) {
    return json({ ok: false, error: 'Failed to update key' }, 500);
  }

  return json({ ok: true, message: 'Daily usage reset', key, tier: record.tier });
}

export async function onRequestPatch(context) {
  // Update tier: free <-> pro
  const { request, env } = context;
  try {
    await requireAdmin(request, env);
  } catch (res) {
    return res;
  }

  const body = await parseBody(request);
  const key = String(body?.key || '').trim();
  const tier = String(body?.tier || '').trim().toLowerCase();
  if (!key) return json({ ok: false, error: 'key is required' }, 400);
  if (!['free', 'pro'].includes(tier)) return json({ ok: false, error: "tier must be 'free' or 'pro'" }, 400);
  if (!env || !env.API_KEYS) return json({ ok: false, error: 'API_KEYS store not configured' }, 500);

  const storeKey = 'key::' + key;
  let record = {};
  try {
    const raw = await env.API_KEYS.get(storeKey);
    if (!raw) return json({ ok: false, error: 'Key not found' }, 404);
    record = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Invalid key record' }, 500);
  }

  record.tier = tier;

  try {
    await env.API_KEYS.put(storeKey, JSON.stringify(record));
  } catch (e) {
    return json({ ok: false, error: 'Failed to update key' }, 500);
  }

  return json({ ok: true, message: 'Tier updated', key, tier });
}

export async function onRequestDelete(context) {
  // Revoke by key id
  const { request, env } = context;
  try {
    await requireAdmin(request, env);
  } catch (res) {
    return res;
  }

  const url = new URL(request.url);
  const key = String(url.searchParams.get('key') || '').trim();
  if (!key) return json({ ok: false, error: 'key query parameter is required' }, 400);
  if (!env || !env.API_KEYS) return json({ ok: false, error: 'API_KEYS store not configured' }, 500);

  const storeKey = 'key::' + key;
  try {
    const existing = await env.API_KEYS.get(storeKey);
    if (!existing) return json({ ok: false, error: 'Key not found' }, 404);
    await env.API_KEYS.delete(storeKey);
  } catch (e) {
    return json({ ok: false, error: 'Failed to revoke key' }, 500);
  }

  return json({ ok: true, message: 'Key revoked', key });
}

export const OPTIONS = async () => new Response(null, { headers: corsHeaders, status: 204 });
