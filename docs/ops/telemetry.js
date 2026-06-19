export default {
  async fetch(request, env) {
    const cors = { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } };
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok", { status: 200, headers: cors });
    if (url.pathname !== "/api/telemetry") return new Response("not found", { status: 404 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET") return Response.json({ ok: true, hint: "POST JSON" }, cors);
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const ip = (request.headers.get("cf-connecting-ip") || "").slice(0, 6) + "***";
        const event = { ts: body.ts || Date.now(), path: body.path || "", type: body.type || "", ip, payload: body };
        await env.DB.prepare("INSERT INTO events (ts, path, type, ip, payload) VALUES (?, ?, ?, ?, ?)").bind(
          event.ts, event.path, event.type, event.ip, JSON.stringify(event.payload)
        ).run();
      } catch (err) {
        console.error("[telemetry-db-error]", err);
      }
      return new Response(null, { status: 204 });
    }
    return new Response("method not allowed", { status: 405 });
  },
};
