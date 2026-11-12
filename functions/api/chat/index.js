import { SYSTEM_PROMPT } from './prompt.js';

// --- guardrail configuration -------------------------------------------------
const MODEL = 'anthropic/claude-haiku-5.5';
const MAX_LEN = 600;          // max characters per question
const MAX_TOKENS = 2048;      // haiku-5.5 spends part of this on reasoning
const ALLOWED_ORIGINS = ['https://clearance-iq.com', 'https://clearanceiqa.pages.dev'];
const ALLOWED_HOSTNAMES = ['clearance-iq.com', 'clearanceiqa.pages.dev'];
const RL_IP_LIMIT = 30, RL_IP_WINDOW = 60;   // per-IP
const RL_SID_LIMIT = 15, RL_SID_WINDOW = 60; // per-session

function reply(obj, status, origin) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (origin) headers['access-control-allow-origin'] = origin;
  return new Response(JSON.stringify(obj), { status, headers });
}

function originAllowed(origin) {
  return !!origin && ALLOWED_ORIGINS.indexOf(origin) !== -1;
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
}

// Fixed-window counter in KV. Best-effort: KV is eventually consistent, so this
// raises the cost of abuse rather than guaranteeing a hard ceiling.
async function rateLimited(KV, key, limit, window) {
  if (!KV || !key) return false;
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / window);
  const kvKey = `rl:${key}:${bucket}`;
  const raw = await KV.get(kvKey);
  const n = raw ? parseInt(raw, 10) || 0 : 0;
  if (n >= limit) return true;
  await KV.put(kvKey, String(n + 1), { expirationTtl: window * 2 });
  return false;
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('origin');
  if (!originAllowed(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-ciq-sid',
      'access-control-max-age': '86400',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestPost(context) {
  const request = context.request;
  const origin = request.headers.get('origin');

  // CORS: only our own domains may call this endpoint.
  if (!originAllowed(origin)) return reply({ error: 'forbidden' }, 403, null);

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const message = (body && typeof body.message === 'string' ? body.message : '').trim();
  if (!message) return reply({ error: 'Missing message' }, 400, origin);
  if (message.length > MAX_LEN) {
    return reply({ error: 'Message too long', max: MAX_LEN }, 413, origin);
  }

  // --- rate limits (per-IP, then per-session) ---
  const KV = context.env.CHAT_RL;
  const ip = clientIp(request);
  const sid = (request.headers.get('x-ciq-sid') || '').slice(0, 64);

  if (await rateLimited(KV, `ip:${ip}`, RL_IP_LIMIT, RL_IP_WINDOW)) {
    return reply({ error: 'rate_limited' }, 429, origin);
  }
  if (sid && await rateLimited(KV, `sid:${sid}`, RL_SID_LIMIT, RL_SID_WINDOW)) {
    return reply({ error: 'rate_limited' }, 429, origin);
  }

  // --- Turnstile ---
  const turnstileSecret = context.env.TURNSTILE_SECRET;
  const turnstileToken = (body && typeof body.turnstile === 'string') ? body.turnstile : '';
  if (!turnstileSecret) {
    // Fail closed: without the secret we cannot verify the caller is human.
    return reply({ error: 'captcha_unavailable' }, 503, origin);
  }
  if (!turnstileToken) return reply({ error: 'captcha_failed' }, 400, origin);

  let verified = false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken, remoteip: ip }),
    });
    const data = await res.json().catch(() => ({}));
    const host = data && data.hostname ? String(data.hostname) : '';
    const hostOk = ALLOWED_HOSTNAMES.indexOf(host) !== -1 || /^[a-z0-9-]+\.clearanceiqa\.pages\.dev$/.test(host);
    verified = !!(data && data.success === true && hostOk);
  } catch { verified = false; }
  if (!verified) return reply({ error: 'captcha_failed' }, 400, origin);

  // --- provider ---
  const apiKey = context.env.OPENROUTER_API_KEY;
  if (!apiKey) return reply({ error: 'service_unavailable' }, 503, origin);

  let replyText = null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://clearance-iq.com',
        'X-Title': 'ClearanceIQ Expert Chat',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: MAX_TOKENS,
      }),
    });
    const data = await res.json().catch(() => null);
    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    if (content) replyText = String(content).trim();
  } catch { replyText = null; }

  if (!replyText) return reply({ error: 'unavailable' }, 502, origin);
  return reply({ reply: replyText }, 200, origin);
}

export default { onRequestPost, onRequestOptions };
