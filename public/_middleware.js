export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.toLowerCase();

  const clientIp =
    context.request.headers.get("CF-Connecting-IP") ||
    context.request.headers.get("X-Forwarded-For") ||
    "unknown";

  // --- Rate limiter ---
  const ip = (globalThis as any);
  if (!ip.__clearanceiq_limits) ip.__clearanceiq_limits = new Map();

  const limits: [number, number][] = [
    ["/api/chat", 10, 60],
    ["/api/v1/hts", 30, 60],
  ];

  for (const [prefix, max, windowSec] of limits) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      const now = Date.now();
      const bucketKey = `${prefix}:${clientIp}`;
      const hit = ip.__clearanceiq_limits.get(bucketKey) || {
        count: 0,
        resetAt: now + windowSec * 1000,
      };

      if (now > hit.resetAt) {
        ip.__clearanceiq_limits.set(bucketKey, {
          count: 1,
          resetAt: now + windowSec * 1000,
        });
      } else {
        hit.count += 1;
        ip.__clearanceiq_limits.set(bucketKey, hit);
      }

      if (hit.count > max) {
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            retry_after_seconds: Math.ceil(
              (hit.resetAt - now) / 1000
            ),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "Retry-After": String(
                Math.ceil((hit.resetAt - now) / 1000)
              ),
            },
          }
        );
      }
    }
  }

  // --- Bot blocker ---
  const ua =
    (context.request.headers.get("User-Agent") || "").toLowerCase();
  const botPaths = [
    "/wp-admin/",
    "/wp-login.php",
    "/site-inject.js",
    "/.env",
    "/.git/",
    "/.htaccess",
    "/.htpasswd",
    "/xmlrpc.php",
    "/admin/",
    "/login.php",
    "/shell",
    "/env",
    "/config",
    "/backup",
    "/wp-includes/",
  ];

  const botUAs = [
    "curl/",
    "python-requests/",
    "wget/",
    "go-http-client/",
    "l9scan",
    "http-client",
    "scanner",
    "scan",
    "nikto",
    "masscan",
    "nmap",
    "dirbuster",
    "gobuster",
    "sqlmap",
  ];

  const isBotPath = botPaths.some((b) => path.includes(b));
  const isBotUA = botUAs.some((b) => ua.includes(b));

  if (isBotPath || isBotUA) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return context.next();
}
