const limits = new Map();

export function consumeLimit(key, dailyCap) {
  if (!limits.has(key)) limits.set(key, { count: 0, ts: Date.now() });
  const entry = limits.get(key);
  entry.count += 1;
  entry.ts = Date.now();
  const remaining = Math.max(0, dailyCap - entry.count);
  const limited = entry.count > dailyCap;
  return {
    remaining,
    limited,
    limit: dailyCap,
    used: entry.count,
    resetAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export function resolveRateLimitContext(context, { anonymousCap = 5, signedCap = 100 } = {}) {
  const ip =
    (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_') + '::' +
    new Date().toISOString().slice(0, 10);
  const apiKey = (context.request.headers.get('X-API-Key') || '').trim();
  if (apiKey) {
    return {
      key: 'key::' + apiKey,
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
}
