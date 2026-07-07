function normaliseCode(code) {
  const s = String(code || '').trim();
  if (!s) return '';
  return s.toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 32);
}

function json(data, status = 200) {
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

async function parseBody(request) {
  const type = String(request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireAuth(context) {
  const apiKey = String(context.request.headers.get('X-API-Key') || '').trim();
  if (!apiKey || !(context.env.LEADS || context.env.Leads)) throw json({ ok: false, error: 'unauthorized' }, 401);

  const raw = await (context.env.LEADS || context.env.Leads).get('key::' + apiKey);
  if (!raw) throw json({ ok: false, error: 'unauthorized' }, 401);

  const record = JSON.parse(raw);
  return { apiKey, record, userKey: apiKey, email: record.email, tier: record.tier || 'free' };
}

async function getProExpiry(env, userKey) {
  try {
    const raw = await (env.LEADS || env.Leads).get('key::' + userKey);
    if (!raw) return null;
    return JSON.parse(raw).proExpiresAt || null;
  } catch {
    return null;
  }
}

async function applyProExtension(env, userKey, months = 1) {
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

async function loadCode(env, code) {
  if (!(env.TELEMETRY || env.telemetry)) return null;
  const key = `referral::code::${normaliseCode(code)}`;
  return (env.TELEMETRY || env.telemetry).get(key);
}

async function saveCode(env, code, record) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  const key = `referral::code::${normaliseCode(code)}`;
  await (env.TELEMETRY || env.telemetry).put(key, JSON.stringify(record));
}

async function markRedemption(env, code, newUserKey, redemption) {
  await kvPut(env, `referral::redemption::${normaliseCode(code)}::${String(newUserKey).trim()}`, JSON.stringify({ code: normaliseCode(code), redeemedAt: redemption.redeemedAt, reward: redemption.rewardApplied }));
}

async function isAlreadyRedeemed(env, code, newUserKey) {
  return await kvGet(env, `referral::redemption::${normaliseCode(code)}::${String(newUserKey).trim()}`);
}

async function listCodesForReferrer(env, referrerKey) {
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

async function loadRedemptionsForReferrer(env, referrerKey) {
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

async function updateRedemptionsIndex(env, referrerKey, redemption) {
  await kvPut(env, `referral::redemptions::${String(referrerKey).trim()}::${redemption.redeemedAt || new Date().toISOString()}::${redemption.newUserKey || 'unknown'}`, JSON.stringify(redemption));
}

async function kvGet(env, key) {
  if (!(env.TELEMETRY || env.telemetry)) return null;
  return (env.TELEMETRY || env.telemetry).get(key);
}

async function kvPut(env, key, value) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  await (env.TELEMETRY || env.telemetry).put(key, value);
}

async function kvDelete(env, key) {
  if (!(env.TELEMETRY || env.telemetry)) return;
  await (env.TELEMETRY || env.telemetry).delete(key);
}

const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearance-iq.com',
  'access-control-allow-headers': 'content-type, x-api-key',
};

export async function onRequestGet(context) {
  return json({ ok: true, service: 'referral', methods: ['POST /api/referrals/generate', 'POST /api/referrals/redeem'] });
}

export async function onRequestPost(context) {
  try {
    const url = new URL(context.request.url);
    const path = url.pathname.replace(/\/$/, '');

    if (!(context.env.LEADS || context.env.Leads)) {
      return json({ ok: false, error: 'store_not_configured' }, 500);
    }

    const auth = await requireAuth(context);

    if (path === '/api/referrals/generate') {
      const now = new Date();
      const expires = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
      const maxUses = 10;
      const rewardMonths = 1;

      let code;
      const masterKey = String(context.env.REFERRAL_MASTER_KEY || '').trim() || 'default_master';
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        code = 'TYCOON-' + suffix;
      } else {
        const time = now.toISOString().replace(/[^0-9T]/g, '').slice(0, 14).replace('T', '');
        const hash = String(masterKey + time).slice(0, 16);
        code = 'TYCOON-' + hash.toUpperCase();
      }

      const referrerKey = auth.userKey;
      const referrerEmail = String(auth.email || '').toLowerCase();

      const record = {
        code,
        referrerKey,
        referrerEmail,
        uses: 0,
        maxUses,
        rewardMonths,
        expiresAt: expires.toISOString(),
        createdAt: now.toISOString(),
        status: 'active',
      };

      let tries = 0;
      while (tries < 5) {
        const existing = await loadCode(context.env, code);
        if (!existing) break;
        const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        code = code.slice(0, 10) + '-' + suffix;
        tries += 1;
      }

      await saveCode(context.env, code, record);
      await kvPut(
        context.env,
        `referral::by_referrer::${String(referrerKey).trim()}::${code}::${now.toISOString()}`,
        JSON.stringify(record),
      );

      const referralUrl = new URL('/api/referrals/redeem', context.request.url);
      referralUrl.searchParams.set('code', code);

      const stats = {
        totalGenerated: (await listCodesForReferrer(context.env, referrerKey)).length,
        activeCodes: (await listCodesForReferrer(context.env, referrerKey)).filter((c) => {
          const active = c.uses < c.maxUses && new Date(c.expiresAt).getTime() > Date.now();
          return active;
        }).length,
        totalRedemptions: (await loadRedemptionsForReferrer(context.env, referrerKey)).length,
      };

      return json({
        ok: true,
        code,
        referralUrl: referralUrl.toString(),
        stats,
        record,
      });
    }

    if (path === '/api/referrals/redeem') {
      const body = await parseBody(context.request);
      const code = normaliseCode(body.code);
      const newUserKey = String(body.newUserKey || '').trim();

      if (!code || !newUserKey) {
        return json({ ok: false, error: 'code and newUserKey are required', applied: false }, 400);
      }

      const raw = await loadCode(context.env, code);
      if (!raw) return json({ ok: false, error: 'code not found', applied: false }, 404);

      let record;
      try {
        record = JSON.parse(raw);
      } catch {
        return json({ ok: false, error: 'invalid code record', applied: false }, 500);
      }

      if (record.uses >= record.maxUses) {
        return json({ ok: false, error: 'code fully used', applied: false, remainingUses: 0 }, 410);
      }
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        return json({ ok: false, error: 'code expired', applied: false }, 410);
      }

      if (await isAlreadyRedeemed(context.env, code, newUserKey)) {
        const expiry = await getProExpiry(context.env, record.referrerKey);
        return json({
          ok: true,
          applied: true,
          alreadyApplied: true,
          reward: { type: 'months', amount: record.rewardMonths || 1 },
          referrer: { key: record.referrerKey, email: record.referrerEmail ? record.referrerEmail.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '' },
          remainingUses: record.maxUses - record.uses,
          proExpiresAt: expiry,
          message: 'Referral already applied.',
        });
      }

      record.uses = (record.uses || 0) + 1;
      if (record.uses >= record.maxUses) record.status = 'exhausted';
      await saveCode(context.env, code, record);

      const rewardMonths = Number(record.rewardMonths || 1);
      const extended = await applyProExtension(context.env, record.referrerKey, rewardMonths);

      const redemption = {
        code: record.code,
        newUserKey,
        referrerKey: record.referrerKey,
        referrerEmail: record.referrerEmail,
        redeemedAt: new Date().toISOString(),
        rewardApplied: { type: 'months', amount: rewardMonths },
        proExpiresAt: extended?.proExpiresAt || null,
      };

      await markRedemption(context.env, record.code, newUserKey, redemption);
      await updateRedemptionsIndex(context.env, record.referrerKey, redemption);

      const remainingUses = record.maxUses - record.uses;

      return json({
        ok: true,
        applied: true,
        alreadyApplied: false,
        reward: { type: 'months', amount: rewardMonths },
        referrer: { key: record.referrerKey, email: record.referrerEmail ? record.referrerEmail.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '' },
        remainingUses,
        proExpiresAt: extended?.proExpiresAt || null,
        message: `Referral applied and Pro extended by ${rewardMonths} month(s).`,
      });
    }

    return json({ ok: false, error: 'not_found' }, 404);
  } catch (err) {
    console.error('[referral]', err);
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
}

export const OPTIONS = async () => new Response(null, { headers: corsHeaders, status: 204 });
