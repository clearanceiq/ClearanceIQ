import {
  normaliseCode,
  json,
  parseBody,
  requireAuth,
  getProExpiry,
  applyProExtension,
  loadCode,
  saveCode,
  isAlreadyRedeemed,
  markRedemption as libMarkRedemption,
  listCodesForReferrer,
  loadRedemptionsForReferrer,
  updateRedemptionsIndex,
  kvPut,
} from './_referral-lib/index.js';

const corsHeaders = {
  'content-type': 'application/json',
  'access-control-allow-origin': 'https://clearanceiq.pages.dev',
  'access-control-allow-headers': 'content-type, x-api-key',
};

export async function onRequestGet(context) {
  return json({ ok: true, service: 'referral', methods: ['POST /api/referrals/generate', 'POST /api/referrals/redeem'] });
}

export async function onRequestPost(context) {
  try {
    const url = new URL(context.request.url);
    const path = url.pathname.replace(/\/$/, '');

    if (!context.env?.API_KEYS) {
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

      await libMarkRedemption(context.env, record.code, newUserKey, redemption);
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
