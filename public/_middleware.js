export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.toLowerCase();
  const ua = (context.request.headers.get("User-Agent") || "").toLowerCase();

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
