const inMemoryLimits = new Map();

export async function consumeLimit(key, dailyCap, env) {
  let entry;
  const hasKV = env && (env.TELEMETRY || env.telemetry);
  const kvKey = `rate::${key}`;

  if (hasKV) {
    const raw = await (env.TELEMETRY || env.telemetry).get(kvKey);
    const count = raw ? parseInt(raw, 10) : 0;
    const newCount = count + 1;
    try {
      await (env.TELEMETRY || env.telemetry).put(kvKey, String(newCount), {
        expirationTtl: 48 * 60 * 60, // Auto-cleanup after 2 days to prevent KV bloat
      });
      entry = { count: newCount };
    } catch (err) {
      // KV failed, fall back to in-memory counter
      if (!inMemoryLimits.has(key)) {
        inMemoryLimits.set(key, { count: 0, ts: Date.now() });
      }
      entry = inMemoryLimits.get(key);
      entry.count += 1;
      entry.ts = Date.now();
    }
  } else {
    // No KV binding available, use in-memory fallback
    if (!inMemoryLimits.has(key)) {
      inMemoryLimits.set(key, { count: 0, ts: Date.now() });
    }
    entry = inMemoryLimits.get(key);
    entry.count += 1;
    entry.ts = Date.now();
  }

  const remaining = Math.max(0, dailyCap - entry.count);
  const limited = entry.count > dailyCap;

  // Calculate reset time: next midnight UTC (daily limit window)
  const now = new Date();
  const nextMidnightUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  const resetUnix = Math.floor(nextMidnightUTC.getTime() / 1000);
  const resetISO = nextMidnightUTC.toISOString();

  return {
    remaining,
    limited,
    limit: dailyCap,
    used: entry.count,
    resetAt: resetISO,
    resetUnix,
  };
}

export function getResetTimestamp() {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  return Math.floor(nextMidnight.getTime() / 1000);
}

export async function resolveRateLimitContext(context, { anonymousCap = 5, signedCap = 100 } = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const ip =
    (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_') + '::' + date;
  const apiKey = (context.request.headers.get('X-API-Key') || '').trim();
  if (apiKey) {
    return {
      key: 'key::' + apiKey + '::' + date, // Add date for daily signed limits
      cap: signedCap,
      tier: 'signed',
      apiKey,
    };
  }
  return {
    key: ip,
    cap: anonymousCap,
    tier: 'anonymous',
    apiKey: null,
  };
}
