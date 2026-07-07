export function normaliseCode(code) {
  const s = String(code || '').trim();
  if (!s) return '';
  return s.toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 32);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': 'https://clearance-iq.com',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-api-key',
    },
    status,
  });
}

export async function parseBody(request) {
  const type = String(request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function requireAuth(context) {
  const apiKey = String(context.request.headers.get('X-API-Key') || '').trim();
  if (!apiKey || !(context.env.LEADS || context.env.Leads)) throw json({ ok: false, error: 'unauthorized' }, 401);

  const raw = await (context.env.LEADS || context.env.Leads).get('key::' + apiKey);
  if (!raw) throw json({ ok: false, error: 'unauthorized' }, 401);

  const record = JSON.parse(raw);
  return { apiKey, record, userKey: apiKey, email: record.email, tier: record.tier || 'free' };
}

export async function getProExpiry(env, userKey) {
  try {
    const raw = await (env.LEADS || env.Leads).get('key::' + userKey);
    if (!raw) return null;
    return JSON.parse(raw).proExpiresAt || null;
  } catch {
    return null;
  }
}

export async function applyProExtension(env, userKey, months = 1) {
  const raw = await (env.LEADS || env.Leads).get('key::' + userKey);
  if (!raw) return false;

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return false;
  }

  const now = new Date();
  const currentExpiry = record.proExpiresAt ? new Date(record.proExpiresAt) : null;
  const base = (!currentExpiry || currentExpiry.getTime() <= now.getTime()) ? now : currentExpiry;
  const extended = new Date(base.getTime());
  extended.setUTCMonth(extended.getUTCMonth() + Math.max(1, Number(months || 1)));
  record.proExpiresAt = extended.toISOString();
  record.tier = 'pro';
  record.proExtendedAt = now.toISOString();

  await (env.LEADS || env.Leads).put('key::' + userKey, JSON.stringify(record));
  return record;
}

export async function loadCode(env, code) {
  if (!(env.TELEMETRY || env.telemetry)) return null;
  const key = `referral::code::${normaliseCode(code)}`;
  return (env.TELEMETRY || env.telemetry).get(key);
}

export async function saveCode(env, code, record) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  const key = `referral::code::${normaliseCode(code)}`;
  await (env.TELEMETRY || env.telemetry).put(key, JSON.stringify(record));
}

export async function markRedemption(env, code, newUserKey, redemption) {
  await kvPut(env, `referral::redemption::${normaliseCode(code)}::${String(newUserKey).trim()}`, JSON.stringify({ code: normaliseCode(code), redeemedAt: redemption.redeemedAt, reward: redemption.rewardApplied }));
}

export async function isAlreadyRedeemed(env, code, newUserKey) {
  return await kvGet(env, `referral::redemption::${normaliseCode(code)}::${String(newUserKey).trim()}`);
}

export async function listCodesForReferrer(env, referrerKey) {
  if (!(env.TELEMETRY || env.telemetry)) return [];
  const prefix = `referral::referrer::${String(referrerKey).trim()}::`;
  const out = [];
  let cursor;
  while (true) {
    const result = await (env.TELEMETRY || env.telemetry).list({ prefix, cursor, limit: 500 });
    for (const item of result.keys ?? []) {
      try { out.push(JSON.parse(item.value || '{}')); } catch { /* skip */ }
    }
    if (!result.cursor) break;
    cursor = result.cursor;
  }
  out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return out;
}

export async function loadRedemptionsForReferrer(env, referrerKey) {
  if (!(env.TELEMETRY || env.telemetry)) return [];
  const prefix = `referral::redemptions::${String(referrerKey).trim()}::`;
  const out = [];
  let cursor;
  while (true) {
    const result = await (env.TELEMETRY || env.telemetry).list({ prefix, cursor, limit: 500 });
    for (const item of result.keys ?? []) {
      try { out.push(JSON.parse(item.value || '{}')); } catch { /* skip */ }
    }
    if (!result.cursor) break;
    cursor = result.cursor;
  }
  out.sort((a, b) => String(b.redeemedAt || '').localeCompare(String(a.redeemedAt || '')));
  return out;
}

export async function updateRedemptionsIndex(env, referrerKey, redemption) {
  await kvPut(env, `referral::redemptions::${String(referrerKey).trim()}::${redemption.redeemedAt || new Date().toISOString()}::${redemption.newUserKey || 'unknown'}`, JSON.stringify(redemption));
}

export async function kvGet(env, key) {
  if (!(env.TELEMETRY || env.telemetry)) return null;
  return (env.TELEMETRY || env.telemetry).get(key);
}

export async function kvPut(env, key, value) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  await (env.TELEMETRY || env.telemetry).put(key, value);
}

export async function kvDelete(env, key) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  await (env.TELEMETRY || env.telemetry).delete(key);
}
